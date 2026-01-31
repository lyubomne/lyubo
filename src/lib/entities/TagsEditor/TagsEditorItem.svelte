<script lang="ts">
	import { DataInput, DataRemoveButton } from '$lib/components/data';
	import type { ITag } from './types';

	const { tag }: { tag: ITag } = $props();
</script>

<div class="tags-editor-item">
	<DataInput value={tag.name} name="name" rowId={tag.id} tableName="tags" />
	<DataRemoveButton rowId={tag.id} tableName="tags" />
</div>

<style>
	.tags-editor-item {
		display: flex;
		align-items: center;
		gap: var(--space-8);
	}
</style>
