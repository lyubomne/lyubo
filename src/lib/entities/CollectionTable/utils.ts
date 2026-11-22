import { getLocalTimeZone, today } from '@internationalized/date';
import type { PGliteWithLive } from '@electric-sql/pglite/live';
import { v4 as uuidv4 } from 'uuid';
import type { TNillable } from '$lib/common/types';
import type { TableFocus } from '$lib/components/ui';

export const insertRecord = async ({
	db,
	collectionId
}: {
	db: TNillable<PGliteWithLive>;
	collectionId: string;
}): Promise<string | undefined> => {
	if (!db) {
		return;
	}

	const id = uuidv4();
	// Today in the user's time zone; CURRENT_DATE in PGlite is the date in UTC
	const ratedOn = today(getLocalTimeZone()).toString();

	await db.sql`
		INSERT INTO lyubo (id, collection_id, rated_on) VALUES (${id}, ${collectionId}, ${ratedOn})
	`;

	return id;
};

export const addRecord = async ({
	focus,
	...params
}: {
	db: TNillable<PGliteWithLive>;
	collectionId: string;
	focus: TableFocus;
}): Promise<void> => {
	const id = await insertRecord(params);

	if (id) {
		focus.request(id, 'name');
	}
};
