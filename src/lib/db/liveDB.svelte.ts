import type { TNillable } from '$lib/common/types';
import type { LiveQuery, PGliteWithLive } from '@electric-sql/pglite/live';
import { createSubscriber } from 'svelte/reactivity';

export class LiveDB<TResult> {
	#liveDB: TNillable<Promise<LiveQuery<TResult>>>;
	#data: TResult[] = [];
	#subscribe;

	constructor(db: PGliteWithLive, query: string) {
		this.#subscribe = createSubscriber((update) => {
			this.#liveDB = db.live.query(query, [], (res) => {
				this.#data = res.rows;
				update();
			});

			return () => this.#liveDB?.then(({ unsubscribe }) => unsubscribe());
		});
	}

	get data() {
		this.#subscribe();
		return this.#data;
	}
}
