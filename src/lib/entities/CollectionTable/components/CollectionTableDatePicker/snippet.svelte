<script lang="ts" module>
	import type { ICollectionTableDatePickerProps } from './types';
	import TableDatePicker from './CollectionTableDatePicker.svelte';

	export { CollectionTableDatePickerSnippet };
</script>

{#snippet CollectionTableDatePickerSnippet(props: ICollectionTableDatePickerProps)}
	<TableDatePicker {...props} />
{/snippet}
