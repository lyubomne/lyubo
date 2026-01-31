import type { IDataInputSnippetRendererProps } from './types';
import { DataInputSnippet } from './snippet.svelte';

export const createDataInputRenderer = (rendererProps: IDataInputSnippetRendererProps) => ({
	renderer: DataInputSnippet,
	rendererProps
});
