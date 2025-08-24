import type { Breakpoint } from '$lib/common/breakpoints';
import type { NonNullableRequired, TNestedValue } from '$lib/common/types';
import type { Snippet } from 'svelte';

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
	expandable?: (ITableExpandableColumnConfig | null)[];
}

export type ITableActionColumn<TTableData extends IBaseTableData, TKey extends IActionColumns> = {
	name: TKey;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	renderer?: Snippet<[{ rowId: TTableData['id']; rendererProps: any }]>;
	rendererProps?: object;
	style?: Partial<CSSStyleDeclaration>;
	width?: number;
	expandable?: (ITableExpandableColumnConfig | null)[];
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
	// expandableColumns?: ITableExpandableColumns<TTableData>[];
}

export type ITableEpandableRowColumn<TTableData extends IBaseTableData> = NonNullableRequired<
	ITableColumns<TTableData>,
	'expandable'
>;

export type ITableEpandableRowColumns<TTableData extends IBaseTableData> =
	ITableEpandableRowColumn<TTableData>[][];

export type ITablePropsWithExpandable<TTableData extends IBaseTableData> =
	ITableProps<TTableData> & {
		expandableRowsColumns: ITableEpandableRowColumns<TTableData>;
	};
