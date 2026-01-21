import 'dotenv/config';
import { createApp } from '../src/app.js';

// Create the Express app
const app = createApp();

// Export as default for Vercel serverless
export default app;

// Also export as a named export for compatibility
export { app };
