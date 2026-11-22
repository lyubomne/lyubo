import type { Breakpoint } from '$lib/types';
import type { TNestedValue } from '$lib/types';
import type { Snippet } from 'svelte';
import type { TableFocus } from './focus.svelte';

type IActionColumns = 'expand' | 'remove';

export interface IBaseTableData {
	id: string;
}

export interface IBaseTableRendererSnippetProps<
	TTableData extends IBaseTableData,
	TKey extends string
> {
	value: TNestedValue<TTableData, TKey>;
	name: TKey;
	rowId: TTableData['id'];
}
export type ITableExpandableColumnConfig = {
	breakpoint: Breakpoint;
	colSpan?: number;
};

export interface ITableColumn<TTableData extends IBaseTableData, TKey extends string> {
	name: TKey;
	title: string | null;
	// TODO: Improve type for rendererProps argument inside Snippet
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	renderer?: Snippet<[IBaseTableRendererSnippetProps<TTableData, TKey> & { rendererProps: any }]>;
	rendererProps?: object;
	style?: Partial<CSSStyleDeclaration>;
	width?: number;
	expandableRows?: (ITableExpandableColumnConfig[] | null)[];
}

export type ITableActionColumn<TTableData extends IBaseTableData, TKey extends IActionColumns> = {
	name: TKey;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	renderer?: Snippet<[{ rowId: TTableData['id']; rendererProps: any }]>;
	rendererProps?: object;
	style?: Partial<CSSStyleDeclaration>;
	width?: number;
	expandableRows?: (ITableExpandableColumnConfig[] | null)[];
};

export type ITableColumns<TTableData extends IBaseTableData> =
	| {
			[K in keyof TTableData]: ITableColumn<TTableData, Extract<K, string>>;
	  }[keyof TTableData]
	| ITableActionColumn<TTableData, 'expand'>
	| ITableActionColumn<TTableData, 'remove'>;

export interface ITableProps<TTableData extends IBaseTableData> {
	columns: ITableColumns<TTableData>[];
	data: TTableData[];
	// Shown in one row under the header while there is no data
	empty?: Snippet;
	// Lets the owner focus a field of a row, also one that is not rendered yet
	focus?: TableFocus;
}

export type ITableExpandableRowColumn<TTableData extends IBaseTableData> =
	ITableColumns<TTableData> & { currentExpandableColumn: ITableExpandableColumnConfig };

export type ITableExpandableRowColumns<TTableData extends IBaseTableData> =
	(ITableExpandableRowColumn<TTableData> | null)[];

export type ITablePropsWithExpandable<TTableData extends IBaseTableData> = Omit<
	ITableProps<TTableData>,
	'focus'
> & {
	expandableRowsColumns: ITableExpandableRowColumns<TTableData>[];
	focus: TableFocus;
};
