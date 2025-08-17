<script lang="ts" generics="TTableData extends IBaseTableData">
	import { setTableContext } from './context.svelte';
	import TableBody from './TableBody.svelte';
	import TableHead from './TableHead.svelte';
	import type { IBaseTableData, ITableProps } from './types';

	const { columns, data, expandable }: ITableProps<TTableData> = $props();

	setTableContext(() => ({ data, columns, expandable }));
</script>

<table>
	<TableHead />
	<TableBody />
</table>
