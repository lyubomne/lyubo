import type { TNillable } from '$lib/types';
import type { ZodObject } from 'zod';

export interface IDataTextAreaBaseProps {
	rowId: string;
	name: string;
	value: TNillable<string>;
}

export interface IDataTextAreaSnippetRendererProps {
	tableName: string;
	validationSchema?: ZodObject;
	placeholder?: string;
	// The same number as the column's CHECK on the server (`ColumnLimits`)
	maxlength?: number;
}

export type IDataTextAreaSnippetProps = IDataTextAreaBaseProps & IDataTextAreaSnippetRendererProps;
