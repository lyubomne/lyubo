<script lang="ts" module>
	import type {
		ICollectionTableNameBaseProps,
		ICollectionTableNameSnippetRendererProps
	} from './types';
	import CollectionTableName from './CollectionTableName.svelte';

	export { CollectionTableNameSnippet };
</script>

{#snippet CollectionTableNameSnippet({
	rendererProps,
	...restProps
}: { rendererProps: ICollectionTableNameSnippetRendererProps } & ICollectionTableNameBaseProps)}
	<CollectionTableName {...rendererProps} {...restProps} />
{/snippet}
