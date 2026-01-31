import type { TNillable } from '$lib/common/types';
import type { LiveQuery, PGliteWithLive } from '@electric-sql/pglite/live';
import { createSubscriber } from 'svelte/reactivity';

export class LiveDB<TResult> {
	#liveDB: TNillable<LiveQuery<TResult>>;
	#data: TResult[] = [];
	#subscribe;

	constructor(db: PGliteWithLive, query: string) {
		this.#subscribe = createSubscriber((update) => {
			db.live
				.query<TResult>(query, [], (res) => {
					this.#data = res.rows;
					update();
				})
				.then((res) => {
					this.#liveDB = res;
				})
				.catch((err) => console.error(err));

			return () => this.#liveDB?.unsubscribe();
		});
	}

	get data() {
		this.#subscribe();
		return this.#data;
	}
}
