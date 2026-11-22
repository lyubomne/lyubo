<script lang="ts">
	import type { ICollectionTableNameSnippetProps } from './types';
	import type { ICollectionTable } from '$lib/entities/CollectionTable';
	import { DataInput } from '$lib/components/data';
	import { getTableContext } from '$lib/components/ui';
	import { getFirstLine } from '$lib/common/text';

	const { rowId, ...restProps }: ICollectionTableNameSnippetProps = $props();

	const tableContext = getTableContext<ICollectionTable>();

	const reviewPreview = $derived(getFirstLine(tableContext.getRow(rowId)?.review));
	// The expanded row shows the whole review
	const isPreviewShown = $derived(reviewPreview !== '' && !tableContext.expandedRows[rowId]);

	const openReview = () => {
		tableContext.expandRow(rowId);
		tableContext.focus.request(rowId, 'review');
	};
</script>

<div class="collection-table-name">
	<DataInput {rowId} {...restProps} />
	{#if isPreviewShown}
		<!-- Out of the tab order: the expand key leads to the same field -->
		<button
			class="collection-table-name-preview"
			tabindex="-1"
			title="Edit review"
			onclick={openReview}
		>
			{reviewPreview}
		</button>
	{/if}
</div>

<style>
	.collection-table-name-preview {
		display: block;
		width: 100%;
		box-sizing: border-box;
		/* Without it the auto table layout widens the Name column to the whole line, past the panel */
		contain: inline-size;
		/* Clear of the field's outline above, tucked into the cell padding below: the row grows little */
		margin-block: var(--space-2) calc(-1 * var(--space-4));
		padding-inline: var(--space-8);
		overflow: hidden;
		font-size: var(--font-12);
		line-height: 1;
		color: var(--color-unaccent-1);
		text-align: left;
		text-overflow: ellipsis;
		white-space: nowrap;
		cursor: text;
	}

	/* A line this low cannot be a 44 px target: on touch the expand key opens the review */
	@media (pointer: coarse) {
		.collection-table-name-preview {
			pointer-events: none;
		}
	}
</style>
