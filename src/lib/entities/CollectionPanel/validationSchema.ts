import z from 'zod';

import { ColumnLimits } from '$lib/constants';

export const validationSchema = z.object({
	id: z.uuid(),
	name: z.string().max(ColumnLimits.collections.name),
	position: z.number().int(),
	created_at: z.string()
});
