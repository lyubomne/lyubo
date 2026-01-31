import type { IDataRemoveButtonSnippetRendererProps } from './types';
import { DataRemoveButtonSnippet } from './snippet.svelte';

export const createDataRemoveButtonRenderer = (
	rendererProps: IDataRemoveButtonSnippetRendererProps
) => ({
	renderer: DataRemoveButtonSnippet,
	rendererProps
});
