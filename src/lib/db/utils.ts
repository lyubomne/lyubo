import type { TNillable } from '$lib/common/types';
import type { PGliteWithLive } from '@electric-sql/pglite/live';
import { identifier } from '@electric-sql/pglite/template';

// TODO: Add error handler? Should a consumer handle error? Sigle responsibility
export const updateFieldById = <TValue>({
	db,
	rowId,
	name,
	value
}: {
	db: TNillable<PGliteWithLive>;
	rowId: string;
	name: string;
	value: TValue;
}) => {
	if (!db) {
		return;
	}

	return db.sql`
			UPDATE lyubo
			SET ${identifier`${name}`} = ${value}
			WHERE id = ${rowId}
		`;
};
