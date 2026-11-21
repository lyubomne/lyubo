import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	// "localhost" resolves to [::1] only in the dev container, but VS Code forwards the port to
	// 127.0.0.1, so the page in the Windows browser hangs. The URL stays http://localhost:5173
	server: { host: '127.0.0.1' },
	test: {
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					environment: 'browser',
					browser: {
						enabled: true,
						provider: 'playwright',
						instances: [{ browser: 'chromium' }]
					},
					include: ['src/**/*.svelte.test.{js,ts}'],
					exclude: ['src/lib/server/**'],
					setupFiles: ['./vitest-setup-client.ts']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					// PGlite takes seconds to start, more on the slow mounted drive and under parallel load
					hookTimeout: 60_000,
					testTimeout: 30_000,
					include: ['src/**/*.test.{js,ts}'],
					exclude: ['src/**/*.svelte.test.{js,ts}']
				}
			}
		]
	},
	optimizeDeps: {
		exclude: ['@electric-sql/pglite']
	}
});
