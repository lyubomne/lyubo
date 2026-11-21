import type { RawSqlQuery } from '@neon/realtime/server';

export type TableDescriptor = {
	table: string;
	primaryKey: string[];
	writableColumns: readonly string[];
	allow: {
		insert: boolean;
		update: boolean;
		delete: boolean;
	};
	// Live query the browser subscribes to. Selects exactly the columns of `<table>_synced`
	liveQuery: RawSqlQuery<unknown>;
};
