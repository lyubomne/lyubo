<script lang="ts">
	import IconButton from '$lib/components/Buttons/IconButton.svelte';
	import { TrashIcon } from '$lib/components/Icons';
	import { getDB } from '$lib/db';
	import type { ITableRemoveButtonProps } from './types';

	const { rowId }: ITableRemoveButtonProps = $props();

	const dbStore = getDB();

	const remove = () => {
		if (!dbStore?.db) {
			return;
		}

		void dbStore.db.sql`DELETE FROM lyubo WHERE id = ${rowId}`;
	};
</script>

<div class="remove-button">
	<IconButton icon={TrashIcon} onclick={remove} aria-label="remove" title="remove" />
</div>

<style>
	.remove-button {
		display: contents;

		:global {
			svg {
				fill: var(--color-dark-1);
			}
		}
	}
</style>
