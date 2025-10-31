export const API_URL = 'http://localhost:3000';

export const toAbsoluteUrl = (url) => {
  if (!url) return '';
  return url.startsWith('http') ? url : `${API_URL}${url}`;
};
