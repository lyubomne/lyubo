<script lang="ts">
	import { getDB, updateFieldById } from '$lib/db';
	import type { ICollectionTableFavoriteButtonProps } from './types';
	import { HeartIcon, IconButton } from '$lib/components/ui';
	import { OptimisticValue } from '$lib/state';

	const { value: dbIsFavorite, name, rowId }: ICollectionTableFavoriteButtonProps = $props();

	const dbStore = getDB();

	// Fast clicks write faster than the live query answers: toggle from what is shown
	const isFavorite = new OptimisticValue(() => dbIsFavorite);

	const commit = async () => {
		try {
			await isFavorite.save(
				// TODO: Do not hardcode tableName, take it from context
				(value) => updateFieldById({ db: dbStore.db, name, value, rowId, tableName: 'lyubo' }),
				!isFavorite.value
			);
		} catch (err) {
			console.error(err);
		}
	};
</script>

<div class={['favorite-button', isFavorite.value && 'favorite']}>
	<IconButton
		icon={HeartIcon}
		onclick={commit}
		aria-label="favorite"
		title={isFavorite.value ? 'unfavorite' : 'favorite'}
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

	.favorite :global {
		svg {
			fill: var(--color-accent-1);
		}
	}
</style>
