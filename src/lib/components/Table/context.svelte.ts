import type { IBaseTableData, ITableProps, ITablePropsWithExpandable } from './types';
import { getContext, setContext } from 'svelte';

class TableStore<TTableData extends IBaseTableData> {
	columns: ITableProps<TTableData>['columns'];
	data: ITableProps<TTableData>['data'];
	expandableRowsColumns: ITableProps<TTableData>['columns'][];
	expandedRows: Record<string, boolean>;

	constructor(propsFn: () => ITablePropsWithExpandable<TTableData>) {
		this.columns = $derived(propsFn().columns);
		this.data = $derived(propsFn().data);
		this.expandableRowsColumns = $derived(propsFn().expandableRowsColumns);
		this.expandedRows = $state({});
	}

	expandRow(rowId: string) {
		this.expandedRows = { ...this.expandedRows, [rowId]: !this.expandedRows[rowId] };
	}
}

const TABLE_KEY = Symbol('table');

export const setTableContext = <TTableData extends IBaseTableData>(
	accessor: () => ITablePropsWithExpandable<TTableData>
) => setContext(TABLE_KEY, new TableStore(accessor));
export const getTableContext = () => getContext<ReturnType<typeof setTableContext>>(TABLE_KEY);
