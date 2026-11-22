import type { PGliteWithLive } from '@electric-sql/pglite/live';
import { v4 as uuidv4 } from 'uuid';
import type { TNillable } from '$lib/types';
import { waitForElement } from '$lib/browser';
import type { ITableSort } from '$lib/components/ui';
import type { ICollection } from './types';
import { validationSchema } from './validationSchema';

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

const sortSchema = validationSchema.pick({ sort_column: true, sort_direction: true });

// 'name asc' into its sort; '' is the default order
export const parseSortKey = (key: string): ITableSort | null => {
	const [column, direction] = key.split(' ');

	return column && (direction === 'asc' || direction === 'desc') ? { column, direction } : null;
};

// One statement: the server's CHECK wants both columns set or both NULL after every change
export const sortCollection = ({
	db,
	id,
	sort
}: {
	db: TNillable<PGliteWithLive>;
	id: string;
	sort: ITableSort | null;
}) => {
	if (!db) {
		return;
	}

	const { sort_column, sort_direction } = sortSchema.parse({
		sort_column: sort?.column ?? null,
		sort_direction: sort?.direction ?? null
	});

	return db.sql`
		UPDATE collections SET sort_column = ${sort_column}, sort_direction = ${sort_direction}
		WHERE id = ${id}
	`;
};

// The server deletes its records and tags with it
export const deleteCollection = ({ db, id }: { db: TNillable<PGliteWithLive>; id: string }) => {
	if (!db) {
		return;
	}

	return db.sql`DELETE FROM collections WHERE id = ${id}`;
};
