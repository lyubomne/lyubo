<script lang="ts">
	import { Input } from '$lib/components/ui';
	import { getDB, getUniqueViolationMessage } from '$lib/db';
	import type { EventHandler } from 'svelte/elements';
	import { v4 as uuidv4 } from 'uuid';

	const { collectionId }: { collectionId: string } = $props();

	const dbStore = getDB();

	let error = $state('');

	const handleNewTagSubmit: EventHandler<SubmitEvent, HTMLFormElement> = async (event) => {
		event.preventDefault();

		if (event.currentTarget && dbStore.db) {
			const formData = new FormData(event.currentTarget);

			try {
				await dbStore.db
					.sql` INSERT INTO tags (id, collection_id, name) VALUES (${uuidv4()}, ${collectionId}, ${formData.get('new-tag')})`;
				error = '';
			} catch (err) {
				// The local schema rejects a duplicate name before it reaches the change log
				const message = getUniqueViolationMessage(err);

				if (!message) {
					throw err;
				}

				error = message;
			}
		}
	};
</script>

<form onsubmit={handleNewTagSubmit}>
	<Input name="new-tag" aria-invalid={error ? 'true' : 'false'} oninput={() => (error = '')} />
	{#if error}
		<div class="error" role="alert">{error}</div>
	{/if}
</form>

<style>
</style>
