import { getLocalTimeZone, today } from '@internationalized/date';
import type { PGliteWithLive } from '@electric-sql/pglite/live';
import { v4 as uuidv4 } from 'uuid';
import type { TNillable } from '$lib/common/types';
import { waitForElement } from '$lib/common/dom';

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

export const focusRecordName = async (recordId: string): Promise<void> => {
	const input = await waitForElement<HTMLInputElement>(
		document,
		`tr[data-row-id="${CSS.escape(recordId)}"] td[data-column="name"] input`
	);

	input?.focus();
};

export const addRecord = async (params: {
	db: TNillable<PGliteWithLive>;
	collectionId: string;
}): Promise<void> => {
	const id = await insertRecord(params);

	if (id) {
		await focusRecordName(id);
	}
};
