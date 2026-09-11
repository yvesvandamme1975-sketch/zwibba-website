// Keep transient failures visible and prevent duplicate conversation requests.
export function createThreadStarter({ createThread, onChange = () => {} }) {
  const state = { busy: false, error: '', listingId: '' };
  return {
    state,
    async start(context) {
      if (state.busy) return { status: 'busy' };
      state.busy = true;
      state.error = '';
      state.listingId = context.listingId || '';
      onChange();
      try {
        const thread = await createThread(context);
        if (!thread || typeof thread.id !== 'string' || !thread.id.trim()) throw new Error('Invalid thread');
        return { status: 'ready', thread };
      } catch (error) {
        const status = error?.status === 401 ? 'auth-required' : error?.status === 428 ? 'terms-required' : 'error';
        state.error = status === 'auth-required' ? 'Votre session a expiré. Reconnectez-vous pour contacter le vendeur.'
          : status === 'terms-required' ? 'Consultez et acceptez les conditions dans Mes messages, puis revenez à cette annonce.'
          : 'Impossible d’ouvrir cette conversation. Vérifiez votre connexion et réessayez.';
        return { status };
      } finally {
        state.busy = false;
        onChange();
      }
    },
  };
}
