import type { Octokit } from 'octokit';
import { App } from 'octokit';
import { logger, type Env } from './util.js';

async function isPRGreen(octokit: Octokit, owner: string, repo: string, pullNumber: number): Promise<boolean> {
	// First, get the PR data to get the head SHA
	const { data: pullRequest } = await octokit.rest.pulls.get({
		owner,
		repo,
		pull_number: pullNumber,
	});

	// Get the status of the head commit
	const { data: statusData } = await octokit.rest.repos.getCombinedStatusForRef({
		owner,
		repo,
		ref: pullRequest.head.sha,
	});

	// Get the check runs for the head commit
	const { data: checkRunsData } = await octokit.rest.checks.listForRef({
		owner,
		repo,
		ref: pullRequest.head.sha,
	});

	const failedChecks = checkRunsData.check_runs
		.filter((run) => run.status === 'completed' && run.conclusion !== 'success')
		.map((run) => run.name);

	return statusData.state === 'success' && failedChecks.length === 0;
}

export function getApp(env: Env) {
	const app = new App({
		appId: env.APP_ID,
		privateKey: env.PRIVATE_KEY.replaceAll('\\n', '\n'),
		webhooks: {
			secret: env.WEBHOOK_SECRET,
		},
	});

	// eslint-disable-next-line promise/prefer-await-to-callbacks
	app.webhooks.onError((err) => {
		logger.error({ err }, 'Webhook error');
	});

	// TODO: Swap to create for prod
	app.webhooks.on('issue_comment.edited', async (data) => {
		logger.debug('in comment edit');

		if (!data.payload.comment.body.startsWith('pack this')) {
			logger.debug(`Comment does not start with 'pack this': ${data.payload.comment.body}`);
			return;
		}

		if (!data.payload.comment.user) {
			logger.debug('Comment does not have a user associated with it');
			return;
		}

		if (!data.payload.issue.pull_request || data.payload.issue.state !== 'open') {
			logger.debug('Comment is not on a pull request or pull request is not open');
			return;
		}

		const {
			data: { permission },
		} = await data.octokit.rest.repos.getCollaboratorPermissionLevel({
			owner: data.payload.repository.owner.login,
			repo: data.payload.repository.name,
			username: data.payload.comment.user.login,
		});

		if (permission !== 'admin' && permission !== 'write') {
			logger.debug(`User ${data.payload.comment.user.login} does not have sufficient permissions to pack.`);
			return;
		}

		if (
			!(await isPRGreen(
				data.octokit,
				data.payload.repository.owner.login,
				data.payload.repository.name,
				data.payload.issue.number,
			))
		) {
			logger.debug('Pull request is not green');
			return;
		}

		logger.debug('Beginning the pack process...');

		// TODO: Invoke workflow
	});

	return app;
}
