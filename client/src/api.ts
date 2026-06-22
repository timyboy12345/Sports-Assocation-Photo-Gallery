import axios from 'axios';

const API_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
});

export const getUploadsUrl = (path: string, type: 'thumb' | 'original' | 'webp' = 'thumb') => {
  if (!path) return '';
  if (type === 'webp') path = path.toLowerCase().replace(/\.(jpg|jpeg|png)$/, '.compressed.webp');
  if (type === 'thumb') path = path.toLowerCase().replace(/\.(jpg|jpeg|png)$/, '.thumb.webp');

  return `${API_URL}/api/uploads/${path}`;
};

export default api;
