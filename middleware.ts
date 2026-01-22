export { middleware, config } from './middleware/proxy';

// Explicitly declare runtime to match Edge execution on Vercel.
export const runtime = 'edge';
