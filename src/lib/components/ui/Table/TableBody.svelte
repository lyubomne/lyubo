<script lang="ts">
	import { getNestedValues, styleObjectToString } from '$lib/utils';
	import { isActionColumn } from './utils';
	import { getTableContext } from './context.svelte';
	import type { ITableExpandableRowColumn, IBaseTableData, ITableColumns } from './types';

	const tableContext = getTableContext();
</script>

{#snippet TableCell<TTableData extends IBaseTableData>(
	column: ITableColumns<TTableData> | ITableExpandableRowColumn<TTableData>,
	dataItem: TTableData
)}
	{#if column.renderer}
		{#if isActionColumn(column)}
			{@render column.renderer({
				rendererProps: column.rendererProps ?? {},
				rowId: dataItem.id
			})}
		{:else}
			{@render column.renderer({
				value: getNestedValues(dataItem, column.name),
				name: column.name,
				rendererProps: column.rendererProps ?? {},
				rowId: dataItem.id
			})}
		{/if}
	{:else}
		{getNestedValues(dataItem, column.name)}
	{/if}
{/snippet}

<tbody>
	{#each tableContext.data as dataItem (dataItem.id)}
		<tr class={[tableContext.expandedRows[dataItem.id] && 'expanded']}>
			{#each tableContext.columns as column (column.name)}
				<td style={styleObjectToString(column.style)}>
					{@render TableCell(column, dataItem)}
				</td>
			{/each}
		</tr>
		<!-- TODO: Potentially we should separate the whole item row if it is expanded -->
		{#if tableContext.expandedRows[dataItem.id]}
			{#each tableContext.expandableRowsColumns as expandableRow, rowIndex (rowIndex)}
				<tr class="expandable-row">
					{#each expandableRow as expandableColumn, index (expandableColumn?.name ?? index)}
						{#if expandableColumn}
							<td
								colspan={expandableColumn.currentExpandableColumn.colSpan || 1}
								style={styleObjectToString(expandableColumn.style)}
							>
								{@render TableCell(expandableColumn, dataItem)}
							</td>
						{/if}
					{/each}
				</tr>
			{/each}
		{/if}
	{/each}
</tbody>

<style>
	td {
		text-align: left;
		/* A cell taller than one line (a review preview) keeps the first line in line with the rest */
		vertical-align: top;
		padding: var(--space-8);
	}

	tr {
		background-color: var(--color-surface);
	}

	td:first-child {
		padding-left: var(--space-16);
	}

	td:last-child {
		padding-right: var(--space-16);
	}

	td:only-child {
		padding-inline: var(--space-16);
	}

	/* Under the header or under another open record, the line above is already there */
	tr.expanded:not(:first-child, .expandable-row + *) {
		box-shadow: inset 0 1px 0 0 var(--color-shadow-1);
	}

	tr.expandable-row:not(:has(+ .expandable-row)) {
		box-shadow: inset 0 -1px 0 0 var(--color-shadow-1);
	}

	/* A date segment is as tall as its field: with focus inside, the rim would cover its ring */
	tr:is(.expanded, .expandable-row, :focus-within)
		:global(:is(input, textarea, [data-date-field-input])) {
		box-shadow: inset 1px 1px 0 0 var(--color-shadow-1);

		&:not(:focus-within) {
			outline: var(--border-2) solid var(--color-white);
		}
	}

	@media (hover: hover) {
		tr:hover :global(:is(input, textarea, [data-date-field-input])) {
			box-shadow: inset 1px 1px 0 0 var(--color-shadow-1);

			&:not(:focus-within) {
				outline: var(--border-2) solid var(--color-white);
			}
		}
	}
</style>
