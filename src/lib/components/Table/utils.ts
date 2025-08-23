import type {
	IBaseTableData,
	ITableActionColumns,
	ITableColumns,
	ITableExpandableColumns
} from './types';

export const isActionColumn = <TTableData extends IBaseTableData>(
	column: ITableColumns<TTableData> | ITableExpandableColumns<TTableData>
): column is ITableActionColumns<TTableData> => {
	return ['actions'].includes(column.name);
};
