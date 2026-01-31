<script lang="ts">
	import { parseDate, type DateValue } from '@internationalized/date';
	import { DatePicker } from 'bits-ui';
	import {
		IconButton,
		ArrowLeftSmallIcon,
		ArrowRightSmallIcon,
		CalendarSmallIcon,
		DotSmallIcon
	} from '$lib/components/ui';

	const {
		value,
		onValueChange
	}: { value: string; onValueChange: (value: DateValue | undefined) => void } = $props();

	let localValue = $derived(parseDate(value));
</script>

<div class="datepicker">
	<DatePicker.Root
		weekdayFormat="short"
		fixedWeeks={true}
		{onValueChange}
		locale="en-GB"
		bind:value={localValue}
	>
		<DatePicker.Input>
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
				<DatePicker.Trigger>
					{#snippet child({ props })}
						<IconButton icon={CalendarSmallIcon} {...props} />
					{/snippet}
				</DatePicker.Trigger>
			{/snippet}
		</DatePicker.Input>
		<DatePicker.Content sideOffset={6}>
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

			[data-date-field-input] {
				display: flex;
			}

			[data-date-field-segment] {
				border-radius: var(--radius-4);
			}

			[data-bits-floating-content-wrapper] {
				z-index: 20 !important;
			}

			[data-calendar-root] {
				background: var(--color-surface);
				border: var(--border-1) solid var(--color-white);
				border-radius: var(--radius-8);
				padding: var(--space-8);
				box-shadow: 0px 8px 8px 0px var(--color-shadow-1);
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
					fill: var(--color-dark-1);
				}
			}

			svg {
				fill: var(--color-white);
				filter: url($lib/components/ui/Filters/shadowFilterContrast.svg#shadow);
			}
		}
	}
</style>
