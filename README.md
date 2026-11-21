# Lyubo – Local-First Data Management Application

A production‑grade single‑page application built on **SvelteKit**. It provides a
performant interface for managing collections, tags and related entities. The
codebase demonstrates a component‑centric architecture, local persistence
(PGlite), and synchronization with Postgres on Neon: live queries through Neon
Realtime for reads, and a local change log sent to the app's own API for writes.

---

## Features

- CRUD operations with instant UI feedback.
- Tag management with filtering and validation.
- Custom, extensible data table with inline editing.
- Reusable UI components (inputs, buttons, date picker, icons) implemented in
  Svelte.
- Responsive design.
- Offline‑first local storage using PGlite; live sync from Neon Realtime and a
  write-back API route for local changes.
- Validation schemas defined with Zod.

---

## Technology Stack

- **Framework:** SvelteKit
- **Language:** TypeScript
- **Bundler:** Vite
- **Local database:** PGlite (wrapped by custom `liveDB` module)
- **Server database:** Postgres on Neon (Lakebase)
- **Realtime/Sync:** Neon Realtime live queries, SvelteKit API routes
- **Testing:** Vitest, @testing-library/svelte

---

## License

This project is licensed under the **AGPL‑3.0** license. See the [LICENSE](LICENSE)
file for details.
