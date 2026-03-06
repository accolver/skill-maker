<script lang="ts">
	type Tab = { name: string; active?: boolean };

	let { tabs }: { tabs: Tab[] } = $props();
</script>

<div class="flex border-b border-ide-border bg-ide-panel">
	{#each tabs as tab (tab.name)}
		<div
			class="border-r border-ide-border px-5 py-2.5 font-mono text-[13px]
			{tab.active ? 'border-t-2 border-t-ide-accent bg-ide-bg text-ide-white' : 'text-ide-text-muted'}"
		>
			{tab.name}
		</div>
	{/each}
</div>
