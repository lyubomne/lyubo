<script lang="ts">
	import { parseDate, type DateValue } from '@internationalized/date';
	import { DatePicker } from 'bits-ui';
	import {
		IconButton,
		ArrowLeftSmallIcon,
		ArrowRightSmallIcon,
		DotSmallIcon
	} from '$lib/components/ui';
	import { focusNextField } from '$lib/browser';
	import type { IDatePickerProps } from './types';

	const { value, onValueChange, onCommit }: IDatePickerProps = $props();

	const dateValue = $derived(parseDate(value));
	let isOpen = $state(false);
	let inputRef: HTMLElement | null = $state(null);
	let contentRef: HTMLElement | null = $state(null);

	const handleValueChange = (date: DateValue | undefined) => {
		if (date) {
			onValueChange(date.toString());
		}
	};

	/*
	 * Picking a day closes the calendar: that is the end of the edit. bits-ui closes it then without
	 * `onOpenChange`; `onOpenChangeComplete` follows every close. A second save is a no-op.
	 */
	const handleOpenChangeComplete = (isNowOpen: boolean) => {
		if (!isNowOpen) {
			onCommit();
		}
	};

	// No trigger: a click on the digits opens the calendar, the keyboard types them (Alt+↓ opens)
	const handleKeyDown = (event: KeyboardEvent) => {
		if (event.altKey && event.key === 'ArrowDown') {
			event.preventDefault();
			isOpen = true;
		}

		if (event.key === 'Enter' && inputRef) {
			event.preventDefault();
			isOpen = false;
			onCommit();

			const segments = inputRef.querySelectorAll<HTMLElement>(
				'[data-segment]:not([data-segment="literal"])'
			);
			// The closing calendar is still in the DOM, right after the digits
			focusNextField(
				segments[segments.length - 1] ?? inputRef,
				(element) => !contentRef?.contains(element)
			);
		}
	};

	// Moving between the digits, or into the calendar, is still the same edit
	const handleFocusOut = (event: FocusEvent) => {
		const next = event.relatedTarget as Node | null;

		if (!inputRef?.contains(next) && !contentRef?.contains(next)) {
			isOpen = false;
			onCommit();
		}
	};

	// Focus stays in the digits: the calendar is a helper next to them, not a dialog
	const keepFocus = (event: Event) => event.preventDefault();

	const handleInteractOutside = (event: PointerEvent) => {
		if (inputRef?.contains(event.target as Node)) {
			event.preventDefault();
		}
	};
</script>

<div class="datepicker">
	<DatePicker.Root
		weekdayFormat="short"
		fixedWeeks={true}
		value={dateValue}
		onValueChange={handleValueChange}
		onOpenChangeComplete={handleOpenChangeComplete}
		locale="en-GB"
		bind:open={isOpen}
	>
		<DatePicker.Input
			bind:ref={inputRef}
			onpointerdown={() => (isOpen = true)}
			onkeydown={handleKeyDown}
			onfocusout={handleFocusOut}
		>
			{#snippet children({ segments })}
				{#each segments as { part, value }, i (part + i)}
					{#if part === 'literal'}
						<DatePicker.Segment {part}>.</DatePicker.Segment>
					{:else}
						<DatePicker.Segment {part}>
							{value}
						</DatePicker.Segment>
					{/if}
				{/each}
			{/snippet}
		</DatePicker.Input>
		<DatePicker.Content
			bind:ref={contentRef}
			sideOffset={6}
			customAnchor={inputRef}
			trapFocus={false}
			onOpenAutoFocus={keepFocus}
			onCloseAutoFocus={keepFocus}
			onInteractOutside={handleInteractOutside}
		>
			<DatePicker.Calendar>
				{#snippet children({ months, weekdays })}
					<DatePicker.Header>
						<DatePicker.PrevButton>
							<IconButton icon={ArrowLeftSmallIcon} />
						</DatePicker.PrevButton>
						<DatePicker.Heading />
						<DatePicker.NextButton>
							<IconButton icon={ArrowRightSmallIcon} />
						</DatePicker.NextButton>
					</DatePicker.Header>
					{#each months as month (month.value)}
						<DatePicker.Grid>
							<DatePicker.GridHead>
								<DatePicker.GridRow>
									{#each weekdays as day (day)}
										<DatePicker.HeadCell>
											<div>{day.slice(0, 2)}</div>
										</DatePicker.HeadCell>
									{/each}
								</DatePicker.GridRow>
							</DatePicker.GridHead>
							<DatePicker.GridBody>
								{#each month.weeks as weekDates (weekDates)}
									<DatePicker.GridRow>
										{#each weekDates as date (date)}
											<DatePicker.Cell {date} month={month.value}>
												<DatePicker.Day>
													<span class="today-indicator"><DotSmallIcon /></span>
													{date.day}
												</DatePicker.Day>
											</DatePicker.Cell>
										{/each}
									</DatePicker.GridRow>
								{/each}
							</DatePicker.GridBody>
						</DatePicker.Grid>
					{/each}
				{/snippet}
			</DatePicker.Calendar>
		</DatePicker.Content>
	</DatePicker.Root>
</div>

<style>
	.datepicker {
		display: contents;

		:global {
			th {
				text-align: center;
			}

			td {
				height: var(--size-32);
			}

			/* Inter's digits differ in width: tabular ones keep every date and its icon in line */
			[data-date-field-input] {
				display: flex;
				align-items: center;
				padding-inline: var(--space-4);
				border-radius: var(--radius-4);
				font-variant-numeric: tabular-nums;
			}

			[data-date-field-segment] {
				border-radius: var(--radius-4);
			}

			[data-bits-floating-content-wrapper] {
				z-index: 20 !important;
			}

			[data-calendar-root] {
				background: var(--color-surface);
				border: var(--border-2) solid var(--color-white);
				border-radius: var(--radius-8);
				padding: var(--space-4);
				box-shadow: var(--shadow-panel);
				cursor: default;
			}

			[data-calendar-header] {
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin-bottom: var(--space-8);
			}

			[data-calendar-head-cell] {
				width: var(--size-32);
				font-size: var(--font-14);
				font-weight: normal;
				color: var(--color-unaccent-1);
			}

			[data-calendar-cell] {
				border-radius: var(--radius-4);
				position: relative;
			}

			td[data-selected] {
				outline: var(--border-1) solid var(--color-dark);
			}

			[data-calendar-cell]:not([data-disabled]):hover {
				outline: var(--border-1) solid var(--color-accent-1);
			}

			[data-calendar-day] {
				font-variant-numeric: tabular-nums;
				width: 100%;
				display: inline-flex;
				align-items: center;
				justify-content: center;
			}

			[data-disabled] {
				color: var(--color-unaccent-1);
			}

			.today-indicator {
				display: none;
			}

			[data-today] {
				.today-indicator {
					display: inline;
					position: absolute;
					top: calc(-1 * var(--space-4));
				}

				svg {
					fill: var(--color-dark);
				}
			}
		}
	}
</style>
