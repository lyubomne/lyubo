import z from 'zod';

export const validationSchema = z.object({
	id: z.uuid(),
	name: z.string().nonempty('Name cannot be empty'),
	rating: z.number().min(0).max(10).multipleOf(0.1),
	review: z.string(),
	tags: z.array(z.string()),
	favorite: z.boolean(),
	created_at: z.string(),
	watched_on: z.string()
});
