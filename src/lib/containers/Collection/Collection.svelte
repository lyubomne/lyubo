<script lang="ts">
	import { CollectionTable, AddButton } from '$lib/entities/CollectionTable';
	import { TagsEditor } from '$lib/entities/TagsEditor';
</script>

<div class="collection-container">
	<div class="collection-actions-panel">
		<TagsEditor />
		<AddButton />
	</div>
	<CollectionTable />
</div>

<style>
	.collection-container {
		display: flex;
		flex-direction: column;
		gap: var(--space-8);
	}

	.collection-actions-panel {
		display: flex;
		gap: var(--space-8);
	}
</style>
