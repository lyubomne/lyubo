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
): column is NonNullableRequired<ITableColumns<TTableData>, 'expandableRows'> => {
	return 'expandableRows' in column && column.expandableRows !== undefined;
};

export const prepareColumns = <TTableData extends IBaseTableData>(
	columns: ITableColumns<TTableData>[],
	currentWidth: number
) => {
	const mainColumns: ITableColumns<TTableData>[] = [];
	const expandableRowsColumns: ITableEpandableRowColumns<TTableData>[] = [];

	if (!currentWidth) {
		return { mainColumns, expandableRowsColumns };
	}

	for (const col of columns) {
		if (!isExpandableColumn(col)) {
			mainColumns.push(col);
			continue;
		}

		let chosen: { config: ITableExpandableColumnConfig; rowIndex: number } | null = null;

		for (let rowIndex = 0; rowIndex < col.expandableRows.length; rowIndex++) {
			const expandableRow = col.expandableRows[rowIndex];

			if (!expandableRow) {
				continue;
			}

			for (const config of expandableRow) {
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
		}

		if (chosen) {
			if (!expandableRowsColumns[chosen.rowIndex]) {
				expandableRowsColumns[chosen.rowIndex] = [];
			}

			expandableRowsColumns[chosen.rowIndex].push({
				...col,
				currentExpandableColumn: chosen.config
			});
		} else {
			mainColumns.push(col);
		}
	}

	return { mainColumns, expandableRowsColumns };
};
