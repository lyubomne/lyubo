import { rawSql } from '@neon/realtime/server';
import type { TableDescriptor } from './types';

export const collectionsTable: TableDescriptor = {
	table: 'collections',
	primaryKey: ['id'],
	writableColumns: ['name', 'position', 'sort_column', 'sort_direction', 'created_at'],
	allow: {
		insert: true,
		update: true,
		delete: true
	},
	liveQuery: rawSql(
		`SELECT id, name, position, sort_column, sort_direction, created_at, write_id FROM collections`
	)
};
