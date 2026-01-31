import type { TableDescriptor } from './types';

export const lyuboTable: TableDescriptor = {
	table: 'lyubo',
	primaryKey: ['id'],
	writableColumns: ['name', 'rating', 'review', 'tags', 'favorite', 'watched_on', 'created_at'],
	allow: {
		insert: true,
		update: true,
		delete: true
	}
};
