<script lang="ts">
	import { getDB, updateFieldById } from '$lib/db';
	import type { ICollectionTableFavoriteButtonProps } from './types';
	import { HeartIcon, IconButton } from '$lib/components/ui';
	import { untrack } from 'svelte';

	const { value: dbIsFavorite, name, rowId }: ICollectionTableFavoriteButtonProps = $props();

	const dbStore = getDB();

	let isCommitting = $state(false);
	let localIsFavorite = $state(dbIsFavorite);
	let committedIsFavorite = $derived.by(() =>
		untrack(() => isCommitting) ? localIsFavorite : dbIsFavorite
	);

	// TODO: Rewrite it. Use id, or number to track the last commit.
	// Otherwise you just can set isCommitting as false while there is another commitment in process
	const commit = async () => {
		isCommitting = true;
		localIsFavorite = !localIsFavorite;

		// TODO: Do not hardcode tableName, take it from context
		await updateFieldById({
			db: dbStore.db,
			name,
			value: localIsFavorite,
			rowId,
			tableName: 'lyubo'
		});
		isCommitting = false;
	};
</script>

<div class={['favorite-button', committedIsFavorite && 'favorite']}>
	<IconButton
		icon={HeartIcon}
		onclick={commit}
		aria-label="favorite"
		title={committedIsFavorite ? 'unfavorite' : 'favorite'}
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
			filter: url($lib/components/ui/Filters/shadowFilterContrast.svg#shadow);
		}
	}

	.favorite :global {
		svg {
			fill: var(--color-accent-1);
		}
	}
</style>
