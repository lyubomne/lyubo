import { isBelowBreakpoint, isLessThenCurrentBreakpoint } from '$lib/common/breakpoints';
import type { NonNullableRequired } from '$lib/common/types';
import type {
	IBaseTableData,
	ITableActionColumn,
	ITableColumns,
	ITableEpandableRowColumns,
	ITableExpandableColumnConfig
} from './types';

export const isActionColumn = <TTableData extends IBaseTableData>(
	column: ITableColumns<TTableData>
): column is
	| ITableActionColumn<TTableData, 'expand'>
	| ITableActionColumn<TTableData, 'remove'> => {
	return ['actions'].includes(column.name);
};

export const isExpandableColumn = <TTableData extends IBaseTableData>(
	column: ITableColumns<TTableData>
): column is NonNullableRequired<ITableColumns<TTableData>, 'expandable'> => {
	return 'expandable' in column && column.expandable !== undefined;
};

export const prepareColumns = <TTableData extends IBaseTableData>(
	columns: ITableColumns<TTableData>[],
	currentWidth: number
) => {
	const mainColumns: ITableColumns<TTableData>[] = [];
	const expandableRowsColumns: ITableEpandableRowColumns<TTableData> = [];

	if (!currentWidth) {
		return { mainColumns, expandableRowsColumns };
	}

	for (const col of columns) {
		if (!isExpandableColumn(col)) {
			mainColumns.push(col);
			continue;
		}

		let chosen: { config: ITableExpandableColumnConfig; rowIndex: number } | null = null;

		for (let rowIndex = 0; rowIndex < col.expandable.length; rowIndex++) {
			const config = col.expandable[rowIndex];

			if (!config?.breakpoint) {
				continue;
			}

			if (
				isBelowBreakpoint(currentWidth, config.breakpoint) &&
				isLessThenCurrentBreakpoint({
					newBreakpoint: config.breakpoint,
					currentBreakpoint: chosen?.config.breakpoint
				})
			) {
				chosen = { config, rowIndex };
			}
		}

		if (chosen) {
			if (!expandableRowsColumns[chosen.rowIndex]) {
				expandableRowsColumns[chosen.rowIndex] = [];
			}

			expandableRowsColumns[chosen.rowIndex].push({
				...col,
				expandable: [chosen.config]
			});
		} else {
			mainColumns.push(col);
		}
	}

	return { mainColumns, expandableRowsColumns };
};
