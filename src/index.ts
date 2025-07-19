import { Router, type IRequest } from 'itty-router';
import { logger, type Env } from './util.js';

const router = Router<IRequest, [Env, ExecutionContext]>();

const server = {
	async fetch(request: IRequest, env: Env, ctx: ExecutionContext) {
		logger.debug({ method: request.method, url: request.url }, 'incoming request');
		return router.fetch(request, env, ctx);
	},
};

router.get('/hello', () => {
	return new Response('Hello, world!', { status: 200 });
});

router.all('*', () => {
	return new Response('Not found', { status: 404 });
});

export default server;
