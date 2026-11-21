// Limits of one request to /api/sync/changes. The server refuses a larger request, and the client
// splits its change log to stay within them: a refused request rolls back every local write
export const MAX_SYNC_REQUEST_BYTES = 1_048_576;
export const MAX_SYNC_REQUEST_CHANGES = 500;

// Longest text the server accepts per column, in characters. The same numbers are CHECK
// constraints in `neon/schema.sql`; the client validates against them before it writes
export const ColumnLimits = {
	lyubo: { name: 200, review: 20_000 },
	tags: { name: 50 }
} as const;
