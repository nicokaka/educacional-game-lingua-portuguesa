<script>
  import { getChallengeRuntimeIssue, getRenderer } from '../engine/challengeRegistry.js';

  let { challenge, onAnswer, onHint } = $props();

  let RendererComponent = $derived(getRenderer(challenge?.type));
  let runtimeIssue = $derived(challenge ? getChallengeRuntimeIssue(challenge) : null);
</script>

<div class="challenge-host">
  {#if challenge && runtimeIssue}
    <div class="renderer-wrapper" style="animation: slideIn 0.4s ease;">
      <div class="runtime-fallback">
        <p>Esta atividade esta sendo atualizada.</p>
      </div>
    </div>
  {:else if challenge && RendererComponent}
    <div class="renderer-wrapper" style="animation: slideIn 0.4s ease;">
      {#if challenge.imageUrl?.trim()}
        <figure class="challenge-image-block">
          <img
            class="challenge-image"
            src={challenge.imageUrl}
            alt={challenge.imageAlt?.trim() || 'Imagem da questão'}
          />
          {#if challenge.imageCaption?.trim()}
            <figcaption class="challenge-image-caption">{challenge.imageCaption}</figcaption>
          {/if}
        </figure>
      {/if}

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

  .challenge-image-block {
    margin: 0 0 1rem;
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: 18px;
    overflow: hidden;
    background: linear-gradient(180deg, rgba(30, 41, 59, 0.88), rgba(15, 23, 42, 0.9));
    box-shadow: 0 16px 32px rgba(2, 6, 23, 0.22);
  }

  .challenge-image {
    width: 100%;
    display: block;
    max-height: min(42vh, 320px);
    height: auto;
    object-fit: contain;
    background: rgba(15, 23, 42, 0.6);
  }

  .challenge-image-caption {
    margin: 0;
    padding: 0.85rem 1rem 0.95rem;
    color: var(--color-muted, #94a3b8);
    font-size: 0.92rem;
    line-height: 1.45;
    text-align: left;
    border-top: 1px solid rgba(148, 163, 184, 0.14);
  }

  .no-challenge {
    text-align: center;
    color: var(--color-muted, #94a3b8);
    padding: 2rem;
  }

  .runtime-fallback {
    width: 100%;
    padding: 1rem 1.1rem;
    border-radius: 16px;
    border: 1px solid rgba(148, 163, 184, 0.16);
    background: rgba(15, 23, 42, 0.4);
    color: var(--color-text, #e2e8f0);
    text-align: center;
    line-height: 1.5;
  }

  @media (max-width: 640px) {
    .challenge-image {
      max-height: 240px;
    }

    .challenge-image-caption {
      padding: 0.75rem 0.85rem 0.85rem;
      font-size: 0.88rem;
    }
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
