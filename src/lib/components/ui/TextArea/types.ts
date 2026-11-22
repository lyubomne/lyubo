import type { WithElementRef } from '$lib/types';
import type { HTMLTextareaAttributes } from 'svelte/elements';

export type ITextAreaProps = WithElementRef<HTMLTextareaAttributes, HTMLTextAreaElement>;
