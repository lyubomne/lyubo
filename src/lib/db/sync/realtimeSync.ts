import {
	createRealtimeClient,
	defineParsers,
	pgTypeOids,
	type RawLiveQuerySubscription,
	type RawLiveQueryUpdate,
	type RealtimeClient,
	type SealedLiveQuery
} from '@neon/realtime/client';
import type { PGliteWithLive } from '@electric-sql/pglite/live';
import { identifier } from '@electric-sql/pglite/template';

import api from '$lib/api/client';

type TRow = Record<string, unknown>;

export interface ISyncedTable {
	// Server table name. Rows land in `<table>_synced` through `<table>_synced_*` SQL functions
	table: string;
	primaryKey: string[];
}

interface ILiveQueryResponse {
	url: string;
	sealed: SealedLiveQuery<TRow>;
}

// Sealed queries live 60 seconds: renew 10 seconds early, retry a failed fetch after 1 second
const RENEW_EARLY_MS = 10_000;
const RETRY_MS = 1_000;
const RESTART_MS = 5_000;

// A `date` stays the 'YYYY-MM-DD' string Postgres sends. The client would turn it into a Date at
// local midnight, which JSON.stringify writes as the day before in time zones east of UTC
const REALTIME_PARSERS = defineParsers({ [pgTypeOids.date]: (value: string) => value });

/*
 * Read-path sync: keeps the local `*_synced` tables equal to live queries on Neon Realtime.
 * A `rows` update replaces a whole table, a `changes` update applies upserts and removes.
 */
export class RealtimeSync {
	#db: PGliteWithLive;
	#tables: ISyncedTable[];
	#client?: RealtimeClient;
	#cleanups: (() => void)[] = [];
	#restartTimer?: ReturnType<typeof setTimeout>;
	#isStopped = false;

	constructor(db: PGliteWithLive, tables: ISyncedTable[]) {
		this.#db = db;
		this.#tables = tables;
	}

