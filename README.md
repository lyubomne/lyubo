# Lyubo – SvelteKit Data Management Application

A production‑grade single‑page application built on **SvelteKit**. It provides a
performant interface for managing collections, tags and related entities. The
codebase demonstrates a component‑centric architecture, local persistence
(PGlite via Electric), and extensible synchronization logic delivered through
built‑in Electric endpoints.

---

## Features

- CRUD operations with instant UI feedback.
- Tag management with filtering and validation.
- Custom, extensible data table with inline editing.
- Reusable UI components (inputs, buttons, date picker, icons) implemented in
  Svelte.
- Responsive design.
- Offline‑first local storage using PGlite; incremental sync through Electric API
  routes.
- Validation schemas defined with Zod.

---

## Technology Stack

- **Framework:** SvelteKit
- **Language:** TypeScript
- **Bundler:** Vite
- **Local database:** PGlite (wrapped by custom `liveDB` module)
- **Realtime/Sync:** Electric endpoints and client
- **Testing:** Vitest, @testing-library/svelte

---

## License

This project is licensed under the **AGPL‑3.0** license. See the [LICENSE](LICENSE)
file for details.
