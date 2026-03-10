<script lang="ts">
	const copyCommand = 'npx skills add accolver/skill-maker --skill skill-maker';

	let copied = $state(false);

	async function copyToClipboard() {
		await navigator.clipboard.writeText(copyCommand);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<div class="flex h-48 flex-shrink-0 flex-col border-t border-ide-border md:h-56">
	<div class="flex items-center justify-between border-b border-ide-border bg-ide-panel px-4">
		<div class="border-b border-syn-cyan py-2 text-[11px] tracking-wider text-ide-white">
			TERMINAL
		</div>
		<button
			onclick={copyToClipboard}
			class="flex cursor-pointer items-center gap-1.5 rounded px-2.5 py-1 text-[11px] text-ide-text-muted transition-colors hover:bg-ide-active hover:text-ide-white"
		>
			{#if copied}
				<svg
					class="h-3.5 w-3.5 text-syn-success"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
				</svg>
				Copied!
			{:else}
				<svg
					class="h-3.5 w-3.5"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
				>
					<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
					<path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
				</svg>
				Copy
			{/if}
		</button>
	</div>
	<div class="flex-1 overflow-y-auto p-4 font-mono text-[13px] leading-relaxed">
		<div>
			<span class="text-syn-comment"># Install skill-maker</span>
		</div>
		<div>
			<span class="text-syn-cyan">~</span>
			<span class="text-ide-text-muted"> $ </span>
			<span class="text-syn-yellow">npx</span>
			<span class="text-ide-text"> skills add accolver/skill-maker --skill skill-maker</span>
		</div>
		<div class="mt-3">
			<span class="text-syn-comment"># Install globally (available in all projects)</span>
		</div>
		<div>
			<span class="text-syn-cyan">~</span>
			<span class="text-ide-text-muted"> $ </span>
			<span class="text-syn-yellow">npx</span>
			<span class="text-ide-text"> skills add accolver/skill-maker --skill skill-maker -g</span>
		</div>
		<div class="mt-3">
			<span class="text-syn-cyan">~</span>
			<span class="text-ide-text-muted"> $ </span>
			<span
				class="inline-block h-[15px] w-[8px] bg-ide-text"
				style="animation: blink 1s step-end infinite"
			></span>
		</div>
	</div>
</div>
