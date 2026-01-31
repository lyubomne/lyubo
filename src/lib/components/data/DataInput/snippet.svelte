<script lang="ts" module>
	import type { IDataInputSnippetRendererProps, IDataInputBaseProps } from './types';
	import DataInput from './DataInput.svelte';

	export { DataInputSnippet };
</script>

{#snippet DataInputSnippet({
	rendererProps,
	...restProps
}: { rendererProps: IDataInputSnippetRendererProps } & IDataInputBaseProps)}
	<DataInput {...rendererProps} {...restProps} />
{/snippet}
