import { pino } from 'pino';

export interface Env {
	APP_ID: string;
	PRIVATE_KEY: string;
	WEBHOOK_SECRET: string;
}

export const logger = pino({ level: 'debug' });
