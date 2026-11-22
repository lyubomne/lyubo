import { describe, expect, it } from 'vitest';
import { getFirstLine } from './getFirstLine';

describe('getFirstLine', () => {
	it('returns the first line of a multi-line text', () => {
		expect(getFirstLine('Slow and heavy.\nThe sound carries it.')).toBe('Slow and heavy.');
	});

	it('skips leading blank lines and trims spaces', () => {
		expect(getFirstLine('\n  \r\n  Slow and heavy.  \nMore')).toBe('Slow and heavy.');
	});

	it('returns an empty string for blank or missing text', () => {
		expect(getFirstLine('  \n\t\n')).toBe('');
		expect(getFirstLine('')).toBe('');
		expect(getFirstLine(null)).toBe('');
		expect(getFirstLine(undefined)).toBe('');
	});
});
