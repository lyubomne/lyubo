<script lang="ts" generics="TTableData extends IBaseTableData">
	import { prepareColumns } from './utils';
	import { setTableContext } from './context.svelte';
	import TableBody from './TableBody.svelte';
	import TableHead from './TableHead.svelte';
	import type { IBaseTableData, ITableProps } from './types';
	import { throttle } from '$lib/common/utils';

	const { columns, data }: ITableProps<TTableData> = $props();

	let innerWidth = $state(0);

	const setInnerWidth = throttle((width: number) => (innerWidth = width), 500);

	const { mainColumns, expandableRowsColumns } = $derived(prepareColumns(columns, innerWidth));

	setTableContext(() => ({ columns: mainColumns, data, expandableRowsColumns }));
</script>

<svelte:window bind:innerWidth={null, setInnerWidth} />
<table>
	<TableHead />
	<TableBody />
</table>

<style>
	table {
		border-spacing: 0 0;
		position: relative;
	}

	table::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: var(--radius-16);
		box-shadow: 6px 6px 12px 1px var(--color-shadow-2);
		pointer-events: none;
	}

	table {
		:global {
			td,
			th {
				text-align: left;
				padding: var(--space-8);
			}

			tr {
				background-color: var(--color-surface);
			}
		}
	}
</style>
