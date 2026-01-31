<script lang="ts" module>
	import type { ITagsSelectorRendererProps, ITagsSelectorBaseProps } from './types';
	import TagsSelector from './TagsSelector.svelte';

	export { TagsSelectorSnippet };
</script>

{#snippet TagsSelectorSnippet<TItem extends Record<string, string>>({
	rendererProps,
	...restProps
}: { rendererProps: ITagsSelectorRendererProps<TItem> } & ITagsSelectorBaseProps)}
	<TagsSelector {...rendererProps} {...restProps} />
{/snippet}
