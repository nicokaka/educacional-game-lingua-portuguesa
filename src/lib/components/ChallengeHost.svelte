<script>
  import { getRenderer } from '../engine/challengeRegistry.js';

  let { challenge, onAnswer, onHint } = $props();

  let RendererComponent = $derived(getRenderer(challenge?.type));
</script>

<div class="challenge-host">
  {#if challenge && RendererComponent}
    <div class="renderer-wrapper" style="animation: slideIn 0.4s ease;">
      <RendererComponent {challenge} {onAnswer} {onHint} />
    </div>
  {:else}
    <div class="no-challenge">
      <p>Nenhum desafio carregado.</p>
    </div>
  {/if}
</div>

<style>
  .challenge-host {
    width: 100%;
    display: flex;
    justify-content: center;
  }

  .renderer-wrapper {
    width: 100%;
    max-width: 700px;
  }

  .no-challenge {
    text-align: center;
    color: var(--color-muted, #94a3b8);
    padding: 2rem;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(30px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
</style>
