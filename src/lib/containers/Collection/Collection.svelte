<script lang="ts">
	import { query } from '@electric-sql/pglite/template';
	import { tick } from 'svelte';
	import type { TNillable } from '$lib/common/types';
	import { LiveDB, getDB } from '$lib/db';
	import { CollectionTable, AddButton } from '$lib/entities/CollectionTable';
	import { TagsEditor } from '$lib/entities/TagsEditor';

	// TODO: Show every collection side by side (roadmap stage 3). Until then the first one
	let collectionsDBLive: TNillable<LiveDB<{ id: string }>> = $state();
	const dbStore = getDB();

	// db Listener is not ready yet on this microtask loop. So we need to run live on the next one.
	tick().then(() => {
		if (dbStore.db) {
			collectionsDBLive = new LiveDB<{ id: string }>(
				dbStore.db,
				query`SELECT id FROM collections ORDER BY position, created_at LIMIT 1`
			);
		}
	});

	const collection = $derived(collectionsDBLive?.data[0]);
</script>

{#if collection}
	<!-- The children start their live queries once, for one collection -->
	{#key collection.id}
		<div class="collection-container">
			<div class="collection-actions-panel">
				<TagsEditor collectionId={collection.id} />
				<AddButton collectionId={collection.id} />
			</div>
			<CollectionTable collectionId={collection.id} />
		</div>
	{/key}
{/if}

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
