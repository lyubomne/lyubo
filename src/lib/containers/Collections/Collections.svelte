<script lang="ts">
	import { query } from '@electric-sql/pglite/template';
	import { tick } from 'svelte';
	import type { TNillable } from '$lib/types';
	import { Button, PlusIcon } from '$lib/components/ui';
	import { LiveDB, getDB } from '$lib/db';
	import {
		CollectionPanel,
		UNTITLED_COLLECTION,
		addCollection,
		moveCollection,
		type ICollectionMoveOffset,
		type ICollectionSummary
	} from '$lib/entities/CollectionPanel';
	import { NewCollectionSlot } from '$lib/entities/NewCollectionSlot';

	let collectionsDBLive: TNillable<LiveDB<ICollectionSummary>> = $state();
	const dbStore = getDB();

	// db Listener is not ready yet on this microtask loop. So we need to run live on the next one.
	tick().then(() => {
		if (dbStore.db) {
			collectionsDBLive = new LiveDB<ICollectionSummary>(
				dbStore.db,
				query`
					SELECT
						c.id,
						c.name,
						c.position,
						c.sort_column,
						c.sort_direction,
						(SELECT count(*)::integer FROM lyubo l WHERE l.collection_id = c.id) AS record_count
					FROM collections c
					ORDER BY c.position, c.created_at, c.id
				`
			);
		}
	});

	const collections = $derived(collectionsDBLive?.data ?? []);

	let rackElement = $state<HTMLElement | null>(null);
	let tabsElement = $state<HTMLElement | null>(null);
	let rackWidth = $state(0);
	let visiblePanels = $state<number[]>([]);

	const getPanels = () =>
		Array.from(rackElement?.querySelectorAll<HTMLElement>(':scope > [data-collection-id]') ?? []);

	const updateVisiblePanels = () => {
		if (!rackElement) {
			return;
		}

		const { scrollLeft, clientWidth } = rackElement;

		// A pixel of slack for fractional scroll positions
		visiblePanels = getPanels().flatMap((panel, index) =>
			panel.offsetLeft >= scrollLeft - 1 &&
			panel.offsetLeft + panel.offsetWidth <= scrollLeft + clientWidth + 1
				? [index]
				: []
		);
	};

	// A moved panel may leave the view: it is shown again once the new order is rendered
	let pendingMove: { id: string; index: number } | null = null;

	// Visibility also changes with layout, not only with scrolling
	$effect(() => {
		void collections;
		void rackWidth;

		if (pendingMove && collections[pendingMove.index]?.id === pendingMove.id) {
			showPanel(pendingMove.index);
			pendingMove = null;
		}

		updateVisiblePanels();
	});

	// On a phone the tabs scroll after two rows: keep the pressed one in view
	$effect(() => {
		void visiblePanels;
		tabsElement
			?.querySelector('[aria-current="true"]')
			?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
	});

	const showPanel = (index: number) => {
		getPanels()[index]?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
	};

	const move = (id: string, offset: ICollectionMoveOffset) => {
		pendingMove = {
			id,
			index: collections.findIndex((collection) => collection.id === id) + offset
		};
		void moveCollection({ db: dbStore.db, collections, id, offset });
	};
</script>

<!-- Rendered once the collections are known, so the empty rack does not flash on every start -->
{#if collectionsDBLive?.hasResult}
	{#if collections.length === 0}
		<div class="collections-empty">
			<NewCollectionSlot />
		</div>
	{:else}
		<div class="collections">
			<div class="collections-bar">
				<nav class="collections-tabs" aria-label="Collections" bind:this={tabsElement}>
					{#each collections as collection, index (collection.id)}
						<Button
							aria-current={visiblePanels.includes(index) ? 'true' : undefined}
							onclick={() => showPanel(index)}
						>
							<span class="collections-tab-label">{collection.name || UNTITLED_COLLECTION}</span>
						</Button>
					{/each}
				</nav>
				<Button
					icon={PlusIcon}
					iconPosition="start"
					onclick={() => void addCollection({ db: dbStore.db })}
				>
					New collection
				</Button>
			</div>

			<div
				class="collections-rack"
				bind:this={rackElement}
				bind:clientWidth={rackWidth}
				onscroll={updateVisiblePanels}
				onscrollend={updateVisiblePanels}
			>
				{#each collections as collection, index (collection.id)}
					<CollectionPanel
						{collection}
						canMoveLeft={index > 0}
						canMoveRight={index < collections.length - 1}
						onMove={(offset) => move(collection.id, offset)}
					/>
				{/each}
			</div>
		</div>
	{/if}
{/if}

<style>
	/* Only whole panels: none is cut off at the edge */
	.collections {
		--rack-gap: var(--space-16);

		display: flex;
		flex-direction: column;
		gap: var(--space-8);
		width: max(
			min(100%, var(--size-672)),
			calc(round(down, 100% + var(--rack-gap), var(--size-672) + var(--rack-gap)) - var(--rack-gap))
		);
		height: 100%;
		min-height: 0;
	}

	.collections-bar {
		display: flex;
		align-items: flex-start;
		gap: var(--space-8);
		padding: var(--space-8);
		background: var(--color-surface);
		border: var(--border-2) solid var(--color-white);
		border-radius: var(--radius-16);
		box-shadow: var(--shadow-panel);
	}

	.collections-tabs {
		display: flex;
		flex: 1;
		flex-wrap: wrap;
		gap: var(--space-8);
		min-width: 0;
	}

	.collections-tab-label {
		max-width: var(--size-150);
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.collections-rack {
		/* Offset parent of the panels, for offsetLeft */
		position: relative;
		display: flex;
		flex: 1;
		gap: var(--rack-gap);
		min-height: 0;
		/* Room for the panel shadows; the negative margin keeps panels in line with the bar */
		margin: calc(-1 * var(--space-8));
		padding: var(--space-8);
		scroll-padding-inline: var(--space-8);
		/* Moved by the tabs and focus only. No smooth scroll: it lags on long jumps */
		overflow: hidden;
		scroll-snap-type: x mandatory;
	}

	.collections-empty {
		display: flex;
		justify-content: center;
		width: 100%;
		height: 100%;
	}

	/* Breakpoints.sm */
	@media (width < 40rem) {
		.collections {
			width: 100%;
		}

		.collections-tabs {
			max-height: calc(2 * var(--size-32) + var(--space-8));
			overflow-y: auto;
		}

		.collections-rack {
			overflow-x: auto;
			overflow-y: hidden;
			scrollbar-width: none;
		}
	}
</style>
