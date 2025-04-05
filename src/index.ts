import { Elysia } from 'elysia';
import { setupMiddleware } from './middleware';

// Initialize HTTP server for webhook processing
const app = new Elysia();
setupMiddleware(app);

// Start the HTTP server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});

export const logger: Console = console;
