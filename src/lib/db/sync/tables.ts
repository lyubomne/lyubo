import type { ISyncedTable } from './realtimeSync';

// Tables synced from Neon Realtime into `<table>_synced`
export const SYNCED_TABLES: ISyncedTable[] = [
	{ table: 'collections', primaryKey: ['id'] },
	{ table: 'lyubo', primaryKey: ['id'] },
	{ table: 'tags', primaryKey: ['id'] },
	{ table: 'lyubo_tags', primaryKey: ['lyubo_id', 'tag_id'] }
];
