<script lang="ts">
	import { getDB, updateFieldById } from '$lib/db';
	import type { ICollectionTableFavoriteButtonProps } from './types';
	import { HeartIcon, IconButton } from '$lib/components/ui';
	import { PendingWrite } from '$lib/common/pendingWrite';

	const { value: dbIsFavorite, name, rowId }: ICollectionTableFavoriteButtonProps = $props();

	const dbStore = getDB();

	// Fast clicks write faster than the live query answers: show the latest click, not every
	// intermediate DB value, and toggle from what is shown
	const pendingWrite = new PendingWrite<boolean>();
	// Writable derived: follows the DB value of the prop, and `commit` sets it at once
	let localIsFavorite = $derived(pendingWrite.resolve(dbIsFavorite));

	const commit = async () => {
		const value = !localIsFavorite;
		pendingWrite.start(value);
		localIsFavorite = value;

		try {
			// TODO: Do not hardcode tableName, take it from context
			await updateFieldById({ db: dbStore.db, name, value, rowId, tableName: 'lyubo' });
			pendingWrite.finish(dbIsFavorite);
		} catch (err) {
			pendingWrite.fail();
			localIsFavorite = dbIsFavorite;
			console.error(err);
		}
	};
</script>

<div class={['favorite-button', localIsFavorite && 'favorite']}>
	<IconButton
		icon={HeartIcon}
		onclick={commit}
		aria-label="favorite"
		title={localIsFavorite ? 'unfavorite' : 'favorite'}
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
