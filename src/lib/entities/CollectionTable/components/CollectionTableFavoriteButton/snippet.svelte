<script lang="ts" module>
	import type { ICollectionTableFavoriteButtonProps } from './types';
	import TableFavoriteButton from './CollectionTableFavoriteButton.svelte';

	export { CollectionTableFavoriteButtonSnippet };
</script>

{#snippet CollectionTableFavoriteButtonSnippet(props: ICollectionTableFavoriteButtonProps)}
	<TableFavoriteButton {...props} />
{/snippet}
