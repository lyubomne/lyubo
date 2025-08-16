<script lang="ts">
	import type { ITableFavoriteButtonProps } from './types';
	import { Button } from 'bits-ui';

	const { value, name }: ITableFavoriteButtonProps = $props();

	const commit = () => {
		console.log(name);
	};
</script>

<Button.Root onclick={commit}>{value}</Button.Root>
