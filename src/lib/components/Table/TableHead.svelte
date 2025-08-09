<script lang="ts" generics="TTableData extends IBaseTableData">
	import type { IBaseTableData, ITableProps } from './types';

	const { columns }: Pick<ITableProps<TTableData>, 'columns'> = $props();
</script>

<thead>
	<tr>
		{#each columns as column (column.name)}
			<th>{column.title}</th>
		{/each}
	</tr>
</thead>
