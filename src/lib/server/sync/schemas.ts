import { z } from 'zod';

import { MAX_SYNC_REQUEST_CHANGES } from '$lib/common/limits';

export const transportSchema = z
	.array(
		z.object({
			id: z.string(),
			changes: z.array(
				z.object({
					table: z.string(),
					operation: z.enum(['insert', 'update', 'delete']),
					value: z.record(z.string(), z.unknown()),
					write_id: z.uuid()
				})
			)
		})
	)
	.refine(
		(transactions) =>
			transactions.reduce((sum, tx) => sum + tx.changes.length, 0) <= MAX_SYNC_REQUEST_CHANGES,
		{ message: `more than ${MAX_SYNC_REQUEST_CHANGES} changes in one request` }
	);
