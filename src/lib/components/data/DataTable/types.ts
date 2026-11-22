import type { Snippet } from 'svelte';
import type { IBaseTableData, ITableColumns, ITableSort, TableFocus } from '$lib/components/ui';
import type { TSqlFragment } from '$lib/db';

export interface IDataTableProps<TTableData extends IBaseTableData> {
	columns: ITableColumns<TTableData>[];
	// Table or view to read
	name: string;
	// Only rows whose columns equal these values
	filter?: Partial<TTableData>;
	// Only rows that match all these conditions as well
	where?: TSqlFragment[];
	sort?: ITableSort | null;
	onSortChange?: (sort: ITableSort | null) => void;
	// What to order by for a column, instead of the column itself (a collation, a subquery)
	orderBy?: Partial<Record<keyof TTableData, TSqlFragment>>;
	// Shown under the header while no row matches
	empty?: Snippet;
	focus?: TableFocus;
}
