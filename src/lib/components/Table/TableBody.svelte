<script lang="ts" generics="TTableData extends IBaseTableData">
	import { getNestedValues } from '$lib/common/utils';
	import type { IBaseTableData, ITableProps } from './types';

	const { columns, data }: ITableProps<TTableData> = $props();
</script>

<tbody>
	{#each data as dataItem (dataItem.id)}
		<tr>
			{#each columns as column (column.name)}
				<th>
					{column.renderer?.(getNestedValues(dataItem, column.name)) ??
						getNestedValues(dataItem, column.name)}
				</th>
			{/each}
		</tr>
	{/each}
</tbody>
