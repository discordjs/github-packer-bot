import { pino } from 'pino';

export interface Env {
	TODO: string;
}

export const logger = pino({ level: 'debug' });
