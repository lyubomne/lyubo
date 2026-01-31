<script lang="ts" module>
	import type { IDataRemoveButtonBaseProps, IDataRemoveButtonSnippetRendererProps } from './types';
	import DataRemoveButton from './DataRemoveButton.svelte';

	export { DataRemoveButtonSnippet };
</script>

{#snippet DataRemoveButtonSnippet({
	rendererProps,
	...restProps
}: { rendererProps: IDataRemoveButtonSnippetRendererProps } & IDataRemoveButtonBaseProps)}
	<DataRemoveButton {...rendererProps} {...restProps} />
{/snippet}
