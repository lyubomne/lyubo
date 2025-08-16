<script lang="ts" module>
	import type { ITableFavoriteButtonProps } from './types';
	import TableFavoriteButton from './TableFavoriteButton.svelte';

	export { TableFavoriteButtonSnippet };
</script>

{#snippet TableFavoriteButtonSnippet(props: ITableFavoriteButtonProps)}
	<TableFavoriteButton {...props} />
{/snippet}
