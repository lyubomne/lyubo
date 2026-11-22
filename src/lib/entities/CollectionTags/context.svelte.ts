import { query } from '@electric-sql/pglite/template';
import { getContext, setContext, tick } from 'svelte';
import { LiveDB, getDB } from '$lib/db';
import type { TNillable } from '$lib/types';
import type { ITag } from './types';

/*
 * The tags of one collection, from one live query for the whole panel: the tags editor and the
 * selector of every row read them here, so a row that expands has them at once.
 */
class CollectionTagsStore {
	#live: TNillable<LiveDB<ITag>> = $state();

	// Read once: the rack keys a panel by its collection's id, so the id never changes
	constructor(dbStore: ReturnType<typeof getDB>, collectionId: () => string) {
		// db Listener is not ready yet on this microtask loop. So we need to run live on the next one.
		void tick().then(() => {
			if (dbStore.db) {
				this.#live = new LiveDB<ITag>(
					dbStore.db,
					query`SELECT id, name FROM tags WHERE collection_id = ${collectionId()} ORDER BY created_at DESC`
				);
			}
		});

		// The query runs only while someone reads it: keep it running as long as the panel is mounted
		$effect(() => {
			void this.list;
		});
	}

	get list(): ITag[] {
		return this.#live?.data ?? [];
	}
}

const COLLECTION_TAGS_KEY = Symbol('collection-tags');

export const setCollectionTagsContext = (collectionId: () => string) =>
	setContext(COLLECTION_TAGS_KEY, new CollectionTagsStore(getDB(), collectionId));
export const getCollectionTagsContext = () =>
	getContext<ReturnType<typeof setCollectionTagsContext>>(COLLECTION_TAGS_KEY);
