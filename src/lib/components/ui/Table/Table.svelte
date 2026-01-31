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
<div class="table">
	<div class="table-scroll-container">
		<table>
			<TableHead />
			<TableBody />
		</table>
	</div>
</div>

<style>
	.table {
		display: flex;
		min-height: 0;
		position: relative;
		border-radius: var(--radius-16);
		border: var(--border-2) solid var(--color-white);
		box-shadow: 6px 6px 12px 1px var(--color-shadow-2);
	}

	.table:after {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		border-radius: var(--radius-16);
		box-shadow: inset 8px 0 8px -8px var(--color-shadow-1);
	}

	.table-scroll-container {
		width: 100%;
		border-radius: inherit;
		overflow-y: auto;
		overflow-x: hidden;

		&::-webkit-scrollbar {
			width: var(--scrollbar-size);
		}

		&::-webkit-scrollbar-thumb {
			padding-top: 10px;
			background: var(--color-unaccent-2);
			border-radius: var(--radius-16);
		}

		&::-webkit-scrollbar-track {
			background: transparent;
		}
	}

	table {
		border-spacing: 0 0;
		width: 100%;
	}
</style>
