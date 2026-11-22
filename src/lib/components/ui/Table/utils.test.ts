import { describe, expect, it } from 'vitest';

import type { ITableColumns, ITableExpandableColumnConfig } from './types';
import { getNextSort, prepareColumns } from './utils';

interface IRow {
	id: string;
	name: string;
	rating: number;
}

type TColumn = ITableColumns<IRow>;

const name: TColumn = { name: 'name', title: 'Name' };
const rating = (expandableRows: (ITableExpandableColumnConfig[] | null)[]): TColumn => ({
	name: 'rating',
	title: 'Rating',
	expandableRows
});

describe('prepareColumns', () => {
	it('returns no columns while the width is unknown', () => {
		const result = prepareColumns([name], 0);

		expect(result).toEqual({ mainColumns: [], expandableRowsColumns: [] });
	});

	it('keeps a column in the main row above its breakpoint', () => {
		const column = rating([[{ breakpoint: 'md' }]]);

		const result = prepareColumns([name, column], 1_000);

		expect(result).toEqual({ mainColumns: [name, column], expandableRowsColumns: [] });
	});

	it('moves a column into its expandable row at or below its breakpoint', () => {
		const column = rating([[{ breakpoint: 'md', colSpan: 2 }]]);

		const result = prepareColumns([name, column], 768);

		expect(result).toEqual({
			mainColumns: [name],
			expandableRowsColumns: [
				[{ ...column, currentExpandableColumn: { breakpoint: 'md', colSpan: 2 } }]
			]
		});
	});

	it('uses the smallest breakpoint that matches the width', () => {
		const column = rating([[{ breakpoint: 'lg' }], null, [{ breakpoint: 'sm' }]]);

		const { expandableRowsColumns } = prepareColumns([column], 600);

		expect(expandableRowsColumns[2]).toEqual([
			{ ...column, currentExpandableColumn: { breakpoint: 'sm' } }
		]);
		expect(expandableRowsColumns[0]).toBeUndefined();
	});

	it('moves a full-width column into its expandable row at any width', () => {
		const column = rating([[{ breakpoint: 'fullWidth' }]]);

		const { expandableRowsColumns } = prepareColumns([column], 2_000);

		expect(expandableRowsColumns[0]).toEqual([
			{ ...column, currentExpandableColumn: { breakpoint: 'fullWidth' } }
		]);
	});

	it('prefers a matching breakpoint over full width', () => {
		const column = rating([[{ breakpoint: 'fullWidth' }], [{ breakpoint: 'md' }]]);

		const { expandableRowsColumns } = prepareColumns([column], 700);

		expect(expandableRowsColumns[1]).toEqual([
			{ ...column, currentExpandableColumn: { breakpoint: 'md' } }
		]);
		expect(expandableRowsColumns[0]).toBeUndefined();
	});
});

describe('getNextSort', () => {
	it.each([
		{ name: 'an unsorted table', sort: null, expected: { column: 'name', direction: 'asc' } },
		{
			name: 'another column',
			sort: { column: 'rating', direction: 'desc' } as const,
			expected: { column: 'name', direction: 'asc' }
		},
		{
			name: 'the column ascending',
			sort: { column: 'name', direction: 'asc' } as const,
			expected: { column: 'name', direction: 'desc' }
		},
		{
			name: 'the column descending',
			sort: { column: 'name', direction: 'desc' } as const,
			expected: null
		}
	])('cycles the column of $name', ({ sort, expected }) => {
		expect(getNextSort(sort, 'name')).toEqual(expected);
	});
});
