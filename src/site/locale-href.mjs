export function localeHref(site, path) {
  return `${site.urlPrefix ?? ''}${path}`;
}
