import type { ZodObject } from 'zod';

export interface ITableTagsSelectorBaseProps {
	name: string;
	value: string[];
}

export interface ITableTagsSelectorRendererProps<TItem extends Record<string, string>> {
	items: TItem[];
	valueKey?: string;
	labelKey?: string;
	placeholder?: string;
	validationSchema?: ZodObject;
}

// TODO: Improve dependency on validationSchema type passed to rendererProps
export type ITableTagsSelectorProps<TItem extends Record<string, string>> =
	ITableTagsSelectorBaseProps & ITableTagsSelectorRendererProps<TItem>;
