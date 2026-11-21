import { rawSql } from '@neon/realtime/server';
import type { TableDescriptor } from './types';

export const lyuboTable: TableDescriptor = {
	table: 'lyubo',
	primaryKey: ['id'],
	writableColumns: [
		'collection_id',
		'name',
		'rating',
		'review',
		'tags',
		'favorite',
		'rated_on',
		'created_at'
	],
	allow: {
		insert: true,
		update: true,
		delete: true
	},
	liveQuery: rawSql(
		`SELECT id, collection_id, name, rating, review, favorite, rated_on, created_at, write_id FROM lyubo`
	)
};
