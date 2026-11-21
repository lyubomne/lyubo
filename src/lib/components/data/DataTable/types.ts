import type { Snippet } from 'svelte';
import type { IBaseTableData, ITableColumns } from '$lib/components/ui';

export interface IDataTableProps<TTableData extends IBaseTableData> {
	columns: ITableColumns<TTableData>[];
	// Table or view to read
	name: string;
	// Only rows whose columns equal these values
	filter?: Partial<TTableData>;
	// Shown under the header while no row matches
	empty?: Snippet;
}
