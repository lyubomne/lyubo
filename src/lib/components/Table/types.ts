import type { TNestedKeys, TNestedValue, TNillable } from '$lib/common/types';
import type { Component } from 'svelte';

export interface IBaseTableData {
	id: string;
}

export interface ITableColumn<
	TTableData extends IBaseTableData,
	TKey extends string = TNestedKeys<TTableData>
> {
	name: TKey;
	title: string;
	renderer?: (value: TNestedValue<TTableData, TKey>) => TNillable<Component | string>;
}

export type ITableColumns<TTableData extends IBaseTableData> = {
	[K in keyof TTableData]: ITableColumn<TTableData, Extract<K, string>>;
}[keyof TTableData];

export interface ITableProps<TTableData extends IBaseTableData> {
	columns: ITableColumns<TTableData>[];
	data: TTableData[];
}
