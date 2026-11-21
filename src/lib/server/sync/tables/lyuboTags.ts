import { rawSql } from '@neon/realtime/server';
import type { TableDescriptor } from './types';

export const lyuboTagsTable: TableDescriptor = {
	table: 'lyubo_tags',
	primaryKey: ['lyubo_id', 'tag_id'],
	writableColumns: ['lyubo_id', 'tag_id'],
	allow: {
		insert: true,
		update: false,
		delete: true
	},
	liveQuery: rawSql(`SELECT lyubo_id, tag_id, write_id FROM lyubo_tags`)
};
