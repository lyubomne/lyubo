<script lang="ts">
	import { getNestedValues, styleObjectToString } from '$lib/common/utils';
	import { isActionColumn } from './utils';
	import { getTableContext } from './context.svelte';
	import type { ITableExpandableColumns, IBaseTableData, ITableColumns } from './types';

	const tableContext = getTableContext();
</script>

{#snippet TableCell<TTableData extends IBaseTableData>(
	column: ITableColumns<TTableData> | ITableExpandableColumns<TTableData>,
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
	{#each tableContext.data as dataItem (dataItem.id)}
		<tr>
			{#each tableContext.columns as column (column.name)}
				<td style={styleObjectToString(column.style)}>
					{@render TableCell(column, dataItem)}
				</td>
			{/each}
		</tr>
		{#if tableContext.expandableColumns && tableContext.expandedRows[dataItem.id]}
			<tr class="expandable-row">
				{#each tableContext.expandableColumns as expandableColumn (expandableColumn.name)}
					<td
						colspan={expandableColumn.colSpan}
						style={styleObjectToString(expandableColumn.style)}
					>
						{@render TableCell(expandableColumn, dataItem)}
					</td>
				{/each}
			</tr>
		{/if}
	{/each}
</tbody>

<style>
	td:first-child {
		padding-left: var(--space-md);
		border-left: var(--border-sm) solid var(--color-white);
	}

	td:last-child {
		padding-right: var(--space-md);
		border-right: var(--border-sm) solid var(--color-white);
	}

	td:only-child {
		padding-inline: var(--space-md);
		border-left: var(--border-sm) solid var(--color-white);
		border-right: var(--border-sm) solid var(--color-white);
	}

	td:first-child,
	td:only-child {
		box-shadow: inset 8px 0 8px -8px var(--color-shadow-1);
	}

	tr:first-child td {
		border-top: var(--border-sm) solid var(--color-white);
		box-shadow: inset 0 8px 8px -8px var(--color-shadow-1);
	}

	tr:first-child td:first-child {
		box-shadow:
			inset 8px 0 8px -8px var(--color-shadow-1),
			inset 0 8px 8px -8px var(--color-shadow-1);
	}

	tr:last-child td {
		border-bottom: var(--border-sm) solid var(--color-white);
	}

	tr:last-child td:first-child {
		border-bottom-left-radius: var(--radius-lg);
		box-shadow: inset 8px 0 8px -8px var(--color-shadow-1);
	}

	tr:last-child td:last-child {
		border-bottom-right-radius: var(--radius-lg);
	}

	tr:last-child td:only-child {
		border-bottom-left-radius: var(--radius-lg);
		border-bottom-right-radius: var(--radius-lg);
	}
</style>
