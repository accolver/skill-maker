<script lang="ts">
	import TitleBar from '$lib/components/TitleBar.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import TabBar from '$lib/components/TabBar.svelte';
	import EditorContent from '$lib/components/EditorContent.svelte';
	import Terminal from '$lib/components/Terminal.svelte';
</script>

<svelte:head>
	<title>skill-maker — The Agent Skill that builds other skills</title>
</svelte:head>

<div class="flex h-screen flex-col bg-ide-bg text-ide-text">
	<!-- macOS-style title bar -->
	<TitleBar />

	<!-- Main IDE layout: sidebar + editor + terminal -->
	<div class="flex min-h-0 flex-1">
		<!-- File tree sidebar (hidden on mobile) -->
		<Sidebar />

		<!-- Main editor panel -->
		<main class="flex min-w-0 flex-1 flex-col">
			<TabBar tabs={[{ name: 'README.md', active: true }, { name: 'benchmark.json' }]} />
			<EditorContent />
			<Terminal />
		</main>
	</div>
</div>
