<script lang="ts" generics="TItem extends Record<string, string>">
	import { ZodError } from 'zod';
	import type { ITableTagsSelectorProps } from './types';
	import { Select } from 'bits-ui';
	import { getDB, updateFieldById } from '$lib/db';
	import TableTag from './TableTag.svelte';
	import IconButton from '$lib/components/Buttons/IconButton.svelte';
	import { DotSmallIcon, DownIcon } from '$lib/components/Icons';

	const {
		validationSchema,
		name,
		value,
		rowId,
		items: originalItems,
		valueKey = 'id',
		labelKey = 'name',
		placeholder = 'Select a tag'
	}: ITableTagsSelectorProps<TItem> = $props();

	const dbStore = getDB();

	const items = $derived(
		originalItems.map((item) => ({ value: item[valueKey], label: item[labelKey] }))
	);

	const selectedTags = $derived(items.filter((item) => value.includes(item.value)) ?? []);

	let error = $state('');

	const commit = async (itemIds: string[]) => {
		try {
			validationSchema?.shape[name].parse(itemIds);
			error = '';

			void updateFieldById({ db: dbStore.db, name, value: itemIds, rowId });
		} catch (err) {
			if (err instanceof ZodError) {
				error = err.issues[0]?.message || 'Invalid value';
			}
		}
	};
</script>

<div class="tags-selector">
	<!-- TODO: Maybe it should be one big select button -->
	{#each selectedTags as selectedTag (selectedTag.value)}
		<TableTag value={selectedTag.label} />
	{/each}
	<Select.Root type="multiple" onValueChange={commit} {items} {value}>
		<Select.Trigger aria-label="Select a tag">
			{#snippet child({ props })}
				<IconButton icon={DownIcon} label={selectedTags.length ? '' : placeholder} {...props} />
			{/snippet}
		</Select.Trigger>
		<Select.Portal>
			<div class="tags-selector-content">
				<Select.Content sideOffset={10}>
					<Select.Viewport>
						{#each items as item, i (i + item.value)}
							<Select.Item label={item.label} value={item.value}>
								{#snippet children({ selected })}
									{item.label}
									{#if selected}
										<DotSmallIcon />
									{/if}
								{/snippet}
							</Select.Item>
						{/each}
					</Select.Viewport>
				</Select.Content>
			</div>
		</Select.Portal>
	</Select.Root>
</div>
{#if error}
	<div class="error" role="alert">{error}</div>
{/if}

<style>
	.tags-selector {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-4);
		font-size: var(--font-14);
		align-items: center;

		:global {
			svg {
				fill: var(--color-unaccent-1);
			}
		}
	}

	.tags-selector-content {
		display: contents;

		:global {
			[data-bits-floating-content-wrapper] {
				z-index: 10 !important;
			}

			[data-select-content] {
				background-color: var(--color-surface);
				border: var(--border-1) solid var(--color-white);
				border-radius: var(--radius-4);
				box-shadow: 0px 8px 8px 0px var(--color-shadow-1);
			}

			[data-select-item] {
				display: flex;
				justify-content: space-between;
				align-items: center;
				gap: var(--space-8);
				margin: var(--space-2);
				padding: var(--space-2);
				border-radius: var(--border-4);
				font-size: var(--font-14);
				cursor: default;
			}

			[data-highlighted] {
				outline: var(--border-1) solid var(--color-accent-1);
			}
		}
	}
</style>
