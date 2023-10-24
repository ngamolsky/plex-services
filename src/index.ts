import { addPlexRequest } from './notion';

export interface Env {
	NOTION_INTEGRATION_KEY: string;
	NOTION_PLEX_REQUEST_DATABASE_ID: string;
	PLEX_PASSPHRASE_ANSWER: string;
	ENVIRONMENT: 'production' | 'development';
	SENDGRID_API_KEY: string;
	SENDGRID_FROM_EMAIL: string;
	SENDGRID_TO_EMAIL: string;
	SEND_EMAIL: Fetcher;
}

const NEW_REQUEST_PATH = '/plex/new-request';

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const requestPath = new URL(request.url).pathname;

		// Only allow POST requests
		if (request.method !== 'POST') {
			return new Response('Method not allowed', { status: 405 });
		}

		// Handle the new plex request path
		if (requestPath === NEW_REQUEST_PATH) {
			return await addNewPlexRequest(request, env);
		}
		// Reject all other paths
		else {
			return new Response('Not found', { status: 404 });
		}
	},
};

const addNewPlexRequest = async (request: Request, env: Env) => {
	const apiKey = env.NOTION_INTEGRATION_KEY;
	const databaseId = env.NOTION_PLEX_REQUEST_DATABASE_ID;
	const correctPassphrase = env.PLEX_PASSPHRASE_ANSWER;
	const body = (await request.json()) as { title: string; why: string; who: string; passphrase: string; email?: string };

	const title = body.title;
	const why = body.why;
	const who = body.who;
	const passphrase = body.passphrase;
	const email = body.email;

	if (!title || !why || !who || !passphrase) {
		return new Response('Missing required fields', { status: 400 });
	}

	const headers = new Headers(request.headers);

	// Passphrase check is case insensitive
	if (passphrase.toLowerCase() !== correctPassphrase.toLowerCase()) {
		return new Response('Incorrect passphrase', {
			status: 401,
			headers: headers,
		});
	}

	await addPlexRequest(apiKey, databaseId, title, why, who, email);

	const result = await env.SEND_EMAIL.fetch('https://send-email.ng-cloudflare.workers.dev/', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			toEmail: env.SENDGRID_TO_EMAIL,
			subject: 'New Plex Request',
			html: `<p>${who} requested <strong>${title}</strong> on Plex.</p><p>Why: ${why}</p>`,
		}),
	});

	const response = new Response('Record Added: ' + title, { status: 201, headers: headers });
	return response;
};
