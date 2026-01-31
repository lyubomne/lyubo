export interface IDataRemoveButtonBaseProps {
	rowId: string;
}

export interface IDataRemoveButtonSnippetRendererProps {
	tableName: string;
}

// TODO: Improve dependency on validationSchema type passed to rendererProps
export type IDataRemoveButtonSnippetProps = IDataRemoveButtonBaseProps &
	IDataRemoveButtonSnippetRendererProps;
