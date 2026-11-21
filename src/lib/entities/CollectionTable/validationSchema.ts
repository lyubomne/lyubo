import z from 'zod';

import { ColumnLimits } from '$lib/common/limits';

export const validationSchema = z.object({
	id: z.uuid(),
	collection_id: z.uuid(),
	name: z.string().max(ColumnLimits.lyubo.name),
	rating: z.number().min(0).max(10).multipleOf(0.1).default(0),
	review: z.string().max(ColumnLimits.lyubo.review),
	tags: z.array(z.string()),
	favorite: z.boolean().default(false),
	created_at: z.string(),
	rated_on: z.iso.date()
});
