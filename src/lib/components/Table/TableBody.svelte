<script lang="ts">
	import { getNestedValues } from '$lib/common/utils';
	import { getTableContext } from './context.svelte';

	const tableContext = getTableContext();
</script>

<tbody>
	{#each tableContext.data as dataItem (dataItem.id)}
		<tr>
			{#each tableContext.columns as column (column.name)}
				<td>
					{#if column.renderer}
						{@render column.renderer({
							value: getNestedValues(dataItem, column.name),
							name: column.name,
							...column.rendererProps
						})}
						<!-- {column.renderer({ value: getNestedValues(dataItem, column.name), name: column.name })} -->
					{:else}
						{getNestedValues(dataItem, column.name)}
					{/if}
				</td>
			{/each}
		</tr>
	{/each}
</tbody>
