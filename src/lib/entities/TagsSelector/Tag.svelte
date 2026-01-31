<script lang="ts">
	const { value }: { value: string } = $props();
</script>

<div class="tag-item">{value}</div>

<style>
	.tag-item {
		line-height: var(--size-10);
		padding: var(--space-4);
		border: var(--border-1) solid var(--color-white);
		border-radius: var(--radius-8);
		background-color: oklch(from var(--color-surface) 1 c h / 0.4);
		box-shadow: 0 2px 2px 0 var(--color-shadow-1);
	}
</style>
