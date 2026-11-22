import type { PGliteWithLive } from '@electric-sql/pglite/live';
import { v4 as uuidv4 } from 'uuid';
import type { TNillable } from '$lib/types';
import { waitForElement } from '$lib/browser';
import type { ICollection } from './types';

export const UNTITLED_COLLECTION = 'Untitled collection';

export const collectionPanelSelector = (collectionId: string): string =>
	`[data-collection-id="${CSS.escape(collectionId)}"]`;
export const COLLECTION_NAME_INPUT_SELECTOR = '.collection-panel-name input';

export const createCollection = async ({
	db
}: {
	db: TNillable<PGliteWithLive>;
}): Promise<string | undefined> => {
	if (!db) {
		return;
	}

	const id = uuidv4();

	// One statement reads and takes the position. The casts type the parameters, which are
	// text in a SELECT list
	await db.sql`
		INSERT INTO collections (id, name, position)
		SELECT ${id}::uuid, '', COALESCE(MAX(position) + 1, 0)::integer FROM collections
	`;

	return id;
};

export const addCollection = async (params: { db: TNillable<PGliteWithLive> }): Promise<void> => {
	const id = await createCollection(params);

	if (!id) {
		return;
	}

	const input = await waitForElement<HTMLInputElement>(
		document,
		`${collectionPanelSelector(id)} ${COLLECTION_NAME_INPUT_SELECTOR}`
	);

	input?.focus();
};

/*
 * Renumbers every position, so equal positions (defaults, two devices) resolve too. Writes only
 * the rows that move. `collections` is the rack in its current order.
 */
export const moveCollection = async ({
	db,
	collections,
	id,
	offset
}: {
	db: TNillable<PGliteWithLive>;
	collections: Pick<ICollection, 'id' | 'position'>[];
	id: string;
	offset: number;
}): Promise<void> => {
	if (!db) {
		return;
	}

	const from = collections.findIndex((collection) => collection.id === id);
	const to = from + offset;

	if (from === -1 || to < 0 || to >= collections.length) {
		return;
	}

	const reordered = [...collections];
	const [moved] = reordered.splice(from, 1);

	reordered.splice(to, 0, moved);

	await db.transaction(async (tx) => {
		for (const [position, collection] of reordered.entries()) {
			if (collection.position !== position) {
				await tx.sql`UPDATE collections SET position = ${position} WHERE id = ${collection.id}`;
			}
		}
	});
};

// The server deletes its records and tags with it
export const deleteCollection = ({ db, id }: { db: TNillable<PGliteWithLive>; id: string }) => {
	if (!db) {
		return;
	}

	return db.sql`DELETE FROM collections WHERE id = ${id}`;
};
