import type { IDataTextAreaSnippetRendererProps } from './types';
import { DataTextAreaSnippet } from './snippet.svelte';

export const createDataTextAreaRenderer = (rendererProps: IDataTextAreaSnippetRendererProps) => ({
	renderer: DataTextAreaSnippet,
	rendererProps
});
