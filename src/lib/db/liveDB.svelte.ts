import type { TNillable } from '$lib/common/types';
import type { LiveQuery, PGliteWithLive } from '@electric-sql/pglite/live';
import type { query } from '@electric-sql/pglite/template';
import { createSubscriber } from 'svelte/reactivity';

// Built with the `query` template tag of '@electric-sql/pglite/template', which binds values as
// parameters and escapes `identifier`s, so a live query is never put together from strings
export type TLiveQuery = ReturnType<typeof query>;

export class LiveDB<TResult> {
	#liveDB: TNillable<LiveQuery<TResult>>;
	#data: TResult[] = [];
	#subscribe;

	constructor(db: PGliteWithLive, { query, params }: TLiveQuery) {
		this.#subscribe = createSubscriber((update) => {
			db.live
				.query<TResult>(query, params, (res) => {
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
