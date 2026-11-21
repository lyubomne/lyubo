import { beforeAll, describe, expect, it, vi } from 'vitest';

type TPost = typeof import('./+server').POST;

// Sealing is local cryptography: a secret in the right format is enough, nothing goes to Neon
const ENV = {
	APP_DATABASE_URL: 'postgres://user@localhost/lyubo',
	NEON_REALTIME_SECRET: `nrt_live_1${'A'.repeat(43)}`,
	NEON_REALTIME_URL: 'wss://realtime.example'
};

describe('POST /api/sync/live', () => {
	let POST: TPost;

	const post = async (body: unknown, headers: Record<string, string> = {}) => {
		const request = new Request('http://localhost/api/sync/live', {
			method: 'POST',
			headers: { origin: 'http://localhost', 'content-type': 'application/json', ...headers },
			body: JSON.stringify(body)
		});
		const response = await POST({ request } as Parameters<TPost>[0]);

		return { status: response.status, body: await response.json() };
	};

	beforeAll(async () => {
		vi.doMock('$env/static/private', () => ENV);
		({ POST } = await import('./+server'));
	});

	it('responds with the Realtime URL and the sealed live query of the table', async () => {
		const response = await post({ table: 'lyubo' });

		expect(response).toEqual({
			status: 200,
			body: { url: ENV.NEON_REALTIME_URL, sealed: expect.anything() }
		});
	});

	it('responds 400 to a table outside the whitelist', async () => {
		const response = await post({ table: 'changes' });

		expect(response.status).toBe(400);
	});

	it.each<{ name: string; status: number; headers: Record<string, string> }>([
		{ name: 'a cross-site request', status: 403, headers: { origin: 'https://evil.example' } },
		{
			name: 'a body that is not declared as JSON',
			status: 415,
			headers: { 'content-type': 'text/plain' }
		},
		{ name: 'a body over the size limit', status: 413, headers: { 'content-length': '1025' } }
	])('responds $status to $name without sealing', async ({ status, headers }) => {
		const response = await post({ table: 'lyubo' }, headers);

		expect(response).toEqual({ status, body: { error: expect.any(String) } });
	});
});
