<script>
  import './app.css';
  import { getRouter } from './lib/router.svelte.js';
  import ParticlesBackground from './lib/components/ui/ParticlesBackground.svelte';
  import MenuScreen from './lib/components/screens/MenuScreen.svelte';
  import GameScreen from './lib/components/screens/GameScreen.svelte';
  import EditorPage from './lib/components/editor/EditorPage.svelte';
  import OpenTextCorrectionsScreen from './lib/components/screens/OpenTextCorrectionsScreen.svelte';

  let router = getRouter();
  let showStudentParticles = $derived(router.route !== 'editor');
</script>

<div class="app-root">
  {#if showStudentParticles}
    <ParticlesBackground />
  {/if}

  {#if router.route === 'editor'}
    <EditorPage />
  {:else}
    <div class="student-shell">
      {#if router.route === 'menu'}
        <MenuScreen />
      {:else if router.route === 'play'}
        {#key router.params.id}
          <GameScreen moduleId={router.params.id} />
        {/key}
      {:else if router.route === 'reviews'}
        <OpenTextCorrectionsScreen />
      {:else}
        <MenuScreen />
      {/if}
    </div>
  {/if}
</div>

<style>
  .student-shell {
    position: relative;
    z-index: 1;
    width: 100%;
    min-height: 100vh;
  }
</style>
