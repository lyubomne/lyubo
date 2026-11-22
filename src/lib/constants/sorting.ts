// Columns a collection can be sorted by. The same list is the `collections_sort` CHECK in
// `neon/schema.sql`; the client validates against it before it writes
export const COLLECTION_SORT_COLUMNS = [
	'name',
	'rating',
	'favorite',
	'tags',
	'rated_on',
	'created_at'
] as const;

export const SORT_DIRECTIONS = ['asc', 'desc'] as const;
