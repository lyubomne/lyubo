<script lang="ts" module>
	import type { ITableDatePickerProps } from './types';
	import TableDatePicker from './TableDatePicker.svelte';

	export { TableDatePickerSnippet };
</script>

{#snippet TableDatePickerSnippet(props: ITableDatePickerProps)}
	<TableDatePicker {...props} />
{/snippet}
