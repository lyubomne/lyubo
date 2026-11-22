import type { PGliteWithLive } from '@electric-sql/pglite/live';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildDataTableQuery } from '$lib/components/data';
import type { ITableSort } from '$lib/components/ui';
import {
	COLLECTION_ID,
	LYUBO_ID,
	OTHER_COLLECTION_ID,
	OTHER_LYUBO_ID,
	OTHER_TAG_ID,
	TAG_ID,
	createLocalDB,
	serverLyubo,
	serverLyuboTag,
	serverTag,
	syncIn
} from '$lib/testing';
import { RECORD_ORDER_BY, buildRecordConditions } from './utils';

const THIRD_LYUBO_ID = '00000000-0000-4000-8000-000000000008';
const OTHER_COLLECTION_LYUBO_ID = '00000000-0000-4000-8000-000000000009';

// The query of a panel's table, as CollectionTable builds it
describe('collection table query', () => {
	let db: PGliteWithLive;

	const readNames = async ({
		search = '',
		isFavoriteOnly = false,
		tagIds = [],
		sort = null
	}: {
		search?: string;
		isFavoriteOnly?: boolean;
		tagIds?: string[];
		sort?: ITableSort | null;
	} = {}) => {
		const { query, params } = buildDataTableQuery({
			name: 'lyubo_with_tags',
			filter: { collection_id: COLLECTION_ID },
			where: buildRecordConditions({ search, isFavoriteOnly, tagIds }),
			sort,
			orderBy: RECORD_ORDER_BY
		});

		return (await db.query<{ name: string }>(query, params)).rows.map((row) => row.name);
	};

	// Newest first: ёлка, Apple, banana. Tags: banana has Comedy and drama, Apple has drama
	beforeEach(async () => {
		db = await createLocalDB();
		await syncIn(db, 'lyubo', [
			serverLyubo({
				id: LYUBO_ID,
				name: 'banana',
				favorite: true,
				created_at: '2026-01-01T00:00:00.000Z'
			}),
			serverLyubo({
				id: OTHER_LYUBO_ID,
				name: 'Cherry',
				review: 'Сочный, 100% сорт',
				created_at: '2026-01-02T00:00:00.000Z'
			}),
			serverLyubo({
				id: THIRD_LYUBO_ID,
				name: 'ёлка',
				favorite: true,
				created_at: '2026-01-03T00:00:00.000Z'
			}),
			serverLyubo({
				id: OTHER_COLLECTION_LYUBO_ID,
				collection_id: OTHER_COLLECTION_ID,
				name: 'Cherry pie'
			})
		]);
		await syncIn(db, 'tags', [
			serverTag({ id: TAG_ID, name: 'Drama' }),
			serverTag({ id: OTHER_TAG_ID, name: 'comedy' })
		]);
		await syncIn(db, 'lyubo_tags', [
			serverLyuboTag({ lyubo_id: LYUBO_ID, tag_id: TAG_ID }),
			serverLyuboTag({ lyubo_id: LYUBO_ID, tag_id: OTHER_TAG_ID }),
			serverLyuboTag({ lyubo_id: OTHER_LYUBO_ID, tag_id: TAG_ID })
		]);
	});

	afterEach(async () => {
		await db.close();
	});

	describe('order', () => {
		it('lists the records of the collection newest first by default', async () => {
			const names = await readNames();

			expect(names).toEqual(['ёлка', 'Cherry', 'banana']);
		});

		it.each([
			{ direction: 'asc', expected: ['banana', 'Cherry', 'ёлка'] },
			{ direction: 'desc', expected: ['ёлка', 'Cherry', 'banana'] }
		] as const)('sorts names $direction regardless of case', async ({ direction, expected }) => {
			const names = await readNames({ sort: { column: 'name', direction } });

			expect(names).toEqual(expected);
		});

		it.each([
			{ direction: 'asc', expected: ['banana', 'Cherry', 'ёлка'] },
			{ direction: 'desc', expected: ['Cherry', 'banana', 'ёлка'] }
		] as const)(
			'sorts $direction by the first tag regardless of case, records without tags last',
			async ({ direction, expected }) => {
				const names = await readNames({ sort: { column: 'tags', direction } });

				expect(names).toEqual(expected);
			}
		);

		it('orders records with the same value newest first', async () => {
			const names = await readNames({ sort: { column: 'favorite', direction: 'desc' } });

			expect(names).toEqual(['ёлка', 'banana', 'Cherry']);
		});
	});

	describe('filters', () => {
		it.each([
			{ search: 'CHER', expected: ['Cherry'] },
			{ search: 'сочный', expected: ['Cherry'] },
			{ search: '%', expected: ['Cherry'] },
			{ search: 'an', expected: ['banana'] }
		])('finds "$search" in names and reviews, in any case', async ({ search, expected }) => {
			const names = await readNames({ search });

			expect(names).toEqual(expected);
		});

		it('shows only favorites', async () => {
			const names = await readNames({ isFavoriteOnly: true });

			expect(names).toEqual(['ёлка', 'banana']);
		});

		it.each([
			{ tags: 'Drama', tagIds: [TAG_ID], expected: ['Cherry', 'banana'] },
			{ tags: 'Drama and comedy', tagIds: [TAG_ID, OTHER_TAG_ID], expected: ['banana'] }
		])('shows only records with all of $tags', async ({ tagIds, expected }) => {
			const names = await readNames({ tagIds });

			expect(names).toEqual(expected);
		});
	});
});
