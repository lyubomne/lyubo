<script lang="ts">
	import { getNestedValues, styleObjectToString } from '$lib/common/utils';
	import { isActionColumn } from './utils';
	import { getTableContext } from './context.svelte';
	import type { ITableEpandableRowColumn, IBaseTableData, ITableColumns } from './types';

	const tableContext = getTableContext();

	let hoveredGroup = $state<number | null>(null);
</script>

{#snippet TableCell<TTableData extends IBaseTableData>(
	column: ITableColumns<TTableData> | ITableEpandableRowColumn<TTableData>,
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
		{getNestedValues(column, column.name)}
	{/if}
{/snippet}

<tbody>
	{#each tableContext.data as dataItem, index (dataItem.id)}
		<!-- TODO: Higlight the row while editing -->
		<tr
			onmouseenter={() => (hoveredGroup = index)}
			onmouseleave={() => (hoveredGroup = null)}
			class={[hoveredGroup === index && 'hovered-group']}
		>
			{#each tableContext.columns as column (column.name)}
				<td style={styleObjectToString(column.style)}>
					{@render TableCell(column, dataItem)}
				</td>
			{/each}
		</tr>
		<!-- TODO: Potentially we should separate the whole item row if it is expanded -->
		{#if tableContext.expandedRows[dataItem.id]}
			{#each tableContext.expandableRowsColumns as expandableRow, rowIndex (rowIndex)}
				<tr
					onmouseenter={() => (hoveredGroup = index)}
					onmouseleave={() => (hoveredGroup = null)}
					class={['expandable-row', hoveredGroup === index && 'hovered-group']}
				>
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

	tr.hovered-group {
		td {
			box-shadow: none;
		}
	}

	/* Dark shadow for the row immediately before the first hovered row in a group */
	tr:not(.hovered-group):has(+ .hovered-group) {
		box-shadow: inset 0px -4px 8px -4px var(--color-shadow-1);
	}

	/* Bottom shadow for the last hovered row in a group, set to the next sibling to avoid problems with stacking */
	tr.hovered-group + tr:not(.hovered-group) {
		box-shadow: inset 0px 8px 8px -4px var(--color-shadow-1);
	}

	/* Top shadow and border for the first hovered row in a group */
	tr:not(.hovered-group):has(+ .hovered-group) + .hovered-group {
		box-shadow: inset 0 2px 0 0 var(--color-white);
	}

	/* Bottom border for the last hovered row in a group */
	tr.hovered-group:has(+ :not(.hovered-group)) {
		box-shadow: inset 0 -2px 0 0 var(--color-white);
	}

	/* Top and bottom shadows/borders for a hovered row that is both first and last (single row) in a group */
	tr:not(.hovered-group):has(+ .hovered-group) + .hovered-group:has(+ :not(.hovered-group)) {
		box-shadow:
			inset 0 2px 0 0 var(--color-white),
			inset 0 -2px 0 0 var(--color-white),
			0px 8px 8px 0px var(--color-shadow-1);
	}

	/* Shadows/borders for a single hovered row that is the first row of the table */
	tr.hovered-group:first-child:has(+ :not(.hovered-group)) {
		box-shadow:
			0 8px 8px 0px var(--color-shadow-1),
			inset 0 -2px 0 0 var(--color-white);

		td {
			box-shadow: none;
		}
	}

	/* Remove inner shadows from cells for the first row of a multi-row hovered group */
	tr.hovered-group:first-child:has(+ .hovered-group) {
		td {
			box-shadow: none;
		}
	}

	/* Remove inner shadows from cells for the last row of a hovered group when hovering */
	tr.hovered-group:hover:last-child,
	tr.hovered-group:hover ~ .hovered-group:last-child {
		td {
			box-shadow: none;
		}
	}

	.hovered-group :global {
		input {
			box-shadow: inset 2px 2px 2px 0px var(--color-shadow-1);
		}

		input:not(:focus-visible) {
			outline: var(--border-2) solid var(--color-white);
		}
	}
</style>
