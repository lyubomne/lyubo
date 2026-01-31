import type { TableDescriptor } from './types';

export const tagsTable: TableDescriptor = {
	table: 'tags',
	primaryKey: ['id'],
	writableColumns: ['name', 'created_at'],
	allow: {
		insert: true,
		update: true,
		delete: true
	}
};
