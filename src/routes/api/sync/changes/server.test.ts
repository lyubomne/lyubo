import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { type IServerDB, createServerDB } from '$lib/server/testing';
import { LYUBO_ID, TAG_ID, WRITE_ID } from '$lib/testing';

type TPost = typeof import('./+server').POST;

// The endpoint runs against a real Postgres: only its env is replaced
describe('POST /api/sync/changes', () => {
	let serverDB: IServerDB;
	let POST: TPost;

	const post = async (body: unknown) => {
		const request = new Request('http://localhost/api/sync/changes', {
			method: 'POST',
			body: typeof body === 'string' ? body : JSON.stringify(body)
		});
		const response = await POST({ request } as Parameters<TPost>[0]);

		return { status: response.status, body: await response.json() };
	};
	const transaction = (id: string, ...changes: object[]) => ({ id, changes });
	const insert = (table: string, value: object) => ({
		table,
		operation: 'insert',
		value,
		write_id: WRITE_ID
	});
	const count = async (table: 'lyubo' | 'tags' | 'lyubo_tags') =>
		(await serverDB.sql`SELECT 1 FROM ${serverDB.sql(table)}`).length;

	beforeAll(async () => {
		serverDB = await createServerDB();
		vi.doMock('$env/static/private', () => ({ APP_DATABASE_URL: serverDB.url }));
		({ POST } = await import('./+server'));
	});

	afterAll(async () => {
		await serverDB.close();
	});

	beforeEach(async () => {
		await serverDB.reset();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('applies every transaction of the request and responds 200', async () => {
		const response = await post([
			transaction('1', insert('lyubo', { id: LYUBO_ID })),
			transaction('2', insert('tags', { id: TAG_ID }))
		]);

		expect(response).toEqual({ status: 200, body: { status: 'OK' } });
		expect(await count('lyubo')).toBe(1);
		expect(await count('tags')).toBe(1);
	});

	it('responds 400 with the issues of a body that does not match the schema', async () => {
		const response = await post([transaction('1', { ...insert('lyubo', {}), write_id: 'x' })]);

		expect(response.status).toBe(400);
		expect(response.body.errors).toEqual([
			expect.objectContaining({ path: [0, 'changes', 0, 'write_id'] })
		]);
	});

	it('responds 400 to a body that is not JSON', async () => {
		const response = await post('{');

		expect(response).toEqual({ status: 400, body: { errors: 'invalid json' } });
	});

	it('responds 403 to a table outside the whitelist and applies nothing', async () => {
		const response = await post([
			transaction('1', insert('lyubo', { id: LYUBO_ID })),
			transaction('2', insert('changes', { id: 1 }))
		]);

		expect(response.status).toBe(403);
		expect(await count('lyubo')).toBe(0);
	});

	it('responds 400 to an operation the table does not allow', async () => {
		const response = await post([
			transaction('1', {
				...insert('lyubo_tags', { lyubo_id: LYUBO_ID, tag_id: TAG_ID }),
				operation: 'update'
			})
		]);

		expect(response).toEqual({ status: 400, body: { error: 'change rejected' } });
	});

	it('responds 400 and applies nothing when Postgres rejects one of the changes', async () => {
		const response = await post([
			transaction('1', insert('tags', { id: TAG_ID })),
			// Violates the foreign key: the lyubo row does not exist
			transaction('2', insert('lyubo_tags', { lyubo_id: LYUBO_ID, tag_id: TAG_ID }))
		]);

		expect(response).toEqual({ status: 400, body: { error: 'change rejected' } });
		expect(await count('tags')).toBe(0);
	});

	it('responds 500 without details when the database fails for another reason', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		await serverDB.sql`DROP TABLE lyubo_tags`;

		const response = await post([
			transaction('1', insert('lyubo_tags', { lyubo_id: LYUBO_ID, tag_id: TAG_ID }))
		]);

		expect(response).toEqual({ status: 500, body: { error: 'database error' } });
	});
});
