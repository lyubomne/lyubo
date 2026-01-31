<script lang="ts">
	import { CollectionTable, AddButton } from '$lib/entities/CollectionTable';
	import { TagsEditor } from '$lib/entities/TagsEditor';
</script>

<div class="collecton-container">
	<div class="collecton-actions-panel">
		<TagsEditor />
		<AddButton />
	</div>
	<CollectionTable />
</div>

<style>
	.collecton-container {
		display: flex;
		flex-direction: column;
		gap: var(--space-8);
	}

	.collecton-actions-panel {
		display: flex;
		gap: var(--space-8);
	}
</style>
