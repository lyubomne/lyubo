<script lang="ts">
	import { getDB, updateFieldById } from '$lib/db';
	import type { ITableFavoriteButtonProps } from './types';
	import { HeartIcon } from '$lib/components/Icons';
	import { IconButton } from '$lib/components/Buttons';
	import { untrack } from 'svelte';

	const { value: dbIsFavorite, name, rowId }: ITableFavoriteButtonProps = $props();

	const dbStore = getDB();

	let isCommiting = $state(false);
	let localIsFavorite = $state(dbIsFavorite);
	let commitedIsFavorite = $derived.by(() =>
		untrack(() => isCommiting) ? localIsFavorite : dbIsFavorite
	);

	const commit = async () => {
		isCommiting = true;
		localIsFavorite = !localIsFavorite;
		await updateFieldById({ db: dbStore.db, name, value: localIsFavorite, rowId });
		isCommiting = false;
	};
</script>

<div class={['favorite-button', commitedIsFavorite && 'favorite']}>
	<IconButton
		icon={HeartIcon}
		onclick={commit}
		aria-label="favorite"
		title={commitedIsFavorite ? 'unfavorite' : 'favorite'}
	/>
</div>

<style>
	.favorite-button :global {
		display: contents;

		/* TODO: Maybe it should not be centered */
		button {
			margin-inline: auto;
		}
	}

	:not(.favorite) :global {
		svg {
			fill: var(--color-white);
			filter: url($lib/components/Filters/shadowFilterInactive.svg#shadow);
		}
	}

	.favorite :global {
		svg {
			fill: var(--color-accent-1);
		}
	}
</style>
