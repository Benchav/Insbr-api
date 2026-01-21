import 'dotenv/config';
import { createApp } from '../src/app.js';

// Create and export the Express app as a serverless function for Vercel
const app = createApp();

export default app;
