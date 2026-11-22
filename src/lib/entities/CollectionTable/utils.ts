import { getLocalTimeZone, today } from '@internationalized/date';
import type { PGliteWithLive } from '@electric-sql/pglite/live';
import { sql } from '@electric-sql/pglite/template';
import { v4 as uuidv4 } from 'uuid';
import type { TNillable } from '$lib/types';
import type { TableFocus } from '$lib/components/ui';
import type { TSqlFragment } from '$lib/db';
import type { CollectionFilterStore } from '$lib/entities/CollectionFilter';
import { escapeLikePattern } from '$lib/utils';
import type { ICollectionTable } from './types';

// Text sorts as people read it ("unicode", ICU): case aside, and Ё next to Е, not after Я.
// A record sorts by its first tag; one without tags comes last
export const RECORD_ORDER_BY: Partial<Record<keyof ICollectionTable, TSqlFragment>> = {
	name: sql`name COLLATE "unicode"`,
	tags: sql`(
		SELECT min(t.name COLLATE "unicode")
		FROM lyubo_tags lt JOIN tags t ON t.id = lt.tag_id
		WHERE lt.lyubo_id = lyubo_with_tags.id
	)`
};

// Conditions on `lyubo_with_tags`: the search in name or review, favorites, all selected tags
export const buildRecordConditions = ({
	search,
	isFavoriteOnly,
	tagIds
}: Pick<CollectionFilterStore, 'search' | 'isFavoriteOnly' | 'tagIds'>): TSqlFragment[] => {
	const conditions: TSqlFragment[] = [];

	if (search) {
		const pattern = `%${escapeLikePattern(search)}%`;

		conditions.push(sql`(name ILIKE ${pattern} OR review ILIKE ${pattern})`);
	}

	if (isFavoriteOnly) {
		conditions.push(sql`favorite`);
	}

	if (tagIds.length) {
		conditions.push(sql`tags @> ${JSON.stringify(tagIds)}::jsonb`);
	}

	return conditions;
};

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

// Clears the search and filters, which would hide the new record
export const addRecord = async ({
	focus,
	filter,
	...params
}: {
	db: TNillable<PGliteWithLive>;
	collectionId: string;
	focus: TableFocus;
	filter?: CollectionFilterStore;
}): Promise<void> => {
	filter?.clear();

	const id = await insertRecord(params);

	if (id) {
		focus.request(id, 'name');
	}
};
