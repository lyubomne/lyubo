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

<style>
	table {
		border-spacing: 0 0;
		position: relative;
	}

	table::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: var(--radius-lg);
		box-shadow: 6px 6px 12px 1px var(--color-shadow-2);
		pointer-events: none;
	}

	table {
		:global {
			td,
			th {
				text-align: left;
				padding: var(--space-sm);
			}

			tr {
				background-color: var(--color-surface);
			}
		}
	}
</style>
