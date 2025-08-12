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
}

export interface ITableColumn<TTableData extends IBaseTableData, TKey extends string> {
	name: TKey;
	title: string;
	renderer?: Snippet<[IBaseTableRendererSnippetProps<TTableData, TKey>]>;
	// TODO: Формально это не работает, потому что тебе надо указать уникалный сниппет для каждого случая в массиве
	// Сделать эо ты можешь только на уровне ITableColumns
	// Но там ты опереируешь только ITableData и не можешь задать разные вариации пропсов для сниппетов.
	// Поэтому тут пока видится вариант в лоб, указывать redererProps тут как object,
	// А на месте уже определять различные createInput, createSelector
	rendererProps?: object;
}

export type ITableColumns<TTableData extends IBaseTableData> = {
	[K in keyof TTableData]: ITableColumn<TTableData, Extract<K, string>>;
}[keyof TTableData];

export interface ITableProps<TTableData extends IBaseTableData> {
	columns: ITableColumns<TTableData>[];
	data: TTableData[];
}
