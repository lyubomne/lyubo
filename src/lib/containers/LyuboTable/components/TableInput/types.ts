import type { ZodObject } from 'zod';

export interface ITableTagsSelectorBaseProps {
	name: string;
	value: string | number;
}

export interface ITableInputSnippetRendererProps {
	validationSchema?: ZodObject;
	type?: 'text' | 'number';
}

// TODO: Improve dependency on validationSchema type passed to rendererProps
export type ITableInputSnippetProps = ITableTagsSelectorBaseProps & ITableInputSnippetRendererProps;
