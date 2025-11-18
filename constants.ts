
import type { Product } from './types';

export const PRODUCTS: Product[] = [
  { id: 1, name: 'Espresso', price: 250, imageUrl: 'https://picsum.photos/id/225/400/300' },
  { id: 2, name: 'Cafe Latte', price: 300, imageUrl: 'https://picsum.photos/id/431/400/300' },
  { id: 3, name: 'Cappuccino', price: 300, imageUrl: 'https://picsum.photos/id/365/400/300' },
  { id: 4, name: 'Mocha', price: 350, imageUrl: 'https://picsum.photos/id/326/400/300' },
  { id: 5, name: 'Samosa (Beef)', price: 100, imageUrl: 'https://picsum.photos/id/1080/400/300' },
  { id: 6, name: 'Mandazi', price: 50, imageUrl: 'https://picsum.photos/id/292/400/300' },
  { id: 7, name: 'Croissant', price: 200, imageUrl: 'https://picsum.photos/id/378/400/300' },
  { id: 8, name: 'African Tea', price: 150, imageUrl: 'https://picsum.photos/id/30/400/300' },
  { id: 9, name: 'Mineral Water', price: 100, imageUrl: 'https://picsum.photos/id/1059/400/300' },
  { id: 10, name: 'Fresh Juice', price: 300, imageUrl: 'https://picsum.photos/id/102/400/300' },
];

// NOTE: In a real app, these would come from your backend config
// Default websocket/payment API URLs. In dev we prefer a dynamic host so devices
// on the same LAN (different hostname/IP) can connect to the dev server.
const __env_any = (import.meta as any);
const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
export const WEBSOCKET_URL = __env_any.VITE_WEBSOCKET_URL || `ws://${host}:8082`;
// Use Vite env var `VITE_PAYMENT_API_URL` for the backend URL (set at build time on Netlify),
// otherwise fall back to the current dev host so the browser's origin can reach the PHP server.
export const PAYMENT_API_URL = __env_any.VITE_PAYMENT_API_URL || `http://${host}:8000/api/payment_process.php`;