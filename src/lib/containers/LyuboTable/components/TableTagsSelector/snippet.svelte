<script lang="ts" module>
	import type { ITableTagsSelectorRendererProps, ITableTagsSelectorBaseProps } from './types';
	import TableTagsSelector from './TableTagsSelector.svelte';

	export { TableTagsSelectorSnippet };
</script>

{#snippet TableTagsSelectorSnippet<TItem extends Record<string, string>>({
	rendererProps,
	...restProps
}: { rendererProps: ITableTagsSelectorRendererProps<TItem> } & ITableTagsSelectorBaseProps)}
	<TableTagsSelector {...rendererProps} {...restProps} />
{/snippet}
