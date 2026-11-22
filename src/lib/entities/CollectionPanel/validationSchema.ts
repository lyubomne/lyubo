import z from 'zod';

import { COLLECTION_SORT_COLUMNS, ColumnLimits, SORT_DIRECTIONS } from '$lib/constants';

export const validationSchema = z.object({
	id: z.uuid(),
	name: z.string().max(ColumnLimits.collections.name),
	position: z.number().int(),
	sort_column: z.enum(COLLECTION_SORT_COLUMNS).nullable(),
	sort_direction: z.enum(SORT_DIRECTIONS).nullable(),
	created_at: z.string()
});
