import { rawSql } from '@neon/realtime/server';
import type { TableDescriptor } from './types';

export const tagsTable: TableDescriptor = {
	table: 'tags',
	primaryKey: ['id'],
	writableColumns: ['collection_id', 'name', 'created_at'],
	allow: {
		insert: true,
		update: true,
		delete: true
	},
	liveQuery: rawSql(`SELECT id, collection_id, name, created_at, write_id FROM tags`)
};
