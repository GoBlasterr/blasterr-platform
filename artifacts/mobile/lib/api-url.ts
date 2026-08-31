export function apiUrl(path: string): string {
  if (!path || /^https?:\/\//i.test(path)) return path;
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}${path.startsWith('/') ? path : `/${path}`}` : path;
}