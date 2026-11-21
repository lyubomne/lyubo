import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import api from './client';

describe('api.request', () => {
	const fetch = vi.fn<typeof globalThis.fetch>();
	const networkError = new TypeError('fetch failed');

	beforeEach(() => {
		vi.useFakeTimers();
		vi.stubGlobal('fetch', fetch);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
		fetch.mockReset();
	});

	it('sends the data as JSON with the given method', async () => {
		fetch.mockResolvedValue(new Response());

		await api.request('/api/x', 'POST', { a: 1 });

		expect(fetch).toHaveBeenCalledWith(
			expect.stringMatching(/\/api\/x$/),
			expect.objectContaining({
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: '{"a":1}'
			})
		);
	});

	it('returns an HTTP error response as it is, without retrying', async () => {
		fetch.mockResolvedValue(new Response(null, { status: 500 }));

		const response = await api.request('/api/x', 'POST');

		expect(response?.status).toBe(500);
		expect(fetch).toHaveBeenCalledOnce();
	});

	it('retries after a network error with a growing delay', async () => {
		fetch
			.mockRejectedValueOnce(networkError)
			.mockRejectedValueOnce(networkError)
			.mockResolvedValue(new Response());

		const response = api.request('/api/x', 'POST');

		await vi.advanceTimersByTimeAsync(1_100);
		expect(fetch).toHaveBeenCalledTimes(2);

		await vi.advanceTimersByTimeAsync(2_199);
		expect(fetch).toHaveBeenCalledTimes(2);

		await vi.advanceTimersByTimeAsync(1);
		expect(fetch).toHaveBeenCalledTimes(3);
		expect((await response)?.ok).toBe(true);
	});

	it('gives up with no response after 32 retries', async () => {
		fetch.mockRejectedValue(networkError);

		const response = api.request('/api/x', 'POST');
		await vi.runAllTimersAsync();

		expect(await response).toBeUndefined();
		expect(fetch).toHaveBeenCalledTimes(33);
	});
});
