<script lang="ts" module>
	import type { ITableInputSnippetRendererProps, ITableTagsSelectorBaseProps } from './types';
	import TableInput from './TableInput.svelte';

	export { TableInputSnippet };
</script>

{#snippet TableInputSnippet({
	rendererProps,
	...restProps
}: { rendererProps: ITableInputSnippetRendererProps } & ITableTagsSelectorBaseProps)}
	<TableInput {...rendererProps} {...restProps} />
{/snippet}
