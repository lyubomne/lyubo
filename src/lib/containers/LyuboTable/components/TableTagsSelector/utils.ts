import type { ITableTagsSelectorRendererProps } from './types';
import { TableTagsSelectorSnippet } from './snippet.svelte';

export const createTableTagsSelectorRenderer = <TItem extends Record<string, string>>(
	rendererProps: ITableTagsSelectorRendererProps<TItem>
) => ({
	renderer: TableTagsSelectorSnippet,
	rendererProps
});
