import type { ZodObject } from 'zod';

// TODO: Improve dependency on validationSchema type passed to rendererProps
export interface ITableInputSnippetProps {
	name: string;
	value: string | number;
	validationSchema?: ZodObject;
	type?: 'text' | 'number';
}
