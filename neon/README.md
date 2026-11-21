# Neon

The server side of the sync runs on [Neon](https://neon.com): Postgres (Lakebase) plus Neon
Realtime live queries. `neon.ts` in the project root declares the branch services; it stays there
because the Neon CLI looks for it next to the `.neon` link file.

## Set up a branch

Run the CLI pinned and without analytics, for example
`pnpm dlx neon@<version> <command> --no-analytics`.

1. Link the project and pick a branch. This writes `.neon` and the Neon variables into `.env`:

   ```sh
   neon link --project-id <project-id> -y
   neon checkout <branch> --create
   ```

2. Apply the services in `neon.ts` (Realtime and its allowed origins):

   ```sh
   neon deploy
   ```

3. Create the tables as the database owner:

   ```sh
   psql "$DATABASE_URL_UNPOOLED" -f neon/schema.sql
   ```

4. Create the restricted role the app writes with, and put its pooled URL into `.env` as
   `APP_DATABASE_URL`:

   ```sh
   neon roles create --branch <branch> --name lyubo_app --access read_write
   neon connection-string <branch> --role-name lyubo_app --pooled
   ```

## Notes

- Run `neon/schema.sql` again after every change to it. It is idempotent: tables are created
  only once, and the `CHECK` constraints are dropped and added again, so changed limits reach
  existing tables. Adding a constraint fails if existing rows break it; fix those rows first.
- Every table needs a primary key and no row-level security, otherwise Realtime rejects the
  subscription.
- Add every origin the app runs on to `preview.realtime.allowedOrigins` in `neon.ts`, then run
  `neon deploy` again.
- `neon checkout` and `neon deploy` rewrite only the Neon variables in `.env`. `APP_DATABASE_URL`
  belongs to one branch: update it by hand after switching branches.
