import type { IBaseTableData, ITableProps } from './types';
import { getContext, setContext } from 'svelte';

class TableStore<TTableData extends IBaseTableData> {
	columns: ITableProps<TTableData>['columns'];
	data: ITableProps<TTableData>['data'];
	expandableColumns: ITableProps<TTableData>['expandableColumns'];
	expandedRows: Record<string, boolean>;

	constructor(propsFn: () => ITableProps<TTableData>) {
		this.columns = $derived(propsFn().columns);
		this.data = $derived(propsFn().data);
		this.expandableColumns = $derived(propsFn().expandableColumns);
		this.expandedRows = $state({});
	}

	expandRow(rowId: string) {
		this.expandedRows = { ...this.expandedRows, [rowId]: !this.expandedRows[rowId] };
	}
}

const TABLE_KEY = Symbol('table');

export const setTableContext = <TTableData extends IBaseTableData>(
	accessor: () => ITableProps<TTableData>
) => setContext(TABLE_KEY, new TableStore(accessor));
export const getTableContext = () => getContext<ReturnType<typeof setTableContext>>(TABLE_KEY);
