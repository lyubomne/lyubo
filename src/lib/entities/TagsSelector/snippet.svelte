<script lang="ts" module>
	import type { ITagsSelectorRendererProps, ITagsSelectorBaseProps } from './types';
	import TagsSelector from './TagsSelector.svelte';

	export { TagsSelectorSnippet };
</script>

{#snippet TagsSelectorSnippet({
	rendererProps,
	...restProps
}: { rendererProps: ITagsSelectorRendererProps } & ITagsSelectorBaseProps)}
	<TagsSelector {...rendererProps} {...restProps} />
{/snippet}
