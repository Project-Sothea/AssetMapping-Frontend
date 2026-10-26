export const QA_API_BASE_URL = 'http://10.0.2.2:3300';
export const QA_API_URL_ERROR =
  'This QA app can only connect to the local QA API at http://10.0.2.2:3300.';

const allowedQaHosts = new Set(['10.0.2.2', '127.0.0.1', 'localhost']);

export function isAllowedQaApiUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return (
      url.protocol === 'http:' &&
      allowedQaHosts.has(url.hostname) &&
      url.port === '3300' &&
      (url.pathname === '' || url.pathname === '/') &&
      !url.search &&
      !url.hash &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}
