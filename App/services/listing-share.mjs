const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

function socialInstructions(state) {
  const app = state.destination === 'instagram' ? 'Instagram' : 'TikTok';
  const lead = state.imageStatus === 'preparing'
    ? 'Le visuel est en préparation. Patientez avant de le partager.'
    : state.imageStatus !== 'ready'
      ? 'Le visuel est indisponible pour le moment. Vous pouvez copier la légende et le lien.'
      : state.canShareImage
        ? `Partagez l’image et choisissez ${app} si le téléphone le propose. Sinon, enregistrez l’image puis importez-la dans ${app}.`
        : `Enregistrez l’image puis importez-la dans ${app}.`;
  return `${lead} Copiez la légende et ajoutez le lien là où l’application le permet.`;
}

// Share APIs report a handoff, never proof that a social post was published.
export function createListingShareController({
  baseUrl,
  navigatorObject = {},
  fetchFn = globalThis.fetch,
  openWindow = () => false,
  downloadFile = () => {},
  onChange = () => {},
} = {}) {
  let state = null;
  let preparedFile = null;
  let preparationAbort = null;
  const changed = () => onChange(state);

  function open(context = {}) {
    preparationAbort?.abort();
    preparedFile = null;
    const origin = new URL(baseUrl).origin;
    let url;
    try {
      const candidate = new URL(context.url || '', origin);
      if (candidate.origin === origin && /^\/annonce\/[^/]+\/?$/.test(candidate.pathname)) {
        url = new URL(candidate.pathname.replace(/\/?$/, '/'), origin).href;
      }
    } catch { /* Use the canonical slug instead of an unsafe input URL. */ }
    url ||= new URL(`/annonce/${encodeURIComponent(context.slug || '')}/`, origin).href;
    state = {
      slug: context.slug || '', title: context.title || 'Annonce Zwibba', url,
      storyImageUrl: context.storyImageUrl || '',
      shareImageUrl: context.shareImageUrl || '',
      imageUrl: (context.storyEnabled === true ? context.storyImageUrl : context.shareImageUrl) || '',
      destination: '',
      primaryImageUrl: context.primaryImageUrl || '',
      // Story mode is opt-in per caller (post-publication success screen only).
      storyEnabled: context.storyEnabled === true,
      mode: 'post', busy: false, message: '', manualText: '',
      imageStatus: (context.storyEnabled === true ? context.storyImageUrl : context.shareImageUrl) ? 'preparing' : 'unavailable',
      canShareLink: typeof navigatorObject.share === 'function', canShareImage: false,
    };
    changed();
    return prepareImage();
  }

  function start(context, { mode = 'post' } = {}) {
    void open(context);
    if (mode === 'story' && state.storyEnabled) {
      state.mode = 'story';
      changed();
      return Promise.resolve('menu');
    }
    return state.storyEnabled && state.canShareLink ? perform('native-link') : Promise.resolve('menu');
  }

  async function prepareImage() {
    const current = state;
    if (!current?.imageUrl) return;
    preparationAbort?.abort();
    const abort = new AbortController();
    preparationAbort = abort;
    const timeout = setTimeout(() => abort.abort(), 15000);
    current.imageStatus = 'preparing';
    if (current.destination) current.message = socialInstructions(current);
    changed();
    try {
      const imageUrl = new URL(current.imageUrl, baseUrl);
      const localHttp = imageUrl.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(imageUrl.hostname);
      if (imageUrl.protocol !== 'https:' && !localHttp) throw new Error('Invalid image URL');
      const response = await fetchFn(imageUrl.href, { signal: abort.signal, credentials: 'omit' });
      if (!response.ok || Number(response.headers?.get('content-length')) > MAX_IMAGE_BYTES) {
        throw new Error('Image unavailable');
      }
      const blob = await response.blob();
      if (!IMAGE_TYPES.has(blob.type) || !blob.size || blob.size > MAX_IMAGE_BYTES) throw new Error('Invalid image');
      if (state !== current || preparationAbort !== abort || abort.signal.aborted) return;
      const extension = blob.type === 'image/jpeg' ? 'jpg' : blob.type.split('/')[1];
      preparedFile = new File([blob], `zwibba-${current.storyEnabled ? 'story' : 'annonce'}.${extension}`, { type: blob.type });
      current.canShareImage = typeof navigatorObject.share === 'function' &&
        typeof navigatorObject.canShare === 'function' && navigatorObject.canShare({ files: [preparedFile] });
      current.imageStatus = 'ready';
    } catch {
      if (state !== current || preparationAbort !== abort) return;
      preparedFile = null;
      current.canShareImage = false;
      current.imageStatus = 'unavailable';
    } finally {
      clearTimeout(timeout);
      if (state === current && preparationAbort === abort) {
        if (current.destination) current.message = socialInstructions(current);
        changed();
      }
    }
  }

  async function perform(action) {
    const current = state;
    if (!current) return 'unavailable';
    if (current.busy) return 'busy';
    current.busy = true;
    current.message = '';
    current.manualText = '';
    const caption = `${current.title} — Zwibba\n${current.url}`;
    let result;
    try {
      // Invoke activation-gated APIs before the first await. File preparation
      // happens when opening the menu, never inside the share click.
      if (action === 'native-link' || action === 'native-image') {
        if (action === 'native-image' && (!preparedFile || !current.canShareImage)) {
          throw new Error('Enregistrez l’image ou partagez le lien.');
        }
        if (typeof navigatorObject.share !== 'function') throw new Error('Copiez le lien pour partager cette annonce.');
        const pending = navigatorObject.share(action === 'native-image'
          ? { files: [preparedFile] }
          : { title: current.title, text: `${current.title} — Zwibba`, url: current.url });
        changed();
        await pending;
        current.message = 'Demande transmise au menu de partage.';
        result = 'handed-off';
      } else if (action === 'copy-link' || action === 'copy-caption') {
        const text = action === 'copy-link' ? current.url : caption;
        try {
          if (!navigatorObject.clipboard?.writeText) throw new Error('Clipboard unavailable');
          const pending = navigatorObject.clipboard.writeText(text);
          changed();
          await pending;
          current.message = action === 'copy-link' ? 'Lien copié.' : 'Légende copiée.';
          result = 'copied';
        } catch {
          current.manualText = text;
          current.message = 'La copie automatique est indisponible. Sélectionnez et copiez le texte ci-dessous.';
          result = 'manual';
        }
      } else if (action === 'whatsapp' || action === 'facebook') {
        const target = action === 'whatsapp'
          ? `https://api.whatsapp.com/send?text=${encodeURIComponent(caption)}`
          : `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(current.url)}`;
        if (!openWindow(target)) throw new Error('La fenêtre a été bloquée. Autorisez son ouverture ou copiez le lien.');
        current.message = 'Terminez le partage dans la fenêtre ouverte.';
        result = 'opened';
      } else if (action === 'download-image') {
        if (!preparedFile) throw new Error('L’image est indisponible. Vous pouvez partager le lien.');
        downloadFile(preparedFile);
        current.message = 'Téléchargement demandé. Retrouvez l’image dans vos fichiers.';
        result = 'download-requested';
      } else if (action === 'instagram' || action === 'tiktok') {
        current.destination = action;
        if (current.storyEnabled) current.mode = 'story';
        current.message = socialInstructions(current);
        result = 'instructions';
      } else {
        throw new Error('Cette action est indisponible.');
      }
    } catch (error) {
      if (error?.name === 'AbortError') {
        current.message = '';
        result = 'cancelled';
      } else {
        current.message = ['native-link', 'native-image'].includes(action)
          ? 'Le partage n’a pas pu démarrer. Réessayez, copiez le lien ou enregistrez l’image.'
          : error.message || 'Action impossible. Réessayez ou copiez le lien.';
        result = 'error';
      }
    } finally {
      current.busy = false;
      if (state === current) changed();
    }
    return result;
  }

  return {
    get state() { return state; }, open, start, perform, prepareImage,
    setMode(mode) { if (state && !state.busy) { state.mode = mode === 'story' && state.storyEnabled ? 'story' : 'post'; changed(); } },
    close() { preparationAbort?.abort(); state = null; preparedFile = null; changed(); },
  };
}
