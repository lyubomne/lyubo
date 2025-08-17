import type { IBaseTableData, ITableActionColumns, ITableColumns, TableActions } from './types';

export const isActionColumn = <TTableData extends IBaseTableData>(
	column: ITableColumns<TTableData>
): column is ITableActionColumns<TTableData, TableActions> => {
	return (
		typeof column.name === 'string' &&
		(['remove', 'update'] as TableActions[]).includes(column.name as TableActions)
	);
};
