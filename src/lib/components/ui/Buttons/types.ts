import type { Component } from 'svelte';
import type { HTMLButtonAttributes } from 'svelte/elements';

export type IIconButtonSize = 'sm' | 'md';

export type IIconButtonProps = {
	icon: Component;
	class?: string;
	size?: IIconButtonSize;
	label?: string;
} & HTMLButtonAttributes;
