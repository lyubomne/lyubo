<script lang="ts" generics="TTableData extends IBaseTableData">
	import TableBody from './TableBody.svelte';
	import TableHead from './TableHead.svelte';
	import type { IBaseTableData, ITableProps } from './types';

	const { columns, data }: ITableProps<TTableData> = $props();
</script>

<table>
	<TableHead {columns} />
	<TableBody {columns} {data} />
</table>
