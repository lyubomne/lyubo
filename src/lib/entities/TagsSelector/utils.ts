import type { ITagsSelectorRendererProps } from './types';
import { TagsSelectorSnippet } from './snippet.svelte';

export const createTagsSelectorRenderer = (rendererProps?: ITagsSelectorRendererProps) => ({
	renderer: TagsSelectorSnippet,
	rendererProps
});
