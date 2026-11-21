// Stable ids, so a failing assertion shows which row it is about
export const LYUBO_ID = '00000000-0000-4000-8000-000000000001';
export const TAG_ID = '00000000-0000-4000-8000-000000000002';
export const OTHER_LYUBO_ID = '00000000-0000-4000-8000-000000000003';
export const WRITE_ID = '00000000-0000-4000-8000-0000000000aa';
export const COLLECTION_ID = '00000000-0000-4000-8000-000000000004';
export const OTHER_COLLECTION_ID = '00000000-0000-4000-8000-000000000005';
export const OTHER_TAG_ID = '00000000-0000-4000-8000-000000000006';
export const SERVER_WRITE_ID = '00000000-0000-4000-8000-0000000000ff';

// Types, not interfaces: they must fit Record<string, unknown> rows
export type IServerCollection = {
	id: string;
	name: string;
	position: number;
	sort_column: string | null;
	sort_direction: string | null;
	created_at: string;
	write_id: string;
};

export type IServerLyubo = {
	id: string;
	collection_id: string;
	name: string;
	rating: string;
	review: string;
	favorite: boolean;
	rated_on: string;
	created_at: string;
	write_id: string;
};

export type IServerTag = {
	id: string;
	collection_id: string;
	name: string;
	created_at: string;
	write_id: string;
};

export type IServerLyuboTag = {
	lyubo_id: string;
	tag_id: string;
	write_id: string;
};

// Complete rows, as the server sends them (the columns of `<table>_synced`)
export const serverCollection = (
	overrides: Partial<IServerCollection> = {}
): IServerCollection => ({
	id: COLLECTION_ID,
	name: '',
	position: 0,
	sort_column: null,
	sort_direction: null,
	created_at: '2026-01-01T00:00:00.000Z',
	write_id: SERVER_WRITE_ID,
	...overrides
});

export const serverLyubo = (overrides: Partial<IServerLyubo> = {}): IServerLyubo => ({
	id: LYUBO_ID,
	collection_id: COLLECTION_ID,
	name: '',
	rating: '0.0',
	review: '',
	favorite: false,
	rated_on: '2026-01-01',
	created_at: '2026-01-01T00:00:00.000Z',
	write_id: SERVER_WRITE_ID,
	...overrides
});

export const serverTag = (overrides: Partial<IServerTag> = {}): IServerTag => ({
	id: TAG_ID,
	collection_id: COLLECTION_ID,
	name: '',
	created_at: '2026-01-01T00:00:00.000Z',
	write_id: SERVER_WRITE_ID,
	...overrides
});

export const serverLyuboTag = (overrides: Partial<IServerLyuboTag> = {}): IServerLyuboTag => ({
	lyubo_id: LYUBO_ID,
	tag_id: TAG_ID,
	write_id: SERVER_WRITE_ID,
	...overrides
});
