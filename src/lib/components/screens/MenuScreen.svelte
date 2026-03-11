<script>
  import { navigate } from '../../router.svelte.js';
  import { fetchModules } from '../../supabase/modules.js';

  let modules = $state([]);
  let loading = $state(true);
  let error = $state('');

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
</script>

<div class="menu-screen">
  <div class="logo-section">
    <h1 class="game-title">
      <span class="title-gram">Gram</span><span class="title-quest">Quest</span>
    </h1>
    <p class="game-subtitle">Derrote os monstros da gramática!</p>
  </div>

  <div class="menu-monster">
    <svg viewBox="0 0 120 120" class="monster-svg" aria-hidden="true">
      <circle cx="60" cy="65" r="40" fill="#8b5cf6" opacity="0.3" />
      <circle cx="60" cy="60" r="35" fill="#7c3aed" />
      <circle cx="48" cy="50" r="8" fill="white" />
      <circle cx="72" cy="50" r="8" fill="white" />
      <circle cx="50" cy="50" r="4" fill="#0f172a" />
      <circle cx="74" cy="50" r="4" fill="#0f172a" />
      <path d="M 45 72 Q 60 82 75 72" stroke="white" stroke-width="3" fill="none" stroke-linecap="round" />
      <circle cx="30" cy="40" r="5" fill="#a78bfa" />
      <circle cx="90" cy="40" r="5" fill="#a78bfa" />
    </svg>
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
  }

  .logo-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .game-title {
    font-size: 3.5rem;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.02em;
  }

  .title-gram { color: var(--color-primary); }
  .title-quest { color: var(--color-correct); }

  .game-subtitle {
    font-size: 1.1rem;
    color: var(--color-muted);
  }

  .menu-monster {
    animation: float 3s ease-in-out infinite;
  }

  .monster-svg {
    width: 120px;
    height: 120px;
    filter: drop-shadow(0 8px 24px var(--color-primary-glow));
  }

  /* ── Módulos Grid ── */
  .section-title {
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--color-text);
    margin-bottom: 0.5rem;
  }

  .modules-grid {
    width: 100%;
    max-width: 500px;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
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
    margin-top: 0.5rem;
  }
</style>
