<script lang="ts" module>
	import type { ITableInputSnippetProps } from './types';
	import TableInput from './TableInput.svelte';

	export { TableInputSnippet };
</script>

{#snippet TableInputSnippet(props: ITableInputSnippetProps)}
	<TableInput {...props} />
{/snippet}
