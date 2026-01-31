import { z } from 'zod';

export const transportSchema = z.array(
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
);
