<script lang="ts">
	import { ZodError } from 'zod';
	import type { ITableInputSnippetProps } from './types';
	import { Input } from '$lib/components/Input';
	import type { HTMLInputAttributes } from 'svelte/elements';

	const {
		validationSchema,
		name,
		value,
		type = 'text',
		...restProps
	}: HTMLInputAttributes & ITableInputSnippetProps = $props();

	let localValue = $state(String(value ?? ''));
	let error = $state('');

	const validateValue = (e: Event & { currentTarget: EventTarget & HTMLInputElement }) => {
		try {
			validationSchema?.shape[name].parse(
				type === 'number' ? Number(e.currentTarget.value) : e.currentTarget.value
			);
			error = '';
		} catch (err) {
			if (err instanceof ZodError) {
				error = err.issues[0]?.message || 'Invalid value';
			}
		}
	};

	const commit = () => {};

	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === 'Enter') {
			commit();
		}
	};
</script>

<Input
	bind:value={localValue}
	aria-invalid={error ? 'true' : 'false'}
	oninput={validateValue}
	onblur={commit}
	inputmode={type === 'number' ? 'decimal' : undefined}
	autocomplete="off"
	{handleKeyDown}
	{type}
	{...restProps}
/>
{#if error}
	<div class="error" role="alert">{error}</div>
{/if}
