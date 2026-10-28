// Prefix a site path with the Pages base path (e.g. /IB-MSc-Corporate-Finance).
export function withBase(path = '') {
  return `${import.meta.env.BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}
