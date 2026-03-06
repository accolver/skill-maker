<script lang="ts">
	type FileEntry = { name: string; icon: string; color: string; children?: FileEntry[] };

	const tree: FileEntry[] = [
		{
			name: 'skill-maker',
			icon: '',
			color: '',
			children: [
				{ name: 'SKILL.md', icon: 'M', color: 'text-syn-blue' },
				{
					name: 'scripts',
					icon: '',
					color: '',
					children: [
						{ name: 'grade.ts', icon: 'TS', color: 'text-[#3178c6]' },
						{ name: 'aggregate-benchmark.ts', icon: 'TS', color: 'text-[#3178c6]' },
						{ name: 'detect-plateau.ts', icon: 'TS', color: 'text-[#3178c6]' },
						{ name: 'validate-skill.ts', icon: 'TS', color: 'text-[#3178c6]' }
					]
				},
				{
					name: 'references',
					icon: '',
					color: '',
					children: [
						{ name: 'schemas.md', icon: 'M', color: 'text-syn-blue' },
						{ name: 'spec-summary.md', icon: 'M', color: 'text-syn-blue' }
					]
				},
				{
					name: 'evals',
					icon: '',
					color: '',
					children: [{ name: 'evals.json', icon: '{}', color: 'text-syn-yellow' }]
				}
			]
		}
	];

	let expanded: Record<string, boolean> = $state({
		'skill-maker': true,
		scripts: true,
		references: false,
		evals: false
	});

	function toggle(name: string) {
		expanded[name] = !expanded[name];
	}
</script>

<aside class="hidden w-60 flex-shrink-0 flex-col border-r border-ide-border bg-ide-sidebar md:flex">
	<div class="px-4 py-3 text-[11px] tracking-widest text-ide-text-muted">EXPLORER</div>
	<nav class="flex-1 overflow-y-auto text-[13px]">
		{#snippet renderTree(items: FileEntry[], depth: number)}
			{#each items as item (item.name)}
				{#if item.children}
					<button
						class="flex w-full cursor-pointer items-center gap-1 px-4 py-[3px] text-left text-ide-text hover:bg-ide-active"
						style="padding-left: {depth * 14 + 16}px"
						onclick={() => toggle(item.name)}
					>
						<span class="w-3 text-[10px] text-ide-text-muted"
							>{expanded[item.name] ? '▼' : '▶'}</span
						>
						<span>{item.name}</span>
					</button>
					{#if expanded[item.name]}
						{@render renderTree(item.children, depth + 1)}
					{/if}
				{:else}
					<div
						class="flex items-center gap-1.5 px-4 py-[3px] text-ide-text hover:bg-ide-active"
						style="padding-left: {depth * 14 + 28}px"
					>
						<span class="text-[10px] font-bold {item.color}">{item.icon}</span>
						<span>{item.name}</span>
					</div>
				{/if}
			{/each}
		{/snippet}
		{@render renderTree(tree, 0)}
	</nav>
</aside>
