import { type Operation } from '@electric-sql/client';
import { type PGliteWithLive } from '@electric-sql/pglite/live';

import api from '$lib/api/client.js';

type Change = {
	id: number;
	table_name: string;
	operation: Operation;
	primary_key: Record<string, unknown>;
	value?: Record<string, unknown>;
	write_id: string;
	transaction_id: string;
};

type SendResult = 'accepted' | 'rejected' | 'retry';

export class ChangeLogSynchronizer {
	#db: PGliteWithLive;
	#position: number;

	#hasChangedWhileProcessing: boolean = false;
	#shouldContinue: boolean = true;
	#status: 'idle' | 'processing' = 'idle';

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

	// Process the changes by fetching them and posting them to the server.
	// If the changes are accepted then proceed, otherwise rollback or retry.
	async process(): Promise<void> {
		this.#hasChangedWhileProcessing = false;

		const { changes, position } = await this.query();

		if (changes.length) {
			const result: SendResult = await this.send(changes);

			switch (result) {
				case 'accepted':
					await this.proceed(position);

					break;

				case 'rejected':
					await this.rollback();

					break;

				case 'retry':
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
	 * Fetch the current batch of changes
	 */
	async query(): Promise<{ changes: Change[]; position: number }> {
		const { rows } = await this.#db.sql<Change>`
      SELECT * from changes
        WHERE id > ${this.#position}
        ORDER BY id asc
    `;

		const position = rows.length ? rows.at(-1)!.id : this.#position;

		return {
			changes: rows,
			position
		};
	}

	/*
	 * Send the current batch of changes to the server, grouped by transaction.
	 */
	async send(changes: Change[]): Promise<SendResult> {
		const path = '/api/electric/changes';

		const groups = Object.groupBy(changes, (x) => x.transaction_id);
		const sorted = Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
		const transactions = sorted.map(([transaction_id, changes]) => {
			// TODO: React more obviously? Throw error?
			if (!changes) {
				return;
			}

			return {
				id: transaction_id,
				changes: changes.map((change) => ({
					table: change.table_name,
					operation: change.operation,
					value: {
						...change.primary_key,
						...(change.value ?? {})
					},
					write_id: change.write_id
				}))
			};
		});

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
			await tx.sql`DELETE from changes`;
			await tx.sql`DELETE from lyubo_local`;
			// ВОт тут надо тупо дропать вообще все таблицы локальные пока что
		});
	}

	/*
	 * Stop synchronizing
	 */
	async stop(): Promise<void> {
		this.#shouldContinue = false;

		if (this.#abortController !== undefined) {
			this.#abortController.abort();
		}

		if (this.#unsubscribe !== undefined) {
			await this.#unsubscribe();
		}
	}
}
