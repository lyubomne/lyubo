<script lang="ts">
	import { pxToRem } from '$lib/browser';
	import { SortIndicator } from '$lib/components/ui';
	import { getTableContext } from './context.svelte';
	import { getNextSort, isActionColumn } from './utils';

	const tableContext = getTableContext();

	const AriaSort = { asc: 'ascending', desc: 'descending' } as const;
</script>

<thead>
	<tr>
		{#each tableContext.columns as column (column.name)}
			{@const direction =
				tableContext.sort?.column === column.name ? tableContext.sort.direction : undefined}
			<th
				style={column.width ? `width: ${pxToRem(column.width)}` : ''}
				aria-sort={direction ? AriaSort[direction] : undefined}
			>
				{#if isActionColumn(column)}
					{null}
				{:else if column.sortable && column.title && tableContext.onSortChange}
					<button
						class="table-sort"
						type="button"
						onclick={() => tableContext.onSortChange?.(getNextSort(tableContext.sort, column.name))}
					>
						{column.title}
						<SortIndicator {direction} />
					</button>
				{:else}
					{column.title}
				{/if}
			</th>
		{/each}
	</tr>
</thead>

<style>
	tr {
		position: sticky;
		top: 0;
		background-color: var(--color-surface);
		z-index: 10;
	}

	/* A step down to the rows: a shade line over the white one, as in Table's header base */
	th {
		text-align: left;
		padding: var(--space-8);
		box-sizing: border-box;
		font-weight: normal;
		border-bottom: var(--border-2) solid var(--color-white);
		box-shadow: inset 0 -1px 0 0 var(--color-shadow-1);
	}

	th:first-child {
		padding-left: var(--space-16);
	}

	th:last-child {
		padding-right: var(--space-16);
	}

	/* A label, not a key: the whole header cell is its hit area */
	.table-sort {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: var(--space-4);
		max-width: 100%;
		border-radius: var(--radius-4);

		&::after {
			content: '';
			position: absolute;
			inset: calc(-1 * var(--space-8));
		}
	}

	@media (pointer: coarse) {
		.table-sort::after {
			top: calc(50% - var(--size-44) / 2);
			bottom: calc(50% - var(--size-44) / 2);
		}
	}

	@media (hover: hover) {
		.table-sort:hover {
			color: var(--color-unaccent-1);
		}
	}
</style>
