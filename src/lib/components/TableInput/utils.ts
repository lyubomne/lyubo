import { TableInputSnippet } from './snippet.svelte';

export const createTableInputRenderer = (
	// TODO: Improve dependency on name and value in Table
	rendererProps: Omit<Parameters<typeof TableInputSnippet>[0], 'name' | 'value'>
) => ({
	renderer: TableInputSnippet,
	rendererProps
});
