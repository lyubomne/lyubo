import type { Component, Snippet } from 'svelte';
import type { HTMLButtonAttributes } from 'svelte/elements';
import type { WithElementRef } from '$lib/types';

export type IIconButtonProps = {
	icon: Component;
	class?: string;
	label?: string;
} & HTMLButtonAttributes;

export type IButtonVariant = 'accent' | 'neutral';

export type IButtonIconPosition = 'start' | 'end';

type IButtonBaseProps = WithElementRef<
	{
		variant?: IButtonVariant;
		class?: string;
	} & Omit<HTMLButtonAttributes, 'class' | 'children'>,
	HTMLButtonElement
>;

// Icon only: needs a name for screen readers and a tooltip (style guide §10)
type IButtonIconProps = IButtonBaseProps & {
	icon: Component;
	children?: undefined;
	'aria-label': string;
	title: string;
	iconPosition?: undefined;
};

type IButtonLabelProps = IButtonBaseProps & {
	icon?: Component;
	iconPosition?: IButtonIconPosition;
	children: Snippet;
};

export type IButtonProps = IButtonIconProps | IButtonLabelProps;
