import type { ZodObject } from 'zod';

export interface ITagsSelectorBaseProps {
	rowId: string;
	name: string;
	value: string[];
}

export interface ITagsSelectorRendererProps {
	// The collection of the table: a record gets only tags of its own collection
	collectionId: string;
	valueKey?: string;
	labelKey?: string;
	placeholder?: string;
	validationSchema?: ZodObject;
}

// TODO: Improve dependency on validationSchema type passed to rendererProps
export type ITagsSelectorProps = ITagsSelectorBaseProps & ITagsSelectorRendererProps;
