<script lang="ts">
	import { getDB, updateFieldById } from '$lib/db';
	import type { ITableFavoriteButtonProps } from './types';
	import { Button } from 'bits-ui';

	const { value, name, rowId }: ITableFavoriteButtonProps = $props();

	const dbStore = getDB();

	let localValue = $state(value);

	const commit = () => {
		localValue = !localValue;
		void updateFieldById({ db: dbStore.db, name, value: localValue, rowId });
	};
</script>

<Button.Root onclick={commit}>{localValue}</Button.Root>
