import { addPlexRequest } from './notion';

export interface Env {
	NOTION_INTEGRATION_KEY: string;
	NOTION_PLEX_REQUEST_DATABASE_ID: string;
	PLEX_PASSPHRASE_ANSWER: string;
	SENDGRID_TO_EMAIL: string;
	SEND_EMAIL: Fetcher;
	WORKER_ENV?: 'local';
}

const NEW_REQUEST_PATH = '/plex/new-request';

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const requestPath = new URL(request.url).pathname;

		console.log(`Request path: ${requestPath}`, env);

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
	const body = (await request.json()) as { title: string; why: string; who: string; passphrase: string; emailNotify?: string };

	const title = body.title;
	const why = body.why;
	const who = body.who;
	const passphrase = body.passphrase;
	const email = body.emailNotify;

	if (!title || !why || !who || !passphrase) {
		return new Response('Missing required fields', { status: 400 });
	}

	const headers = new Headers(request.headers);

	// Allow CORS on localhost

	const environment = env.WORKER_ENV;

	if (env.WORKER_ENV === 'local') {
		headers.set('Access-Control-Allow-Origin', 'http://localhost:8000');
	} else {
		headers.set('Access-Control-Allow-Origin', 'https://gamolsky.net');
	}

	// Passphrase check just checks if the lowercase input contains the correct passphrase
	if (!passphrase.toLowerCase().includes(correctPassphrase.toLowerCase())) {
		return new Response('Wrong secret answer. Better call me!', {
			status: 401,
			headers: headers,
		});
	}

	await addPlexRequest(apiKey, databaseId, title, why, who, email);

	const sendEmailUrl = env.WORKER_ENV === 'local' ? 'http://localhost:54825' : 'https://send-email.ng-cloudflare.workers.dev/';

	const result = await env.SEND_EMAIL.fetch(sendEmailUrl, {
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
