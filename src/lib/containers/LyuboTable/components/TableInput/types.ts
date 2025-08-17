import type { TNillable } from '$lib/common/types';
import type { ZodObject } from 'zod';

export interface ITableTagsSelectorBaseProps {
	rowId: string;
	name: string;
	value: TNillable<string | number>;
}

export interface ITableInputSnippetRendererProps {
	validationSchema?: ZodObject;
	type?: 'text' | 'number';
}

// TODO: Improve dependency on validationSchema type passed to rendererProps
export type ITableInputSnippetProps = ITableTagsSelectorBaseProps & ITableInputSnippetRendererProps;
