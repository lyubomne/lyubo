// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getNestedValues = (object: Record<string, any>, path: string): any => {
	if (typeof path !== 'string') {
		return undefined;
	}
	const keys = path.split('.');
	let result = object;

	for (const key of keys) {
		if (result === null || result === undefined || typeof result !== 'object' || !(key in result)) {
			return undefined;
		}

		result = result[key];
	}

	return result;
};
