import type { PGliteWithLive } from '@electric-sql/pglite/live';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import api from '$lib/api/client';
import { MAX_SYNC_REQUEST_BYTES, MAX_SYNC_REQUEST_CHANGES } from '$lib/common/limits';
import {
	COLLECTION_ID,
	LYUBO_ID,
	TAG_ID,
	createLocalDB,
	readChangeLog,
	serverLyubo,
	syncIn
} from '$lib/testing';
import { ChangeLogSynchronizer } from './changeLogSynchronizer';

// The network is the only boundary replaced: the change log, triggers and rollback are real
vi.mock('$lib/api/client');

type TChange = Parameters<ChangeLogSynchronizer['send']>[0][number];

const request = vi.mocked(api.request);
const respond = (...statuses: (number | undefined)[]) => {
	for (const status of statuses) {
		request.mockResolvedValueOnce(status ? new Response(null, { status }) : undefined);
	}
};
const sentBodies = () => request.mock.calls.map(([, , body]) => body);
const sentChanges = () =>
	sentBodies().map((body) =>
		(body as { changes: unknown[] }[]).reduce((sum, tx) => sum + tx.changes.length, 0)
	);
// One transaction that inserts `count` rows
const insertRows = (db: PGliteWithLive, count: number, review = '') =>
	db.sql`INSERT INTO lyubo (id, collection_id, review) SELECT gen_random_uuid(), ${COLLECTION_ID}, ${review} FROM generate_series(1, ${count})`;
const change = (overrides: Partial<TChange>): TChange => ({
	id: 1,
	table_name: 'lyubo',
	operation: 'insert',
	primary_key: { id: LYUBO_ID },
	value: { id: LYUBO_ID },
	write_id: crypto.randomUUID(),
	transaction_id: '1',
	...overrides
});

