import { Client } from '@notionhq/client';

export const addPlexRequest = async (apiKey: string, databaseId: string, title: string, why: string, who: string, email?: string) => {
	const notion = new Client({ auth: apiKey });

	await notion.pages.create({
		parent: {
			database_id: databaseId,
			type: 'database_id',
		},
		properties: {
			'What should I add?': {
				type: 'title',
				title: [
					{
						text: {
							content: title,
						},
					},
				],
			},
			'Why should I add it?': {
				type: 'rich_text',
				rich_text: [
					{
						text: {
							content: why,
						},
					},
				],
			},
			'Who is this?': {
				type: 'rich_text',
				rich_text: [
					{
						text: {
							content: who,
						},
					},
				],
			},
			Email: {
				type: 'email',
				email: email || null,
			},
		},
	});
};
