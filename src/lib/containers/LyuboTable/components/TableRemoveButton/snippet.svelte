<script lang="ts" module>
	import type { ITableRemoveButtonProps } from './types';
	import TableFavoriteButton from './TableRemoveButton.svelte';

	export { TableRemoveButtonSnippet };
</script>

{#snippet TableRemoveButtonSnippet(props: ITableRemoveButtonProps)}
	<TableFavoriteButton {...props} />
{/snippet}
