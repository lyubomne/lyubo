export type TNillable<T> = T | null | undefined;

export type TNestedKeys<TObject extends object> = {
	[K in keyof TObject]: K extends string
		? TObject[K] extends readonly unknown[]
			? K
			: TObject[K] extends object
				? `${K}.${TNestedKeys<TObject[K]>}` | K
				: K
		: never;
}[keyof TObject];

type TSplit<S extends string> = S extends `${infer Head}.${infer Tail}`
	? [Head, ...TSplit<Tail>]
	: [S];

type TNestedValueByKeys<T, K extends readonly string[]> = K extends [
	infer First extends keyof T,
	...infer Rest extends string[]
]
	? Rest['length'] extends 0
		? T[First]
		: TNestedValueByKeys<T[First], Rest>
	: never;

export type TNestedValue<T, K extends string> = TNestedValueByKeys<T, TSplit<K>>;
