import { identifier, query, sql } from '@electric-sql/pglite/template';
import type { TLiveQuery, TSqlFragment } from '$lib/db';
import type { ITableSort } from '$lib/components/ui';

/*
 * The rows of a table or view: equal to every `filter` value and matching every `where`
 * condition, in the `sort` order (rows without a value last), then newest first.
 */
export const buildDataTableQuery = ({
	name,
	filter = {},
	where = [],
	sort,
	orderBy = {}
}: {
	name: string;
	filter?: Record<string, unknown>;
	where?: TSqlFragment[];
	sort?: ITableSort | null;
	orderBy?: Partial<Record<string, TSqlFragment>>;
}): TLiveQuery => {
	const conditions = [
		...Object.entries(filter).map(([column, value]) => sql`${identifier`${column}`} = ${value}`),
		...where
	];
	const whereClause = conditions.length
		? sql`WHERE ${conditions.reduce((left, right) => sql`${left} AND ${right}`)}`
		: sql``;
	const sortClause = sort
		? sql`${orderBy[sort.column] ?? identifier`${sort.column}`} ${sort.direction === 'asc' ? sql`ASC` : sql`DESC`} NULLS LAST,`
		: sql``;

	// `id` keeps rows created in one transaction in a stable order
	return query`
		SELECT * FROM ${identifier`${name}`} ${whereClause}
		ORDER BY ${sortClause} created_at DESC, id
	`;
};
