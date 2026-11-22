import type { TSortDirection } from '$lib/types';

export interface ISortIndicatorProps {
	// Without a direction both triangles show, muted: the control sorts, nothing is sorted yet
	direction?: TSortDirection;
}
