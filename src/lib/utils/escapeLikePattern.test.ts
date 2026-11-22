import { describe, expect, it } from 'vitest';

import { escapeLikePattern } from './escapeLikePattern';

describe('escapeLikePattern', () => {
	it.each([
		{ text: 'drama', expected: 'drama' },
		{ text: '100%', expected: '100\\%' },
		{ text: 'a_b', expected: 'a\\_b' },
		{ text: 'C:\\films', expected: 'C:\\\\films' }
	])('escapes $text', ({ text, expected }) => {
		expect(escapeLikePattern(text)).toBe(expected);
	});
});
