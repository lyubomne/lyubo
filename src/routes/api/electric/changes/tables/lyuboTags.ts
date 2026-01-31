import type { TableDescriptor } from './types';

export const lyuboTagsTable: TableDescriptor = {
	table: 'lyubo_tags',
	primaryKey: ['lyubo_id', 'tag_id'],
	writableColumns: ['lyubo_id', 'tag_id'],
	allow: {
		insert: true,
		update: false,
		delete: true
	}
};
