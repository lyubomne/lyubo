import type { ITableInputSnippetRendererProps } from './types';
import { TableInputSnippet } from './snippet.svelte';

export const createTableInputRenderer = (rendererProps: ITableInputSnippetRendererProps) => ({
	renderer: TableInputSnippet,
	rendererProps
});
