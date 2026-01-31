import type { TNillable } from '$lib/common/types';
import type { ZodObject } from 'zod';

export interface IDataInputBaseProps {
	rowId: string;
	name: string;
	value: TNillable<string | number>;
}

export interface IDataInputSnippetRendererProps {
	tableName: string;
	validationSchema?: ZodObject;
	type?: 'text' | 'number';
	placeholder?: string;
}

// TODO: Improve dependency on validationSchema type passed to rendererProps
export type IDataInputSnippetProps = IDataInputBaseProps & IDataInputSnippetRendererProps;
