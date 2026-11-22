export interface ITagsSelectorBaseProps {
	rowId: string;
	name: string;
	value: string[];
}

export interface ITagsSelectorRendererProps {
	placeholder?: string;
}

export type ITagsSelectorProps = ITagsSelectorBaseProps & ITagsSelectorRendererProps;
