import type postgres from 'postgres';
import type { TransactionSql } from 'postgres';
import type { TableDescriptor } from './tables/types';

type TRow = Record<string, postgres.ParameterOrJSON<never>>;
type TKey = Record<string, postgres.SerializableParameter<never>>;

// A change the server refuses to apply. The client rolls its local state back on 4xx
export class ChangeRejectedError extends Error {}

const filterColumns = (input: Record<string, unknown>, allowed: readonly string[]): TRow =>
	Object.fromEntries(Object.entries(input).filter(([key]) => allowed.includes(key))) as TRow;

export const applyChange = async ({
	tx,
	table,
	operation,
	value,
	write_id
}: {
	tx: TransactionSql;
	table: TableDescriptor;
	operation: 'insert' | 'update' | 'delete';
	value: Record<string, unknown>;
	write_id: string;
}): Promise<void> => {
	// Collect and validate all primary key values
	const pkValues: TKey = {};

	for (const key of table.primaryKey) {
		const pkValue = value[key];

		if (typeof pkValue !== 'string' && typeof pkValue !== 'number') {
			throw new ChangeRejectedError(`missing primary key: ${key}`);
		}

		pkValues[key] = pkValue;
	}

	const filtered = filterColumns(value, table.writableColumns);
	const pkFilter = table.primaryKey
		.map((key) => tx`${tx(key)} = ${pkValues[key]}`)
		.reduce((left, right) => tx`${left} AND ${right}`);

	if (operation === 'insert' && table.allow.insert) {
		const row: TRow = { ...filtered, ...pkValues, write_id };

		// Idempotent: a batch resent after a lost response must not fail on its own insert
		await tx`
			INSERT INTO ${tx(table.table)} ${tx(row)}
			ON CONFLICT (${tx(table.primaryKey)}) DO UPDATE SET ${tx(row)}
		`;

		return;
	}

	if (operation === 'update' && table.allow.update) {
		const row: TRow = { ...filtered, write_id };

		// Primary key columns identify the row, they are never updated
		for (const key of table.primaryKey) {
			delete row[key];
		}

		await tx`UPDATE ${tx(table.table)} SET ${tx(row)} WHERE ${pkFilter}`;

		return;
	}

	if (operation === 'delete' && table.allow.delete) {
		await tx`DELETE FROM ${tx(table.table)} WHERE ${pkFilter}`;

		return;
	}

	throw new ChangeRejectedError(`operation not allowed: ${operation}`);
};
