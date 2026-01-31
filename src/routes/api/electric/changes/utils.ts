import type { SupabaseClient } from '@supabase/supabase-js';
import type { TableDescriptor } from './tables/types';

function filterColumns(input: Record<string, unknown>, allowed: readonly string[]) {
	return Object.fromEntries(Object.entries(input).filter(([key]) => allowed.includes(key)));
}

export async function applyChange(
	supabase: SupabaseClient,
	table: TableDescriptor,
	operation: 'insert' | 'update' | 'delete',
	value: Record<string, unknown>,
	write_id: string
) {
	const pkColumns = table.primaryKey;

	// collect and validate all primary key values
	const pkValues: Record<string, unknown> = {};
	for (const key of pkColumns) {
		if (!(key in value)) {
			throw new Error(`missing primary key: ${key}`);
		}

		pkValues[key] = value[key];
	}

	const filtered = filterColumns(value, table.writableColumns);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const applyPkFilter = (query: any) => {
		for (const [key, val] of Object.entries(pkValues)) {
			query = query.eq(key, val);
		}

		return query;
	};

	if (operation === 'insert' && table.allow.insert) {
		console.log()
		return supabase.from(table.table).insert({
			...pkValues,
			...filtered,
			write_id
		});
	}

	if (operation === 'update' && table.allow.update) {
		return applyPkFilter(supabase.from(table.table).update(filtered));
	}

	if (operation === 'delete' && table.allow.delete) {
		return applyPkFilter(supabase.from(table.table).delete());
	}

	throw new Error(`operation not allowed: ${operation}`);
}
