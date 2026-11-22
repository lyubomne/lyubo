import type { ICollectionTableNameSnippetRendererProps } from './types';
import { CollectionTableNameSnippet } from './snippet.svelte';

export const createCollectionTableNameRenderer = (
	rendererProps: ICollectionTableNameSnippetRendererProps
) => ({
	renderer: CollectionTableNameSnippet,
	rendererProps
});
