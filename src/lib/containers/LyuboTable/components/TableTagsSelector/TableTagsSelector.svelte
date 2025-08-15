<script lang="ts" generics="TItem extends Record<string, string>">
	import { ZodError } from 'zod';
	import type { ITableTagsSelectorProps } from './types';
	import { Select } from 'bits-ui';

	const {
		validationSchema,
		name,
		value,
		items: originalItems,
		valueKey = 'id',
		labelKey = 'name',
		placeholder = 'Select'
	}: ITableTagsSelectorProps<TItem> = $props();

	const items = $derived(
		originalItems.map((item) => ({ value: item[valueKey], label: item[labelKey] }))
	);

	const selectedLabel = $derived(
		value.length
			? items
					.filter((item) => value.includes(item.value))
					.map((item) => item.label)
					.join(', ')
			: placeholder
	);

	let error = $state('');

	const commit = (itemIds: string[]) => {
		try {
			validationSchema?.shape[name].parse(itemIds);
			error = '';
		} catch (err) {
			if (err instanceof ZodError) {
				error = err.issues[0]?.message || 'Invalid value';
			}
		}
	};
</script>

<Select.Root type="multiple" onValueChange={commit} {items}>
	<Select.Trigger aria-label="Select a theme">
		{#snippet child({ props })}
			<button {...props}>{selectedLabel}</button>
		{/snippet}
	</Select.Trigger>
	<Select.Portal>
		<Select.Content sideOffset={10}>
			<Select.ScrollUpButton></Select.ScrollUpButton>
			<Select.Viewport>
				{#each items as item, i (i + item.value)}
					<Select.Item label={item.label} value={item.value}>
						{#snippet children({ selected })}
							{item.label}
							{#if selected}
								<!-- TODO: Add icon -->
							{/if}
						{/snippet}
					</Select.Item>
				{/each}
			</Select.Viewport>
			<Select.ScrollDownButton></Select.ScrollDownButton>
		</Select.Content>
	</Select.Portal>
</Select.Root>
{#if error}
	<div class="error" role="alert">{error}</div>
{/if}
