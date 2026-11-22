import prettier from 'eslint-config-prettier';
import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import { fileURLToPath } from 'node:url';
import ts from 'typescript-eslint';
import svelteConfig from './svelte.config.js';

const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url));

// The shared folders under every layer, each with one job (docs/STYLE_GUIDE.md §2)
const SHARED = 'src/lib/{utils,browser,constants,types}';
const APP_IMPORTS = [
	'svelte',
	'$app',
	'$lib/api',
	'$lib/components',
	'$lib/containers',
	'$lib/db',
	'$lib/entities',
	'$lib/server'
].flatMap((name) => [name, `${name}/*`]);
const DOM_GLOBALS = [
	'CSS',
	'Element',
	'HTMLElement',
	'MutationObserver',
	'Node',
	'document',
	'getComputedStyle',
	'localStorage',
	'location',
	'navigator',
	'sessionStorage',
	'window'
];
const NO_DOM = 'No DOM here: code that needs the browser goes into $lib/browser';
const LAYERS_IMPORTS = {
	group: APP_IMPORTS,
	message: 'Shared folders sit below every layer and Svelte'
};
const BROWSER_IMPORTS = { group: ['$lib/browser', '$lib/browser/*'], message: NO_DOM };

export default ts.config(
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	prettier,
	...svelte.configs.prettier,
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node }
		},
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'no-undef': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ caughtErrorsIgnorePattern: '^_', argsIgnorePattern: '^_' }
			]
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser,
				svelteConfig
			}
		}
	},
	{
		files: [`${SHARED}/**/*.ts`],
		rules: { 'no-restricted-imports': ['error', { patterns: [LAYERS_IMPORTS] }] }
	},
	{
		files: ['src/lib/{utils,constants,types}/**/*.ts'],
		rules: {
			'no-restricted-imports': ['error', { patterns: [LAYERS_IMPORTS, BROWSER_IMPORTS] }],
			'no-restricted-globals': ['error', ...DOM_GLOBALS.map((name) => ({ name, message: NO_DOM }))]
		}
	},
	{
		files: ['src/lib/{constants,types}/**/*.ts'],
		rules: {
			'no-restricted-syntax': [
				'error',
				...[
					'FunctionDeclaration',
					'FunctionExpression',
					'ArrowFunctionExpression',
					'ClassDeclaration',
					'ClassExpression'
				].map((selector) => ({
					selector,
					message: 'Only values and types here: a function goes into $lib/utils or $lib/browser'
				}))
			]
		}
	},
	{
		files: ['src/lib/{utils,browser}/**/*.ts'],
		ignores: ['**/index.ts', '**/*.test.ts'],
		rules: {
			'no-restricted-syntax': [
				'error',
				{
					selector:
						"ExportNamedDeclaration[exportKind='value'] ~ ExportNamedDeclaration[exportKind='value']",
					message: 'One function (or class) per file, named after it'
				}
			]
		}
	},
	{
		files: [`${SHARED}/**/*.svelte`, `${SHARED}/**/*.svelte.ts`],
		rules: {
			'no-restricted-syntax': [
				'error',
				{
					selector: 'Program',
					message: 'No components or rune modules in the shared folders'
				}
			]
		}
	}
);
