<script lang="ts">
	import { getDB } from '$lib/db';
	import type { ITableRemoveButtonProps } from './types';
	import { Button } from 'bits-ui';

	const { rowId }: ITableRemoveButtonProps = $props();

	const dbStore = getDB();

	const remove = () => {
		if (!dbStore?.db) {
			return;
		}

		void dbStore.db.sql`DELETE FROM lyubo WHERE id = ${rowId}`;
	};
</script>

<Button.Root onclick={remove}>Remove</Button.Root>
