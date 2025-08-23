import type { TNestedValue } from '$lib/common/types';
import type { Snippet } from 'svelte';

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

export interface ITableColumn<TTableData extends IBaseTableData, TKey extends string> {
	name: TKey;
	title: string;
	// TODO: Improve type for rendererProps argument inside Snippet
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	renderer?: Snippet<[IBaseTableRendererSnippetProps<TTableData, TKey> & { rendererProps: any }]>;
	rendererProps?: object;
	style?: Partial<CSSStyleDeclaration>;
}

export type ITableActionColumns<TTableData extends IBaseTableData> = {
	name: 'actions';
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	renderer?: Snippet<[{ rowId: TTableData['id']; rendererProps: any }]>;
	rendererProps?: object;
	style?: Partial<CSSStyleDeclaration>;
};

export type ITableColumns<TTableData extends IBaseTableData> =
	| {
			[K in keyof TTableData]: ITableColumn<TTableData, Extract<K, string>>;
	  }[keyof TTableData]
	| ITableActionColumns<TTableData>;

export type ITableExpandableColumns<TTableData extends IBaseTableData> = (
	| {
			[K in keyof TTableData]: Omit<ITableColumn<TTableData, Extract<K, string>>, 'title'>;
	  }[keyof TTableData]
	| ITableActionColumns<TTableData>
) & { colSpan?: number };

export interface ITableProps<TTableData extends IBaseTableData> {
	columns: ITableColumns<TTableData>[];
	data: TTableData[];
	expandableColumns?: ITableExpandableColumns<TTableData>[];
}
