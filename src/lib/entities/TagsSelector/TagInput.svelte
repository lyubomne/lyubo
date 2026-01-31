<script lang="ts">
	import { Input } from '$lib/components/ui';
	import { getDB } from '$lib/db';
	import type { EventHandler } from 'svelte/elements';
	import { v4 as uuidv4 } from 'uuid';

	const dbStore = getDB();

	// TODO: Handle duplicates
	const handleNewTagSubmit: EventHandler<SubmitEvent, HTMLFormElement> = (event) => {
		event.preventDefault();

		if (event.currentTarget && dbStore.db) {
			const formData = new FormData(event.currentTarget);

			void dbStore.db
				.sql` INSERT INTO tags (id, name) VALUES (${uuidv4()}, ${formData.get('new-tag')})`;
		}
	};
</script>

<form onsubmit={handleNewTagSubmit}>
	<Input name="new-tag" />
</form>

<style>
</style>
