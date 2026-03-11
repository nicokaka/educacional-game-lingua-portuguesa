<script>
  import './app.css';
  import { getRouter } from './lib/router.svelte.js';
  import MenuScreen from './lib/components/screens/MenuScreen.svelte';
  import GameScreen from './lib/components/screens/GameScreen.svelte';
  import EditorPage from './lib/components/editor/EditorPage.svelte';

  let router = getRouter();
</script>

<div id="app">
  {#if router.route === 'menu'}
    <MenuScreen />
  {:else if router.route === 'play'}
    {#key router.params.id}
      <GameScreen moduleId={router.params.id} />
    {/key}
  {:else if router.route === 'editor'}
    <EditorPage />
  {:else}
    <MenuScreen />
  {/if}
</div>
