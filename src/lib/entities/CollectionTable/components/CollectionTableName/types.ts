import type { IDataInputBaseProps, IDataInputSnippetRendererProps } from '$lib/components/data';

export type ICollectionTableNameBaseProps = IDataInputBaseProps;

export type ICollectionTableNameSnippetRendererProps = IDataInputSnippetRendererProps;

export type ICollectionTableNameSnippetProps = ICollectionTableNameBaseProps &
	ICollectionTableNameSnippetRendererProps;
