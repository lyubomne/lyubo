<script lang="ts">
	import { getNestedValues } from '$lib/common/utils';
	import { isActionColumn } from './utils';
	import { getTableContext } from './context.svelte';

	const tableContext = getTableContext();
</script>

<!-- TODO: DRY. Move common logic to snippet -->
<tbody>
	{#each tableContext.data as dataItem (dataItem.id)}
		<tr>
			{#each tableContext.columns as column (column.name)}
				<td>
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
				</td>
			{/each}
		</tr>
		{#if tableContext.expandable}
			<tr>
				<td colspan={tableContext.columns.length}>
					{#if tableContext.expandable.renderer}
						{@render tableContext.expandable.renderer({
							value: getNestedValues(dataItem, tableContext.expandable.name),
							name: tableContext.expandable.name,
							rendererProps: tableContext.expandable.rendererProps ?? {},
							rowId: dataItem.id
						})}
					{:else}
						{getNestedValues(dataItem, tableContext.expandable.name)}
					{/if}
				</td>
			</tr>
		{/if}
	{/each}
</tbody>
