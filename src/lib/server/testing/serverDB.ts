import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import postgres, { type Sql } from 'postgres';

import SERVER_SCHEMA from '/neon/schema.sql?raw';

export { SERVER_SCHEMA };

export interface IServerDB {
	// Connection string for code that opens its own postgres.js client
	url: string;
	sql: Sql;
	// Restores dropped tables and empties all of them
	reset: () => Promise<void>;
	close: () => Promise<void>;
}

/*
 * The Neon server schema on an in-memory PGlite, served over the Postgres wire protocol, so
 * postgres.js and the server code run unchanged and offline. The role `lyubo_app` is not
 * reproduced: every client connects as the superuser.
 */
export const createServerDB = async (): Promise<IServerDB> => {
	const pglite = await PGlite.create();

	await pglite.exec(SERVER_SCHEMA);

	// Port 0 picks a free port; a few connections leave room for a pool of the code under test
	const server = new PGLiteSocketServer({ db: pglite, port: 0, maxConnections: 10 });

	await server.start();

	const url = `postgres://postgres@${server.getServerConn()}/postgres`;
	const sql = postgres(url, { max: 1 });

	return {
		url,
		sql,
		reset: () => pglite.exec(`${SERVER_SCHEMA}\nTRUNCATE lyubo, tags, lyubo_tags;`).then(() => {}),
		close: async () => {
			await sql.end();
			await server.stop();
			await pglite.close();
		}
	};
};
