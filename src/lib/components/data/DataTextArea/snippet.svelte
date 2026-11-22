<script lang="ts" module>
	import type { IDataTextAreaSnippetRendererProps, IDataTextAreaBaseProps } from './types';
	import DataTextArea from './DataTextArea.svelte';

	export { DataTextAreaSnippet };
</script>

{#snippet DataTextAreaSnippet({
	rendererProps,
	...restProps
}: { rendererProps: IDataTextAreaSnippetRendererProps } & IDataTextAreaBaseProps)}
	<DataTextArea {...rendererProps} {...restProps} />
{/snippet}
