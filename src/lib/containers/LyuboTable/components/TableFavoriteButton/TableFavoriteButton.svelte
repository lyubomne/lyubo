<script lang="ts">
	import { getDB, updateFieldById } from '$lib/db';
	import type { ITableFavoriteButtonProps } from './types';
	import { LikeIcon } from '$lib/components/Icons';
	import { IconButton } from '$lib/components/Buttons';

	const { value, name, rowId }: ITableFavoriteButtonProps = $props();

	const dbStore = getDB();

	let localValue = $state(value);

	const commit = () => {
		localValue = !localValue;
		void updateFieldById({ db: dbStore.db, name, value: localValue, rowId });
	};
</script>

<IconButton icon={LikeIcon} active={localValue} onclick={commit} aria-label="favorite" />
