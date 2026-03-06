<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
</script>

<div class="flex items-center border-b border-ide-border bg-ide-panel px-4 py-2">
	<div class="flex items-center gap-[6px]">
		<span class="h-3 w-3 rounded-full bg-[#ff5f56]"></span>
		<span class="h-3 w-3 rounded-full bg-[#ffbd2e]"></span>
		<span class="h-3 w-3 rounded-full bg-[#27c93f]"></span>
	</div>

	<div class="flex flex-1 items-center justify-center gap-2">
		<img src={favicon} alt="Logo" class="h-[18px] w-[18px] rounded-[3px]" />
		<div class="font-sans text-xs text-ide-text-muted">skill-maker &mdash; Agent Skills</div>
	</div>

	<!-- Empty div to balance the flex layout so the title is perfectly centered -->
	<div class="w-[42px]"></div>
</div>
