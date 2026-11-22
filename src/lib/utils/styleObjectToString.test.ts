import { describe, expect, it } from 'vitest';

import { styleObjectToString } from './styleObjectToString';

describe('styleObjectToString', () => {
	it('turns camelCase properties into CSS declarations and skips empty values', () => {
		const result = styleObjectToString({ minWidth: '1rem', color: '', textAlign: 'right' });

		expect(result).toBe('min-width:1rem;text-align:right');
	});

	it('returns an empty string without a style', () => {
		expect(styleObjectToString()).toBe('');
	});
});
