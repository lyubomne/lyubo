<script lang="ts">
	import { getDB } from '$lib/db';
	import { Button } from 'bits-ui';
	import { v4 as uuidv4 } from 'uuid';

	const dbStore = getDB();

	const addNewItem = () => {
		if (!dbStore.db) {
			return;
		}

		void dbStore.db.sql` INSERT INTO lyubo (id)	VALUES (${uuidv4()})`;
	};
</script>

<div class="add-button">
	<Button.Root onclick={addNewItem}><span>add</span></Button.Root>
</div>

<style>
	.add-button {
		display: contents;

		:global {
			button {
				position: relative;
				width: fit-content;
				padding-inline: var(--space-8);
				background: var(--color-surface);
				border: var(--border-2) solid var(--color-white);
				border-radius: var(--radius-4);
				box-shadow:
					inset 4px 4px 8px -8px var(--color-shadow-1),
					inset -4px -4px 8px -8px var(--color-shadow-1),
					6px 6px 12px 1px var(--color-shadow-2);
			}
		}
	}
</style>
