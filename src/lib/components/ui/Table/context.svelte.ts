import type {
	IBaseTableData,
	ITableExpandableRowColumns,
	ITableProps,
	ITablePropsWithExpandable
} from './types';
import { getContext, setContext } from 'svelte';
import type { TableFocus } from './focus.svelte';

class TableStore<TTableData extends IBaseTableData> {
	columns: ITableProps<TTableData>['columns'];
	data: ITableProps<TTableData>['data'];
	expandableRowsColumns: ITableExpandableRowColumns<TTableData>[];
	expandedRows: Record<string, boolean>;
	focus: TableFocus;
	#rowsById: Map<string, TTableData>;

	constructor(propsFn: () => ITablePropsWithExpandable<TTableData>) {
		this.columns = $derived(propsFn().columns);
		this.data = $derived(propsFn().data);
		this.#rowsById = $derived(new Map(this.data.map((row) => [row.id, row])));
		this.expandableRowsColumns = $derived(propsFn().expandableRowsColumns);
		this.expandedRows = $state({});
		this.focus = $derived(propsFn().focus);
	}

	expandRow(rowId: string) {
		this.expandedRows = { ...this.expandedRows, [rowId]: !this.expandedRows[rowId] };
	}

	// For a renderer that shows another column of its row
	getRow(rowId: string): TTableData | undefined {
		return this.#rowsById.get(rowId);
	}
}

const TABLE_KEY = Symbol('table');

export const setTableContext = <TTableData extends IBaseTableData>(
	accessor: () => ITablePropsWithExpandable<TTableData>
) => setContext(TABLE_KEY, new TableStore(accessor));
export const getTableContext = <TTableData extends IBaseTableData = IBaseTableData>() =>
	getContext<TableStore<TTableData>>(TABLE_KEY);
// For a field that is also used outside a table
export const getTableFocus = (): TableFocus | undefined =>
	getContext<TableStore<IBaseTableData> | undefined>(TABLE_KEY)?.focus;
