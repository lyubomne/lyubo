import { describe, expect, it } from 'vitest';

import { getNestedValues } from './getNestedValues';

describe('getNestedValues', () => {
	const object = { a: { b: { c: 1 } }, empty: null };

	it.each([
		{ path: 'a.b.c', expected: 1 },
		{ path: 'a.b', expected: { c: 1 } },
		{ path: 'a.x.c', expected: undefined },
		{ path: 'empty.b', expected: undefined },
		{ path: 'a.b.c.d', expected: undefined }
	])('reads $path as $expected', ({ path, expected }) => {
		expect(getNestedValues(object, path)).toEqual(expected);
	});
});
