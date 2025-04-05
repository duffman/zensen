import { Elysia } from 'elysia';

const rateLimitStore = new Map<string, number>();
const RATE_LIMIT = 10; // Emails per minute per sender

export function setupMiddleware(app: Elysia) {
	app
		.derive(({ request }) => {
			const sender = (request.headers.get('x-mailgun-sender') || '').split('<')[1]?.split('>')[0] || 'unknown';
			const now = Date.now();
			const count = rateLimitStore.get(sender) || 0;

			if (count >= RATE_LIMIT) {
				throw new Error('Rate limit exceeded');
			}

			rateLimitStore.set(sender, count + 1);
			setTimeout(() => rateLimitStore.set(sender, Math.max(0, (rateLimitStore.get(sender) || 0) - 1)), 60_000);

			return { sender };
		})
		.onError(({ error }) => {
			console.error('Error:', (error as any).message);
			return { status: 429, body: 'Too Many Requests' };
		})
		.onRequest(({ request }) => {
			console.log(`[${new Date().toISOString()}] ${request.method} ${request.url}`);
		});
}
