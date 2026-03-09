<script lang="ts">
	const REPO = 'https://github.com/accolver/skill-maker';
	const SPEC = 'https://agentskills.io';
</script>

<div class="flex-1 overflow-y-auto px-6 py-6 font-mono text-sm leading-relaxed md:px-10">
	<!-- Title block -->
	<h1 class="mb-1 text-2xl font-bold text-syn-blue md:text-3xl">
		<span class="text-ide-text-muted">#</span> skill-maker
	</h1>
	<p class="mb-6 text-base text-ide-text">
		An <a
			href={SPEC}
			target="_blank"
			rel="noopener noreferrer"
			class="text-syn-cyan underline hover:text-syn-blue">Agent Skill</a
		> that creates other agent skills.
	</p>

	<!-- Example prompts (moved near top) -->
	<div class="mb-8 space-y-2 text-[13px]">
		{#each ['Create a skill for writing git commit messages', 'Build a SKILL.md that helps with data pipeline validation', 'Package this debugging process as a skill'] as prompt (prompt)}
			<div class="rounded border border-ide-border bg-black/20 px-4 py-2">
				<span class="text-syn-comment">$</span>
				<span class="text-syn-string"> &quot;{prompt}&quot;</span>
			</div>
		{/each}
	</div>

	<!-- What it does -->
	<h2 class="mb-3 text-lg font-bold text-syn-blue">
		<span class="text-ide-text-muted">##</span> What it does
	</h2>
	<p class="mb-6 max-w-2xl text-ide-text">
		Skill-maker guides an AI coding agent through the
		<span class="text-syn-green">full skill-creation lifecycle</span>: intent capture, drafting a
		SKILL.md, running an eval loop with isolated subagents, refining based on grading signals, and
		optimizing the trigger description.
	</p>

	<!-- The 5 phases -->
	<h2 class="mb-3 text-lg font-bold text-syn-blue">
		<span class="text-ide-text-muted">##</span> The 5 Phases
	</h2>
	<div class="mb-8 space-y-2">
		{#each [{ n: 1, label: 'Capture Intent', desc: 'Clarify what the skill should do' }, { n: 2, label: 'Draft', desc: 'Generate SKILL.md, scripts, references, assets' }, { n: 3, label: 'Eval Loop', desc: 'Spawn subagents, grade assertions, iterate' }, { n: 4, label: 'Refine', desc: 'Fix failing assertions, improve instructions' }, { n: 5, label: 'Finalize', desc: 'Validate, optimize description, install' }] as phase (phase.n)}
			<div class="flex items-start gap-3">
				<span
					class="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-ide-accent text-xs font-bold text-white"
					>{phase.n}</span
				>
				<div>
					<span class="font-bold text-syn-yellow">{phase.label}</span>
					<span class="text-ide-text-muted"> &mdash; {phase.desc}</span>
				</div>
			</div>
		{/each}
	</div>

	<!-- The eval loop -->
	<h2 class="mb-3 text-lg font-bold text-syn-blue">
		<span class="text-ide-text-muted">##</span> The Eval Loop
	</h2>
	<p class="mb-2 max-w-2xl text-ide-text">The core of skill-maker. For each iteration it:</p>
	<ul class="mb-6 max-w-2xl list-inside space-y-1 text-ide-text">
		<li>
			<span class="text-syn-keyword">spawn</span> isolated subagents per test case
		</li>
		<li>
			<span class="text-syn-keyword">grade</span> assertions with bundled Bun TypeScript scripts
		</li>
		<li>
			<span class="text-syn-keyword">aggregate</span> results into a benchmark
		</li>
		<li>
			<span class="text-syn-keyword">iterate</span> until pass_rate plateaus
			<span class="text-syn-comment">// delta &lt; 2% for 3 consecutive runs</span>
		</li>
	</ul>

	<!-- Benchmark -->
	<h2 class="mb-3 text-lg font-bold text-syn-blue">
		<span class="text-ide-text-muted">##</span> Benchmark
	</h2>
	<p class="mb-3 text-ide-text">
		Evaluated across <span class="font-bold text-syn-number">8</span> skills,
		<span class="font-bold text-syn-number">189</span> assertions
		<span class="text-syn-comment">// with-skill vs without-skill subagent pairs</span>
	</p>

	<!-- Summary stats row -->
	<div class="mb-4 grid grid-cols-3 gap-3 text-center">
		<div class="rounded border border-ide-border bg-black/20 px-3 py-3">
			<div class="text-xl font-bold text-syn-success">100%</div>
			<div class="text-[11px] text-ide-text-muted">with skill</div>
		</div>
		<div class="rounded border border-ide-border bg-black/20 px-3 py-3">
			<div class="text-xl font-bold text-syn-green">+73.6%</div>
			<div class="text-[11px] text-ide-text-muted">avg improvement</div>
		</div>
		<div class="rounded border border-ide-border bg-black/20 px-3 py-3">
			<div class="text-xl font-bold text-syn-number">2.4</div>
			<div class="text-[11px] text-ide-text-muted">avg iterations</div>
		</div>
	</div>

	<!-- Per-skill results -->
	<div class="mb-8 overflow-hidden rounded border border-ide-border font-mono text-sm">
		<table class="w-full">
			<thead>
				<tr class="border-b border-ide-border bg-ide-panel">
					<th class="px-4 py-2 text-left font-semibold text-ide-white">Skill</th>
					<th class="px-4 py-2 text-right font-semibold text-ide-white">Baseline</th>
					<th class="px-4 py-2 text-right font-semibold text-ide-white">Delta</th>
				</tr>
			</thead>
			<tbody>
				{#each [{ name: 'database-migration', baseline: '4.2%', delta: '+95.8%' }, { name: 'pdf-toolkit', baseline: '4.2%', delta: '+95.8%' }, { name: 'error-handling', baseline: '8.3%', delta: '+91.7%' }, { name: 'api-doc-generator', baseline: '16.7%', delta: '+83.3%' }, { name: 'pr-description', baseline: '20.8%', delta: '+79.2%' }, { name: 'changelog-generator', baseline: '20.8%', delta: '+79.2%' }, { name: 'monitoring-setup', baseline: '26.1%', delta: '+73.9%' }, { name: 'code-reviewer', baseline: '41.7%', delta: '+58.3%' }, { name: 'git-conventional-commits', baseline: '72.3%', delta: '+27.7%' }] as skill, i (skill.name)}
					<tr class={i < 8 ? 'border-b border-ide-border' : ''}>
						<td class="px-4 py-1.5 text-syn-cyan">{skill.name}</td>
						<td class="px-4 py-1.5 text-right text-syn-string">{skill.baseline}</td>
						<td class="px-4 py-1.5 text-right font-bold text-syn-success">{skill.delta}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<p class="mb-8 max-w-2xl text-[13px] text-ide-text-muted">
		All skills reach <span class="text-syn-success">100% pass rate</span> after the eval loop. See
		<a
			href="{REPO}/tree/main/examples"
			target="_blank"
			rel="noopener noreferrer"
			class="text-syn-cyan underline hover:text-syn-blue">examples/README.md</a
		> for convergence charts, timing data, and per-skill breakdowns.
	</p>

	<!-- Head-to-head vs official -->
	<h2 class="mb-3 text-lg font-bold text-syn-blue">
		<span class="text-ide-text-muted">##</span> vs Anthropic's official skill-creator
	</h2>
	<p class="mb-3 max-w-2xl text-ide-text">
		Head-to-head benchmark on the 3 highest-delta domains
		<span class="text-syn-comment">// same prompts, same assertions, different skill-creation approach</span>
	</p>
	<div class="mb-3 grid grid-cols-2 gap-3 text-center">
		<div class="rounded border border-ide-border bg-black/20 px-3 py-3">
			<div class="text-xl font-bold text-syn-success">100%</div>
			<div class="text-[11px] text-ide-text-muted">skill-maker</div>
		</div>
		<div class="rounded border border-ide-border bg-black/20 px-3 py-3">
			<div class="text-xl font-bold text-syn-yellow">93.1%</div>
			<div class="text-[11px] text-ide-text-muted">official skill-creator</div>
		</div>
	</div>
	<div class="mb-4 overflow-hidden rounded border border-ide-border font-mono text-sm">
		<table class="w-full">
			<thead>
				<tr class="border-b border-ide-border bg-ide-panel">
					<th class="px-4 py-2 text-left font-semibold text-ide-white">Domain</th>
					<th class="px-4 py-2 text-right font-semibold text-ide-white">Ours</th>
					<th class="px-4 py-2 text-right font-semibold text-ide-white">Official</th>
				</tr>
			</thead>
			<tbody>
				{#each [{ name: 'database-migration', ours: '24/24', official: '21/24' }, { name: 'error-handling', ours: '24/24', official: '22/24' }, { name: 'pdf-toolkit', ours: '24/24', official: '24/24' }] as row, i (row.name)}
					<tr class={i < 2 ? 'border-b border-ide-border' : ''}>
						<td class="px-4 py-1.5 text-syn-cyan">{row.name}</td>
						<td class="px-4 py-1.5 text-right font-bold text-syn-success">{row.ours}</td>
						<td class="px-4 py-1.5 text-right text-syn-yellow">{row.official}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<p class="mb-8 max-w-2xl text-[13px] text-ide-text-muted">
		Edge from <span class="text-syn-green">"Common mistakes" sections</span> and reasoning-based
		instructions. See the
		<a
			href="{REPO}/tree/main/workspaces/head-to-head/REPORT.md"
			target="_blank"
			rel="noopener noreferrer"
			class="text-syn-cyan underline hover:text-syn-blue">full comparison report</a
		> for per-assertion breakdowns and failure analysis.
	</p>

	<!-- CTA -->
	<div class="mb-12 flex flex-wrap gap-4">
		<a
			href={REPO}
			target="_blank"
			rel="noopener noreferrer"
			class="inline-flex items-center gap-2 rounded-md bg-ide-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#005a9e]"
		>
			<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
				<path
					d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"
				/>
			</svg>
			View on GitHub
		</a>
		<a
			href={SPEC}
			target="_blank"
			rel="noopener noreferrer"
			class="inline-flex items-center gap-2 rounded-md border border-ide-border px-6 py-3 text-sm font-semibold text-ide-text transition-colors hover:border-ide-accent hover:text-ide-white"
		>
			Agent Skills Spec
		</a>
	</div>
</div>
