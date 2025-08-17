<script lang="ts">
	import { getDB, updateFieldById } from '$lib/db';
	import type { ITableFavoriteButtonProps } from './types';
	import { Button } from 'bits-ui';

	const { value, name, rowId }: ITableFavoriteButtonProps = $props();

	const dbStore = getDB();

	const commit = () => {
		void updateFieldById({ db: dbStore.db, name, value: !value, rowId });
	};
</script>

<Button.Root onclick={commit}>{value}</Button.Root>
