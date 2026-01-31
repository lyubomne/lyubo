import type { TNillable } from '$lib/common/types';
import type { PGliteWithLive } from '@electric-sql/pglite/live';
import { identifier } from '@electric-sql/pglite/template';

// TODO: Add error handler? Should a consumer handle error?
export const updateFieldById = <TValue>({
	db,
	rowId,
	name,
	value,
	tableName
}: {
	db: TNillable<PGliteWithLive>;
	rowId: string;
	name: string;
	value: TValue;
	tableName: string;
}) => {
	if (!db) {
		return;
	}

	return db.sql`
			UPDATE ${identifier`${tableName}`}
			SET ${identifier`${name}`} = ${value}
			WHERE id = ${rowId}
		`;
};

export const assignRelation = ({
	db,
	table,
	leftKey,
	rightKey,
	leftId,
	rightId
}: {
	db: TNillable<PGliteWithLive>;
	table: string;
	leftKey: string;
	rightKey: string;
	leftId: string;
	rightId: string;
}) => {
	if (!db) return;

	return db.sql`
    INSERT INTO ${identifier`${table}`} (
      ${identifier`${leftKey}`},
      ${identifier`${rightKey}`}
    )
    VALUES (${leftId}, ${rightId})
    ON CONFLICT DO NOTHING
  `;
};

export const unassignRelation = ({
	db,
	table,
	leftKey,
	rightKey,
	leftId,
	rightId
}: {
	db: TNillable<PGliteWithLive>;
	table: string;
	leftKey: string;
	rightKey: string;
	leftId: string;
	rightId: string;
}) => {
	if (!db) return;

	return db.sql`
    DELETE FROM ${identifier`${table}`}
    WHERE ${identifier`${leftKey}`} = ${leftId}
      AND ${identifier`${rightKey}`} = ${rightId}
  `;
};
