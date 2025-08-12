import { z } from 'zod';
import { json } from '@sveltejs/kit';
import { SUPABASE_URL, SUPABASE_KEY } from '$env/static/private';
import { createClient } from '@supabase/supabase-js';

// TODO: Improve validation schema for rating field
// TODO: Reuse value part from lyubo schema
const transactionsSchema = z.array(
	z.object({
		id: z.string(),
		changes: z.array(
			z.object({
				operation: z.string(),
				value: z.object({
					id: z.uuid(),
					name: z.string().optional(),
					rating: z.number().optional(),
					review: z.string().nullable().optional(),
					tags: z.array(z.string()).optional(),
					favorite: z.boolean().optional(),
					created_at: z.string().optional()
				}),
				write_id: z.string()
			})
		)
	})
);

export async function POST({ request }) {
	let data;
	try {
		const body = await request.json();
		data = transactionsSchema.parse(body);
	} catch (err: unknown) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return json({ errors: (err as any).errors }, { status: 400 });
	}

	const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

	try {
		for (const tx of data) {
			for (const {
				operation,
				value: { id, ...value },
				write_id
			} of tx.changes) {
				console.log(operation, id, value, write_id);
				switch (operation) {
					case 'insert':
						await supabase
							.from('lyubo')
							.insert({ id, ...value, write_id })
							.then((res) => console.log(res));
						break;

					case 'update':
						await supabase.from('lyubo').update(value).eq('id', id);
						break;

					case 'delete':
						await supabase.from('lyubo').delete().eq('id', id);
						break;
				}
			}
		}
	} catch (err) {
		return json({ errors: err }, { status: 500 });
	}

	return json({ status: 'OK' });
}
