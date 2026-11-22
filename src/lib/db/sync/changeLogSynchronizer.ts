import { type PGliteWithLive } from '@electric-sql/pglite/live';
import { identifier } from '@electric-sql/pglite/template';

import api from '$lib/api/client.js';
import { MAX_SYNC_REQUEST_BYTES, MAX_SYNC_REQUEST_CHANGES } from '$lib/constants';
import { SYNCED_TABLES } from './tables';

type Change = {
	id: number;
	table_name: string;
	operation: 'insert' | 'update' | 'delete';
	primary_key: Record<string, unknown>;
	value?: Record<string, unknown>;
	write_id: string;
	transaction_id: string;
};

type SendResult = 'accepted' | 'rejected' | 'retry';

// Waits after a failed send: 1 s, 2 s, 4 s, ... up to a minute, so a failing server is not flooded
const RETRY_INITIAL_DELAY_MS = 1_000;
const RETRY_MAX_DELAY_MS = 60_000;

// Transaction ids are xid8 numbers: compare them as numbers, '10' sorts before '9' as text
const compareTransactionIds = (a: string, b: string): number => {
	const left = BigInt(a);
	const right = BigInt(b);

	return left < right ? -1 : left > right ? 1 : 0;
};

const groupByTransaction = (changes: Change[]): Change[][] =>
	Object.entries(Object.groupBy(changes, (x) => x.transaction_id))
		.sort((a, b) => compareTransactionIds(a[0], b[0]))
		// TODO: React more obviously? Throw error?
		.flatMap(([, group]) => (group ? [group] : []));

const toTransport = (group: Change[]) => ({
	id: group[0].transaction_id,
	changes: group.map((change) => ({
		table: change.table_name,
		operation: change.operation,
		value: {
			...change.primary_key,
			...(change.value ?? {})
		},
		write_id: change.write_id
	}))
});

const encoder = new TextEncoder();

/*
 * The first whole transactions that fit into one request. The server refuses a larger request and
 * a refusal rolls back every local write, so the log is sent in parts. A single transaction over
 * the limits is sent alone: it can never be accepted, and its refusal rolls it back.
 */
const takeBatch = (changes: Change[]): Change[] => {
	const batch: Change[] = [];
	// The brackets of the JSON array
	let bytes = 2;

	for (const group of groupByTransaction(changes)) {
		// The transaction and the comma before it
		const groupBytes = encoder.encode(JSON.stringify(toTransport(group))).byteLength + 1;
		const isOverLimit =
			batch.length + group.length > MAX_SYNC_REQUEST_CHANGES ||
			bytes + groupBytes > MAX_SYNC_REQUEST_BYTES;

		if (batch.length && isOverLimit) {
			break;
		}

		batch.push(...group);
		bytes += groupBytes;
	}

	return batch;
};

export class ChangeLogSynchronizer {
	#db: PGliteWithLive;
	#position: number;

	#hasChangedWhileProcessing: boolean = false;
	#shouldContinue: boolean = true;
	#status: 'idle' | 'processing' = 'idle';
	#retryCount: number = 0;
	#cancelRetryWait?: () => void;

	#abortController?: AbortController;
	#unsubscribe?: () => Promise<void>;

	constructor(db: PGliteWithLive, position = 0) {
		this.#db = db;
		this.#position = position;
	}

	/*
	 * Start by listening for notifications.
	 */
	async start(): Promise<void> {
		this.#abortController = new AbortController();
		this.#unsubscribe = await this.#db.listen('changes', this.handle.bind(this));

		this.process();
	}

	/*
	 * On notify, either kick off processing or note down that there were changes
	 * so we can process them straightaway on the next loop.
	 */
	async handle(): Promise<void> {
		if (this.#status === 'processing') {
			this.#hasChangedWhileProcessing = true;

			return;
		}

		this.#status = 'processing';

		this.process();
	}

	// Process the changes by fetching them and posting them to the server, one batch at a time.
	// If the changes are accepted then proceed, otherwise rollback or retry after a delay.
	async process(): Promise<void> {
		this.#hasChangedWhileProcessing = false;

		const changes = await this.query();
		const batch = takeBatch(changes);

		if (batch.length) {
			const result: SendResult = await this.send(batch);

			switch (result) {
				case 'accepted':
					this.#retryCount = 0;
					await this.proceed(Math.max(...batch.map((change) => change.id)));
					this.#hasChangedWhileProcessing ||= batch.length < changes.length;

					break;

				case 'rejected':
					this.#retryCount = 0;
					await this.rollback();

					break;

				case 'retry':
					await this.waitBeforeRetry();
					this.#hasChangedWhileProcessing = true;

					break;
			}
		}

		if (this.#hasChangedWhileProcessing && this.#shouldContinue) {
			return await this.process();
		}

		this.#status = 'idle';
	}

	/*
	 * Fetch the changes that are not sent yet
	 */
	async query(): Promise<Change[]> {
		const { rows } = await this.#db.sql<Change>`
      SELECT * from changes
        WHERE id > ${this.#position}
        ORDER BY id asc
    `;

		return rows;
	}

	/*
	 * Wait before the next retry, twice as long as the last time, up to the maximum.
	 * Stopping ends the wait early.
	 */
	async waitBeforeRetry(): Promise<void> {
		const delay = Math.min(RETRY_INITIAL_DELAY_MS * 2 ** this.#retryCount, RETRY_MAX_DELAY_MS);

		this.#retryCount += 1;

		await new Promise<void>((resolve) => {
			const timer = setTimeout(resolve, delay);

			this.#cancelRetryWait = () => {
				clearTimeout(timer);
				resolve();
			};
		});

		this.#cancelRetryWait = undefined;
	}

	/*
	 * Send the current batch of changes to the server, grouped by transaction.
	 */
	async send(changes: Change[]): Promise<SendResult> {
		const path = '/api/sync/changes';
		const transactions = groupByTransaction(changes).map(toTransport);

		const signal = this.#abortController?.signal;

		let response: Response | undefined;
		try {
			response = await api.request(path, 'POST', transactions, signal);
		} catch (_err) {
			console.log(_err);
			return 'retry';
		}

		if (response === undefined) {
			return 'retry';
		}

		if (response.ok) {
			return 'accepted';
		}

		return response.status < 500 ? 'rejected' : 'retry';
	}

	/*
	 * Proceed by clearing the processed changes and moving the position forward.
	 */
	async proceed(position: number): Promise<void> {
		await this.#db.sql`
      DELETE from changes
        WHERE id <= ${position}
    `;

		this.#position = position;
	}

	/*
	 * Rollback with an extremely naive strategy: if any write is rejected, simply
	 * wipe the entire local state.
	 */
	async rollback(): Promise<void> {
		await this.#db.transaction(async (tx) => {
			for (const { table } of SYNCED_TABLES) {
				await tx.sql`DELETE FROM ${identifier`${table}_local`}`;
			}

			await tx.sql`DELETE from changes`;
		});
	}

	/*
	 * Stop synchronizing
	 */
	async stop(): Promise<void> {
		this.#shouldContinue = false;
		this.#cancelRetryWait?.();

		if (this.#abortController !== undefined) {
			this.#abortController.abort();
		}

		if (this.#unsubscribe !== undefined) {
			await this.#unsubscribe();
		}
	}
}
