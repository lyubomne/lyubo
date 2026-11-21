import { type ParserOptions, types } from '@electric-sql/pglite';

// Result parsers of every PGlite instance of the app.
// A `date` stays the 'YYYY-MM-DD' string Postgres sends. PGlite would turn it into a Date at
// midnight UTC, which shows the day before in time zones west of UTC
export const PGLITE_PARSERS: ParserOptions = {
	[types.DATE]: (value: string) => value
};
