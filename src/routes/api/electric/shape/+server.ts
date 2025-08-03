import type { RequestHandler } from './$types';
import { ELECTRIC_SOURCE_ID, ELECTRIC_SOURCE_SECRET } from '$env/static/private';

export const GET: RequestHandler = async ({ url }) => {
	// Construct the target URL to proxy to
	const originUrl = new URL('/v1/shape', 'https://api.electric-sql.cloud');

	// Copy search params from the incoming request
	url.searchParams.forEach((value, key) => {
		originUrl.searchParams.set(key, value);
	});

	// Add secret parameters from environment
	originUrl.searchParams.set('source_id', ELECTRIC_SOURCE_ID);
	originUrl.searchParams.set('secret', ELECTRIC_SOURCE_SECRET);

	// Proxy the request
	const response = await fetch(originUrl);

	// Clone and sanitize headers
	const headers = new Headers(response.headers);
	headers.delete('content-encoding');
	headers.delete('content-length');

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers
	});
};
