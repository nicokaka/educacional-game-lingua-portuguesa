<script>
  import { navigate } from '../../router.svelte.js';
  import { fetchModules } from '../../supabase/modules.js';

  let modules = $state([]);
  let loading = $state(true);
  let error = $state('');
  let showHelp = $state(false);
  let helpSection = $state('instructions');
  const creatorName = import.meta.env.VITE_GAME_CREATOR || 'Nicolas Oliveira';
  const mentorName = import.meta.env.VITE_GAME_MENTOR || 'Sergio Claudino';

  async function load() {
    loading = true;
    error = '';
    try {
      modules = await fetchModules();
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  // Carrega módulos ao montar
  $effect(() => { load(); });

  function playModule(id) {
    navigate(`/play/${id}`);
  }

  function openEditor() {
    navigate('/editor');
  }

  function openHelp(section = 'instructions') {
    helpSection = section;
    showHelp = true;
  }

  function closeHelp() {
    showHelp = false;
  }

  function handleWindowKeydown(event) {
    if (event.key === 'Escape' && showHelp) {
      closeHelp();
    }
  }

  function stopMouseDown(event) {
    event.stopPropagation();
  }
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<div class="menu-screen">
  <div class="logo-section">
    <h1 class="game-title">
      <span class="title-alquimia">Alquimia</span>&nbsp;<span class="title-verbal">Verbal</span>
    </h1>
    <p class="game-subtitle">Derrote os monstros da gramática!</p>

    <div class="quick-actions">
      <button
        class="quick-action-btn primary"
        onclick={() => openHelp('instructions')}
        aria-label="Abrir instrucoes do jogo"
        title="Como jogar"
      >
        ❓ Instruções
      </button>
      <button
        class="quick-action-btn secondary"
        onclick={() => openHelp('credits')}
        aria-label="Abrir creditos"
        title="Creditos"
      >
        ℹ️ Créditos
      </button>
    </div>
  </div>

  <div class="menu-monster">
    <img src="/prof-cartoon.png" class="professor-img" alt="Professor Cartoon" />
  </div>

  {#if loading}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Carregando módulos...</p>
    </div>
  {:else if error}
    <div class="error-state">
      <p class="error-text">⚠️ {error}</p>
      <button class="retry-btn" onclick={load}>Tentar novamente</button>
    </div>
  {:else if modules.length === 0}
    <div class="empty-state">
      <p class="empty-text">Nenhum módulo disponível ainda.</p>
      <p class="empty-hint">Peça ao professor para criar módulos no editor.</p>
    </div>
  {:else}
    <div class="modules-grid">
      <h2 class="section-title">📚 Escolha um Módulo</h2>
      {#each modules as mod (mod.id)}
        <button class="module-card" onclick={() => playModule(mod.id)}>
          <div class="module-card-header">
            <span class="module-icon">📖</span>
            <span class="module-title">{mod.title}</span>
          </div>
          <div class="module-card-footer">
            <span class="module-author">✍️ {mod.author}</span>
            <span class="module-count">{mod.challengeCount} desafios</span>
          </div>
        </button>
      {/each}
    </div>
  {/if}

  <button class="editor-btn" onclick={openEditor}>
    🎓 Área do Professor
  </button>

  <p class="credits">Projeto de Estágio — Licenciatura em Computação (UFRPE)</p>
</div>

{#if showHelp}
  <div class="help-overlay" role="presentation" onmousedown={closeHelp}>
    <div
      class="help-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Ajuda e creditos"
      tabindex="-1"
      onmousedown={stopMouseDown}
    >
      <div class="help-header">
        <h2 class="help-title">{helpSection === 'credits' ? '👥 Créditos' : '🧭 Como jogar'}</h2>
        <button class="help-close" onclick={closeHelp} aria-label="Fechar ajuda">x</button>
      </div>

      <div class="help-tabs">
        <button
          class="help-tab-btn"
          class:active={helpSection === 'instructions'}
          onclick={() => openHelp('instructions')}
        >
          Instruções
        </button>
        <button
          class="help-tab-btn"
          class:active={helpSection === 'credits'}
          onclick={() => openHelp('credits')}
        >
          Créditos
        </button>
      </div>

      {#if helpSection === 'instructions'}
        <p class="help-line">1. Escolha um módulo e comece a batalha.</p>
        <p class="help-line">2. Acerte os desafios para reduzir o HP do monstro.</p>
        <p class="help-line">3. Se errar, você perde energia. Se chegar a zero, é game over.</p>
        <p class="help-line">4. O bizu ajuda, mas também custa energia.</p>
      {:else}
        <h3 class="help-subtitle">Equipe do jogo</h3>
        <p class="credits-line"><strong>Criador:</strong> {creatorName}</p>
        <p class="credits-line"><strong>Professor:</strong> {mentorName}</p>
        <p class="credits-line"><strong>Projeto:</strong> Alquimia Verbal — aprendizado de língua portuguesa em formato de jogo.</p>
      {/if}
    </div>
  </div>
{/if}

<style>
  .menu-screen {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.5rem;
    text-align: center;
    padding: 2rem;
    animation: fadeIn 0.6s ease;
    position: relative;
  }

  .logo-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .game-title {
    font-family: var(--font-title);
    font-size: clamp(2.5rem, 8vw, 4rem); /* Aumentei max para 4rem pra Macondo brilhar */
    font-weight: 400; /* Macondo não precisa de 800 */
    line-height: 1;
    letter-spacing: -0.02em;
  }

  .title-alquimia { color: var(--color-primary); }
  .title-verbal { color: var(--color-correct); }

  .game-subtitle {
    font-size: 1.1rem;
    color: var(--color-muted);
  }

  .quick-actions {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    margin-top: 0.35rem;
    flex-wrap: wrap;
  }

  .quick-action-btn {
    border: 1px solid var(--color-border);
    border-radius: 999px;
    padding: 0.45rem 0.85rem;
    font-size: 0.85rem;
    font-weight: 700;
    transition: all var(--transition-fast);
  }

  .quick-action-btn.primary {
    background: rgba(139, 92, 246, 0.18);
    color: #efe8ff;
    border-color: rgba(139, 92, 246, 0.75);
  }

  .quick-action-btn.primary:hover {
    background: rgba(139, 92, 246, 0.28);
    transform: translateY(-1px);
  }

  .quick-action-btn.secondary {
    background: rgba(34, 197, 94, 0.12);
    color: #dcfce7;
    border-color: rgba(34, 197, 94, 0.4);
  }

  .quick-action-btn.secondary:hover {
    background: rgba(34, 197, 94, 0.2);
    transform: translateY(-1px);
  }

  .menu-monster {
    animation: float 3s ease-in-out infinite;
    margin-bottom: -80px; /* Aprofundado atrás dos módulos */
    margin-top: -10px; /* Sobe a imagem um pouco mais para perto do título */
    position: relative;
    z-index: 1;
    pointer-events: none; /* Pra não bloquear cliques nos cards se sobrepor */
  }

  .professor-img {
    width: clamp(250px, 32vw, 380px);
    height: auto;
    max-height: clamp(300px, 56vh, 480px);
    object-fit: contain;
    margin-left: clamp(-35px, -2.4vw, -14px); /* Compensa peso visual do livro */
    filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.5));
    /* Disfarça corte abrupto em baixo fazendo a imagem sumir (fade out) */
    -webkit-mask-image: linear-gradient(to bottom, black 65%, transparent 100%);
    mask-image: linear-gradient(to bottom, black 65%, transparent 100%);
  }

  /* ── Módulos Grid ── */
  .section-title {
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--color-text);
    margin-bottom: 0.5rem;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.9); /* Garante leitura sobre a imagem */
  }

  .modules-grid {
    width: 100%;
    max-width: 500px;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    position: relative;
    z-index: 10;
  }

  .module-card {
    width: 100%;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 1rem 1.25rem;
    text-align: left;
    color: var(--color-text);
    transition: all var(--transition-normal);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .module-card:hover {
    border-color: var(--color-primary);
    transform: translateY(-2px);
    box-shadow: 0 4px 20px var(--color-primary-glow);
  }

  .module-card-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .module-icon {
    font-size: 1.5rem;
  }

  .module-title {
    font-size: 1.05rem;
    font-weight: 700;
  }

  .module-card-footer {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    color: var(--color-muted);
  }

  /* ── Loading / Error / Empty ── */
  .loading-state, .error-state, .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 2rem;
  }

  .spinner {
    width: 36px;
    height: 36px;
    border: 3px solid var(--color-border);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error-text {
    color: var(--color-wrong);
    font-size: 0.9rem;
  }

  .retry-btn {
    padding: 0.5rem 1.25rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    border-radius: var(--radius-md);
    font-size: 0.85rem;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .retry-btn:hover {
    border-color: var(--color-primary);
  }

  .empty-text {
    color: var(--color-muted);
    font-size: 1rem;
  }

  .empty-hint {
    color: var(--color-muted);
    font-size: 0.85rem;
    opacity: 0.7;
  }

  /* ── Botão Editor ── */
  .editor-btn {
    padding: 0.75rem 1.5rem;
    background: transparent;
    border: 1px solid var(--color-border);
    color: var(--color-muted);
    border-radius: var(--radius-lg);
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-normal);
  }

  .editor-btn:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
    background: rgba(139, 92, 246, 0.05);
  }

  .credits {
    font-size: 0.75rem;
    color: var(--color-muted);
    opacity: 0.6;
    margin-top: 0.4rem;
  }

  .help-overlay {
    position: fixed;
    inset: 0;
    background: rgba(2, 6, 23, 0.66);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    z-index: 40;
  }

  .help-modal {
    width: min(560px, 96vw);
    background: linear-gradient(180deg, rgba(30, 41, 59, 0.98), rgba(15, 23, 42, 0.98));
    border: 1px solid var(--color-border);
    border-radius: 18px;
    box-shadow: 0 20px 42px rgba(2, 6, 23, 0.58);
    padding: 1rem 1rem 0.95rem;
    text-align: left;
    animation: help-pop 0.2s ease;
  }

  .help-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.45rem;
  }

  .help-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.65rem;
  }

  .help-tab-btn {
    border: 1px solid var(--color-border);
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.7);
    color: var(--color-muted);
    font-size: 0.82rem;
    font-weight: 700;
    padding: 0.34rem 0.72rem;
    transition: all var(--transition-fast);
  }

  .help-tab-btn.active {
    color: var(--color-text);
    border-color: rgba(139, 92, 246, 0.8);
    background: rgba(139, 92, 246, 0.2);
  }

  .help-title {
    font-size: 1.02rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .help-close {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    border: 1px solid var(--color-border);
    background: rgba(15, 23, 42, 0.7);
    color: var(--color-muted);
    font-size: 0.95rem;
    font-weight: 700;
    transition: all var(--transition-fast);
  }

  .help-close:hover {
    border-color: var(--color-primary);
    color: var(--color-text);
  }

  .help-line,
  .credits-line {
    font-size: 0.9rem;
    color: var(--color-muted);
    line-height: 1.5;
    margin-bottom: 0.3rem;
  }

  .credits-line strong {
    color: var(--color-text);
    font-weight: 600;
  }

  .help-subtitle {
    font-size: 0.92rem;
    color: var(--color-text);
    margin-bottom: 0.35rem;
  }

  @keyframes help-pop {
    from {
      transform: translateY(8px) scale(0.98);
      opacity: 0;
    }
    to {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
  }

  @media (max-width: 1024px) {
    .menu-screen {
      padding: 1.25rem 1rem 1.5rem;
      gap: 1rem;
    }

    .menu-monster {
      margin-bottom: -58px;
    }

    .professor-img {
      width: clamp(220px, 42vw, 320px);
      max-height: 43vh;
      margin-left: -18px;
    }
  }

  @media (max-height: 820px) {
    .menu-screen {
      min-height: 100svh;
      justify-content: flex-start;
      gap: 0.9rem;
      padding: 0.85rem 0.85rem 1.5rem;
    }

    .logo-section {
      gap: 0.35rem;
    }

    .game-title {
      font-size: clamp(2rem, 7vw, 3rem);
    }

    .game-subtitle {
      font-size: 0.98rem;
    }

    .menu-monster {
      margin-top: -6px;
      margin-bottom: -40px;
    }

    .professor-img {
      width: clamp(190px, 30vw, 290px);
      max-height: 36vh;
      margin-left: -12px;
    }

    .section-title {
      font-size: 1.08rem;
    }

    .module-card {
      padding: 0.82rem 1rem;
    }

    .module-title {
      font-size: 1rem;
    }

    .editor-btn {
      padding: 0.62rem 1.2rem;
      font-size: 0.9rem;
    }

    .quick-actions {
      gap: 0.45rem;
    }

    .quick-action-btn {
      font-size: 0.78rem;
      padding: 0.38rem 0.68rem;
    }

    .help-modal {
      padding: 0.85rem 0.82rem 0.78rem;
    }

    .help-line,
    .credits-line {
      font-size: 0.83rem;
      line-height: 1.38;
    }

    .credits {
      font-size: 0.7rem;
      margin-top: 0.2rem;
    }
  }
</style>
