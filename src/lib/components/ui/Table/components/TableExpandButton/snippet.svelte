<script lang="ts" module>
	import type { ITableExpandButtonProps } from './types';
	import TableExpandButton from './TableExpandButton.svelte';

	export { TableExpandButtonSnippet };
</script>

{#snippet TableExpandButtonSnippet(props: ITableExpandButtonProps)}
	<TableExpandButton {...props} />
{/snippet}
