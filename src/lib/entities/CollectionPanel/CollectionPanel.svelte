<script lang="ts">
	import { isTextField } from '$lib/common/dom';
	import { ColumnLimits } from '$lib/common/limits';
	import { DataInput } from '$lib/components/data';
	import { TableFocus } from '$lib/components/ui';
	import { getDB } from '$lib/db';
	import { AddButton, CollectionTable, addRecord } from '$lib/entities/CollectionTable';
	import { TagsEditor } from '$lib/entities/TagsEditor';
	import CollectionPanelMenu from './CollectionPanelMenu.svelte';
	import type { ICollectionPanelProps } from './types';
	import { COLLECTION_NAME_INPUT_SELECTOR, UNTITLED_COLLECTION } from './utils';
	import { validationSchema } from './validationSchema';

	const { collection, canMoveLeft, canMoveRight, onMove }: ICollectionPanelProps = $props();

	const dbStore = getDB();
	// Shared by the Add key in the header and the table below it
	const tableFocus = new TableFocus();

	let panelElement = $state<HTMLElement | null>(null);

	const title = $derived(collection.name || UNTITLED_COLLECTION);
	const recordsLabel = $derived(
		collection.record_count === 1 ? '1 record' : `${collection.record_count} records`
	);

	const rename = () => {
		const input = panelElement?.querySelector<HTMLInputElement>(COLLECTION_NAME_INPUT_SELECTOR);

		input?.focus();
		input?.select();
	};

	const handleKeyDown = (e: KeyboardEvent) => {
		if (
			// The key, not the letter: N works on any keyboard layout. Held down, it adds one record
			e.code !== 'KeyN' ||
			e.repeat ||
			e.ctrlKey ||
			e.metaKey ||
			e.altKey ||
			isTextField(e.target) ||
			!(e.target instanceof Node && panelElement?.contains(e.target))
		) {
			return;
		}

		e.preventDefault();
		void addRecord({ db: dbStore.db, collectionId: collection.id, focus: tableFocus });
	};
</script>

<svelte:window onkeydown={handleKeyDown} />

<section
	bind:this={panelElement}
	class="collection-panel"
	aria-label={title}
	data-collection-id={collection.id}
>
	<header class="collection-panel-header">
		<div class="collection-panel-name">
			<DataInput
				tableName="collections"
				name="name"
				rowId={collection.id}
				value={collection.name}
				{validationSchema}
				placeholder={UNTITLED_COLLECTION}
				aria-label="Collection name"
				maxlength={ColumnLimits.collections.name}
			/>
		</div>
		<span class="collection-panel-count" title={recordsLabel}>
			<span aria-hidden="true">{collection.record_count}</span>
			<span class="visually-hidden">{recordsLabel}</span>
		</span>
		<TagsEditor collectionId={collection.id} />
		<CollectionPanelMenu {collection} {canMoveLeft} {canMoveRight} {onMove} onRename={rename} />
		<div class="collection-panel-add">
			<AddButton collectionId={collection.id} focus={tableFocus} />
		</div>
	</header>
	<div class="collection-panel-table">
		<CollectionTable collectionId={collection.id} focus={tableFocus} />
	</div>
</section>

<style>
	.collection-panel {
		position: relative;
		display: flex;
		flex: 0 0 min(100%, var(--size-672));
		flex-direction: column;
		gap: var(--space-8);
		align-self: flex-start;
		box-sizing: border-box;
		max-height: 100%;
		min-height: 0;
		padding: var(--space-8);
		background: var(--color-surface);
		border: var(--border-2) solid var(--color-white);
		border-radius: var(--radius-16);
		box-shadow: var(--shadow-panel);
		scroll-snap-align: start;
	}

	.collection-panel-header {
		display: flex;
		align-items: center;
		gap: var(--space-8);
	}

	.collection-panel-name {
		flex: 1;
		min-width: 0;

		:global(input) {
			height: var(--size-32);
			border-radius: var(--radius-8);
			font-size: var(--font-16);
			font-weight: 600;
			text-overflow: ellipsis;
		}
	}

	.collection-panel-count {
		font-size: var(--font-14);
		font-variant-numeric: tabular-nums;
		color: var(--color-unaccent-1);
	}

	.collection-panel-table {
		display: flex;
		flex: 1 1 auto;
		flex-direction: column;
		min-height: 0;
	}

	/* Breakpoints.sm */
	@media (width < 40rem) {
		/* Full height keeps the Add key in thumb reach */
		.collection-panel {
			flex-basis: 100%;
			align-self: stretch;
		}

		.collection-panel-add {
			--button-size: var(--size-48);

			position: absolute;
			right: var(--space-16);
			bottom: var(--space-16);
			z-index: 20;
		}

		/* The last row scrolls out from under the Add key */
		.collection-panel-table :global(.table-scroll-container) {
			padding-bottom: calc(var(--size-48) + var(--space-32));
		}
	}
</style>