	/*
	 * Fetch a sealed query for every table and subscribe to all of them on one client.
	 */
	async start(): Promise<void> {
		this.#isStopped = false;

		try {
			const responses = await Promise.all(this.#tables.map((table) => this.fetchSealed(table)));

			if (this.#isStopped) {
				return;
			}

			const client = createRealtimeClient({ url: responses[0].url, parsers: REALTIME_PARSERS });

			this.#client = client;
			this.#tables.forEach((table, i) => this.subscribe(client, table, responses[i].sealed));
		} catch (err) {
			console.error(err);
			this.scheduleRestart();
		}
	}

	/*
	 * Ask the server to seal the live query of one table.
	 */
	async fetchSealed(table: ISyncedTable): Promise<ILiveQueryResponse> {
		const response = await api.request('/api/sync/live', 'POST', { table: table.table });

		if (!response?.ok) {
			throw new Error(`Failed to seal live query for ${table.table}: ${response?.status}`);
		}

		return response.json();
	}

	/*
	 * Subscribe without materialization and apply every update to PGlite in arrival order.
	 */
	subscribe(client: RealtimeClient, table: ISyncedTable, sealed: SealedLiveQuery<TRow>): void {
		const subscription = client.subscribe(sealed, { materialize: false });
		// A `remove` carries only the opaque rowId, so remember each row's primary key
		const keys = new Map<string, TRow>();
		let queue = Promise.resolve();

		subscription.onUpdate((update) => {
			queue = queue.then(() => this.apply(table, keys, update)).catch((err) => console.error(err));
		});

		subscription.onStateChange((state) => {
			if (state.status === 'error') {
				console.error(state.error);
				this.scheduleRestart();
			}
		});

		const stopRenewing = this.renewBeforeExpiry(subscription, sealed, table);

		this.#cleanups.push(() => {
			stopRenewing();
			subscription.unsubscribe();
		});
	}

	/*
	 * Write one update into `<table>_synced` inside a single PGlite transaction.
	 */
	async apply(
		table: ISyncedTable,
		keys: Map<string, TRow>,
		update: RawLiveQueryUpdate<TRow>
	): Promise<void> {
		const pickKey = (row: TRow): TRow =>
			Object.fromEntries(table.primaryKey.map((key) => [key, row[key]]));
		const upsertFn = identifier`${table.table}_synced_upsert`;

		if (update.type === 'rows') {
			keys.clear();

			const rows = update.rows.map(({ rowId, row }) => {
				keys.set(rowId, pickKey(row));

				return row;
			});
			const retainFn = identifier`${table.table}_synced_retain`;

			await this.#db.transaction(async (tx) => {
				await tx.sql`SELECT ${upsertFn}(${JSON.stringify(rows)}::jsonb)`;
				await tx.sql`SELECT ${retainFn}(${JSON.stringify([...keys.values()])}::jsonb)`;
			});

			return;
		}

		// Collapse the batch to the last change per row, then remove before upserting
		const lastChanges = new Map<string, TRow | null>();

		for (const change of update.changes) {
			if (change.type === 'upsert') {
				lastChanges.set(change.rowId, change.row);
			} else if (change.type === 'remove') {
				lastChanges.set(change.rowId, null);
			}
		}

		const upserts: TRow[] = [];
		const removes: TRow[] = [];

		for (const [rowId, row] of lastChanges) {
			if (row) {
				keys.set(rowId, pickKey(row));
				upserts.push(row);
			} else {
				const key = keys.get(rowId);

				keys.delete(rowId);

				if (key) {
					removes.push(key);
				}
			}
		}

		const removeFn = identifier`${table.table}_synced_remove`;

		await this.#db.transaction(async (tx) => {
			if (removes.length) {
				await tx.sql`SELECT ${removeFn}(${JSON.stringify(removes)}::jsonb)`;
			}

			if (upserts.length) {
				await tx.sql`SELECT ${upsertFn}(${JSON.stringify(upserts)}::jsonb)`;
			}
		});
	}

	/*
	 * Renew the sealed query before it expires. Stops when renew() rejects (error or new query).
	 */
	renewBeforeExpiry(
		subscription: RawLiveQuerySubscription<TRow>,
		sealed: SealedLiveQuery<TRow>,
		table: ISyncedTable
	): () => void {
		let timer: ReturnType<typeof setTimeout> | undefined;
		let isRenewing = true;

		const schedule = (delay: number) => {
			clearTimeout(timer);

			if (isRenewing) {
				timer = setTimeout(renew, delay);
			}
		};
		const scheduleBeforeExpiry = (expiresAt: number) =>
			schedule(Math.max(0, expiresAt - Date.now() - RENEW_EARLY_MS));
		const stop = () => {
			isRenewing = false;
			clearTimeout(timer);
		};
		const renew = async () => {
			let next: SealedLiveQuery<TRow>;

			try {
				next = (await this.fetchSealed(table)).sealed;
			} catch (_err) {
				schedule(RETRY_MS);

				return;
			}

			scheduleBeforeExpiry(next.expiresAt);
			subscription.renew(next).catch(stop);
		};

		scheduleBeforeExpiry(sealed.expiresAt);

		return stop;
	}

	/*
	 * An `error` state is final: drop the client and subscribe again from scratch.
	 * The fresh `rows` result brings the local tables back in line.
	 */
	scheduleRestart(): void {
		if (this.#isStopped || this.#restartTimer) {
			return;
		}

		this.teardown();
		this.#restartTimer = setTimeout(() => {
			this.#restartTimer = undefined;
			void this.start();
		}, RESTART_MS);
	}

	teardown(): void {
		for (const cleanup of this.#cleanups) {
			cleanup();
		}

		this.#cleanups = [];
		this.#client?.close();
		this.#client = undefined;
	}

	/*
	 * Stop synchronizing
	 */
	stop(): void {
		this.#isStopped = true;
		clearTimeout(this.#restartTimer);
		this.#restartTimer = undefined;
		this.teardown();
	}
}
