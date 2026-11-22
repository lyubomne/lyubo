import z from 'zod';

import { ColumnLimits } from '$lib/constants';

export const validationSchema = z.object({
	id: z.uuid(),
	name: z.string().max(ColumnLimits.tags.name),
	created_at: z.string()
});
