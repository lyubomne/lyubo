import type { Snippet } from 'svelte';

export type IMenuProps = {
	// Renders the key that opens the menu: spread the props onto it
	trigger: Snippet<[Record<string, unknown>]>;
	// The `DropdownMenu` items of bits-ui
	children: Snippet;
	onCloseAutoFocus?: (e: Event) => void;
};
