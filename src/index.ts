import { App } from 'octokit';
import { logger, type Env } from './util.js';
import { verifyWebhookSignature } from './verify.js';

const server = {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		logger.debug({ method: request.method, url: request.url }, 'incoming request');

		if (request.method !== 'POST' || !request.url.endsWith('/api/github/webhooks')) {
			return new Response('not found', {
				status: 404,
				headers: { 'content-type': 'application/json' },
			});
		}

		const app = new App({
			appId: env.APP_ID,
			privateKey: env.PRIVATE_KEY.replaceAll('\\n', '\n'),
			webhooks: {
				secret: env.WEBHOOK_SECRET,
			},
		});

		const id = request.headers.get('x-github-delivery')!;
		const name = request.headers.get('x-github-event')!;
		const signature = request.headers.get('x-hub-signature-256') ?? '';
		const payloadString = await request.text();
		const payload = JSON.parse(payloadString);

		try {
			await verifyWebhookSignature(payloadString, signature, env.WEBHOOK_SECRET);
		} catch (error) {
			logger.warn({ error }, 'Invalid webhook signature');
			return new Response('webhook verification failed', {
				status: 400,
				headers: { 'content-type': 'application/json' },
			});
		}

		try {
			await app.webhooks.receive({
				id,
				// @ts-expect-error - We don't have an exact type for name and a cast is tricky
				name,
				payload,
			});

			return new Response(`{}`, {
				headers: { 'content-type': 'application/json' },
			});
		} catch (error) {
			logger.error({ error }, 'Error processing webhook');
			return new Response('internal server error', {
				status: 500,
				headers: { 'content-type': 'application/json' },
			});
		}
	},
};

export default server;