describe('ChangeLogSynchronizer', () => {
	let db: PGliteWithLive;
	let synchronizer: ChangeLogSynchronizer;

	beforeEach(async () => {
		db = await createLocalDB();
		synchronizer = new ChangeLogSynchronizer(db);
	});

	afterEach(async () => {
		await synchronizer.stop();
		await db.close();
		request.mockReset();
	});

	describe('process', () => {
		it('sends nothing when the change log is empty', async () => {
			await synchronizer.process();

			expect(request).not.toHaveBeenCalled();
		});

		it('posts logged changes to the changes endpoint, one entry per transaction', async () => {
			await db.sql`INSERT INTO lyubo (id, collection_id, name) VALUES (${LYUBO_ID}, ${COLLECTION_ID}, 'a')`;
			await db.sql`INSERT INTO tags (id, collection_id, name) VALUES (${TAG_ID}, ${COLLECTION_ID}, 'b')`;
			respond(200);

			await synchronizer.process();

			expect(request).toHaveBeenCalledWith(
				'/api/sync/changes',
				'POST',
				expect.any(Array),
				undefined
			);
			expect(sentBodies()[0]).toMatchObject([
				{ changes: [{ table: 'lyubo', operation: 'insert', value: { id: LYUBO_ID, name: 'a' } }] },
				{ changes: [{ table: 'tags', operation: 'insert', value: { id: TAG_ID, name: 'b' } }] }
			]);
		});

		it('sends a delete with its primary key as the value', async () => {
			await syncIn(db, 'lyubo', [serverLyubo()]);
			await db.sql`DELETE FROM lyubo WHERE id = ${LYUBO_ID}`;
			respond(200);

			await synchronizer.process();

			expect(sentBodies()[0]).toMatchObject([
				{ changes: [{ table: 'lyubo', operation: 'delete', value: { id: LYUBO_ID } }] }
			]);
		});

		describe('when the server accepts the changes', () => {
			it('clears them from the log and keeps the optimistic rows', async () => {
				await db.sql`INSERT INTO lyubo (id, collection_id, name) VALUES (${LYUBO_ID}, ${COLLECTION_ID}, 'a')`;
				respond(200);

				await synchronizer.process();

				expect(await readChangeLog(db)).toHaveLength(0);
				expect((await db.sql`SELECT 1 FROM lyubo WHERE id = ${LYUBO_ID}`).rows).toHaveLength(1);
			});
		});

		describe('when the server rejects the changes', () => {
			it('drops all local writes and the log, keeping the synced rows', async () => {
				await syncIn(db, 'lyubo', [serverLyubo({ name: 'server' })]);
				await db.sql`UPDATE lyubo SET name = 'local' WHERE id = ${LYUBO_ID}`;
				await db.sql`INSERT INTO tags (id, collection_id, name) VALUES (${TAG_ID}, ${COLLECTION_ID}, 'new')`;
				await db.sql`INSERT INTO collections (id) VALUES (${COLLECTION_ID})`;
				respond(400);

				await synchronizer.process();

				const { rows } = await db.sql<{ name: string }>`SELECT name FROM lyubo`;

				expect(rows).toEqual([{ name: 'server' }]);
				expect((await db.sql`SELECT 1 FROM tags`).rows).toHaveLength(0);
				expect((await db.sql`SELECT 1 FROM collections`).rows).toHaveLength(0);
				expect(await readChangeLog(db)).toHaveLength(0);
			});
		});

		describe('when the server fails or cannot be reached', () => {
			beforeEach(() => {
				vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
			});

			afterEach(() => {
				vi.useRealTimers();
			});

			it.each([
				{ failure: 'a 500 response', status: 500 },
				{ failure: 'no response after all network retries', status: undefined }
			])('sends the same changes again after $failure', async ({ status }) => {
				await db.sql`INSERT INTO lyubo (id, collection_id, name) VALUES (${LYUBO_ID}, ${COLLECTION_ID}, 'a')`;
				respond(status, 200);

				const processing = synchronizer.process();
				await vi.runAllTimersAsync();
				await processing;

				expect(request).toHaveBeenCalledTimes(2);
				expect(sentBodies()[1]).toEqual(sentBodies()[0]);
				expect(await readChangeLog(db)).toHaveLength(0);
			});

			it('waits 1 s before the first retry and twice as long before each next one', async () => {
				await db.sql`INSERT INTO lyubo (id, collection_id, name) VALUES (${LYUBO_ID}, ${COLLECTION_ID}, 'a')`;
				respond(500, 500, 200);

				void synchronizer.process();

				await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(1), { interval: 0 });
				await vi.advanceTimersByTimeAsync(999);
				expect(request).toHaveBeenCalledTimes(1);

				await vi.advanceTimersByTimeAsync(1);
				await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(2), { interval: 0 });
				await vi.advanceTimersByTimeAsync(1_999);
				expect(request).toHaveBeenCalledTimes(2);

				await vi.advanceTimersByTimeAsync(1);
				await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(3), { interval: 0 });
			});

			it('stops waiting and sends nothing more when it is stopped', async () => {
				await db.sql`INSERT INTO lyubo (id, collection_id, name) VALUES (${LYUBO_ID}, ${COLLECTION_ID}, 'a')`;
				respond(500);
				const processing = synchronizer.process();
				await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(1), { interval: 0 });

				await synchronizer.stop();
				await processing;

				expect(request).toHaveBeenCalledOnce();
				expect(vi.getTimerCount()).toBe(0);
			});
		});

		describe('when the log is larger than one request may carry', () => {
			it('sends it in parts of whole transactions within the change limit', async () => {
				await insertRows(db, MAX_SYNC_REQUEST_CHANGES - 100);
				await insertRows(db, 200);
				respond(200, 200);

				await synchronizer.process();

				expect(sentChanges()).toEqual([MAX_SYNC_REQUEST_CHANGES - 100, 200]);
				expect(await readChangeLog(db)).toHaveLength(0);
			});

			it('sends it in parts within the byte limit', async () => {
				const review = 'a'.repeat(MAX_SYNC_REQUEST_BYTES / 2);
				await insertRows(db, 1, review);
				await insertRows(db, 1, review);
				respond(200, 200);

				await synchronizer.process();

				expect(sentChanges()).toEqual([1, 1]);
				expect(await readChangeLog(db)).toHaveLength(0);
			});

			it('sends a transaction over the limits alone', async () => {
				await insertRows(db, MAX_SYNC_REQUEST_CHANGES + 1);
				await insertRows(db, 1);
				respond(400);

				await synchronizer.process();

				expect(sentChanges()).toEqual([MAX_SYNC_REQUEST_CHANGES + 1]);
			});
		});
	});

	describe('send', () => {
		it('orders transactions by their numeric id, not as text', async () => {
			respond(200);

			await synchronizer.send([
				change({ id: 1, transaction_id: '10' }),
				change({ id: 2, transaction_id: '9' })
			]);

			expect(sentBodies()[0]).toMatchObject([{ id: '9' }, { id: '10' }]);
		});
	});

	describe('start', () => {
		it('sends changes that are logged after it started', async () => {
			await synchronizer.start();
			respond(200);

			await db.sql`INSERT INTO lyubo (id, collection_id, name) VALUES (${LYUBO_ID}, ${COLLECTION_ID}, 'a')`;

			await vi.waitFor(() => expect(request).toHaveBeenCalledOnce());
			expect(request).toHaveBeenCalledWith(
				'/api/sync/changes',
				'POST',
				expect.any(Array),
				expect.any(AbortSignal)
			);
		});
	});
});
