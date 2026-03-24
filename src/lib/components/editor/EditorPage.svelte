<script>
  import ModuleEditor from './ModuleEditor.svelte';
  import ClassroomsPanel from './ClassroomsPanel.svelte';
  import OpenTextResponsesPanel from './OpenTextResponsesPanel.svelte';
  import { fetchModules, fetchModuleWithChallenges, deleteModule } from '../../supabase/modules.js';
  import { navigate } from '../../router.svelte.js';

  const PROFESSOR_PASSWORD = import.meta.env.VITE_PROFESSOR_PASSWORD || 'prof2026';

  let authenticated = $state(false);
  let passwordInput = $state('');
  let passwordError = $state('');
  let showPassword = $state(false);
  let failedAttempts = $state(0);
  let lockUntil = $state(0);
  let lockClock = $state(Date.now());

  let modules = $state([]);
  let loading = $state(false);
  let editing = $state(null); // null = lista, 'new' = novo, { id, ... } = editando
  let reviewingResponses = $state(null);
  let managingClassrooms = $state(false);
  let uiError = $state('');

  let remainingLockSeconds = $derived(Math.max(0, Math.ceil((lockUntil - lockClock) / 1000)));
  let isLocked = $derived(remainingLockSeconds > 0);

  $effect(() => {
    const timer = setInterval(() => {
      lockClock = Date.now();
    }, 500);
    return () => clearInterval(timer);
  });

  function handleLogin() {
    if (isLocked) {
      passwordError = `Acesso bloqueado. Tente novamente em ${remainingLockSeconds}s.`;
      return;
    }

    if (passwordInput === PROFESSOR_PASSWORD) {
      authenticated = true;
      passwordError = '';
      failedAttempts = 0;
      lockUntil = 0;
      uiError = '';
      loadModules();
    } else {
      failedAttempts += 1;
      if (failedAttempts >= 5) {
        lockUntil = Date.now() + 30000;
        failedAttempts = 0;
        passwordError = 'Muitas tentativas. Acesso bloqueado por 30s.';
      } else {
        passwordError = 'Senha incorreta.';
      }
    }
  }

  function handleKeydown(e) {
    if (e.key === 'Enter') handleLogin();
  }

  async function loadModules() {
    loading = true;
    uiError = '';
    try {
      modules = await fetchModules();
    } catch (e) {
      console.error('Erro ao carregar módulos:', e);
      uiError = `Nao foi possivel carregar os modulos: ${e.message}`;
    } finally {
      loading = false;
    }
  }

  function startNewModule() {
    uiError = '';
    reviewingResponses = null;
    managingClassrooms = false;
    editing = 'new';
  }

  async function editModule(mod) {
    uiError = '';
    reviewingResponses = null;
    managingClassrooms = false;
    try {
      const full = await fetchModuleWithChallenges(mod.id);
      editing = {
        id: mod.id,
        title: full.module,
        author: full.author,
        updatedAt: full.updatedAt,
        challenges: full.challenges,
      };
    } catch (e) {
      console.error('Erro ao carregar módulo:', e);
      uiError = `Nao foi possivel abrir o modulo: ${e.message}`;
    }
  }

  function openResponses(mod) {
    uiError = '';
    editing = null;
    managingClassrooms = false;
    reviewingResponses = mod;
  }

  function openClassrooms() {
    uiError = '';
    editing = null;
    reviewingResponses = null;
    managingClassrooms = true;
  }

  async function handleDelete(mod) {
    if (!confirm(`Tem certeza que deseja excluir "${mod.title}"?`)) return;
    uiError = '';
    try {
      await deleteModule(mod.id);
      await loadModules();
    } catch (e) {
      console.error('Erro ao deletar:', e);
      uiError = `Nao foi possivel excluir o modulo: ${e.message}`;
    }
  }

  function handleSaved() {
    editing = null;
    reviewingResponses = null;
    managingClassrooms = false;
    loadModules();
  }

  function goToMenu() {
    navigate('/');
  }
</script>

<div class="editor-page">
  {#if !authenticated}
    <!-- ═══ LOGIN ═══ -->
    <div class="login-screen">
      <div class="login-card">
        <h2 class="login-title">🎓 Área do Professor</h2>
        <p class="login-subtitle">Digite a senha para acessar o editor.</p>

        <div class="login-field">
          <div class="password-field">
          <input
            type={showPassword ? 'text' : 'password'}
            class="login-input"
            bind:value={passwordInput}
            onkeydown={handleKeydown}
            placeholder="Senha"
            disabled={isLocked}
          />
          <button
            class="password-toggle"
            type="button"
            onclick={() => showPassword = !showPassword}
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            disabled={isLocked}
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
          </div>
          {#if passwordError}
            <p class="login-error">{passwordError}</p>
          {/if}
        </div>

        <button class="login-btn" onclick={handleLogin} disabled={isLocked}>
          {isLocked ? `Aguarde ${remainingLockSeconds}s` : 'Entrar'}
        </button>

        <button class="back-link" onclick={goToMenu}>← Voltar ao menu</button>
      </div>
    </div>

  {:else if editing === null && reviewingResponses === null && !managingClassrooms}
    <!-- ═══ LISTA DE MÓDULOS ═══ -->
    <div class="modules-list-page">
      <div class="page-header">
        <h2 class="page-title">📚 Seus Módulos</h2>
        <div class="header-actions">
          <button class="new-btn" onclick={openClassrooms}>🏫 Turmas</button>
          <button class="new-btn" onclick={startNewModule}>+ Novo Módulo</button>
          <button class="back-btn" onclick={goToMenu}>← Menu</button>
        </div>
      </div>

      {#if uiError}
        <div class="ui-error-banner" role="status" aria-live="polite">
          ⚠️ {uiError}
        </div>
      {/if}

      {#if loading}
        <div class="center-state">
          <div class="spinner"></div>
          <p>Carregando...</p>
        </div>
      {:else if modules.length === 0}
        <div class="center-state">
          <p class="empty-text">Nenhum módulo criado ainda.</p>
          <button class="new-btn" onclick={startNewModule}>Criar primeiro módulo</button>
        </div>
      {:else}
        <div class="modules-table">
          {#each modules as mod (mod.id)}
            <div class="module-row">
              <div class="module-info">
                <span class="module-title">{mod.title}</span>
                <span class="module-meta">{mod.author} · {mod.challengeCount} desafios</span>
              </div>
              <div class="module-actions">
                <button class="action-btn review" onclick={() => openResponses(mod)}>📝 Respostas</button>
                <button class="action-btn edit" onclick={() => editModule(mod)}>✏️ Editar</button>
                <button class="action-btn delete" onclick={() => handleDelete(mod)} title="Excluir modulo">
                  🗑️ Excluir
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

  {:else if reviewingResponses !== null}
    <div class="editor-wrapper">
      <OpenTextResponsesPanel
        moduleId={reviewingResponses.id}
        moduleTitle={reviewingResponses.title}
        onBack={() => { reviewingResponses = null; }}
      />
    </div>

  {:else if managingClassrooms}
    <div class="editor-wrapper">
      <ClassroomsPanel
        onBack={() => { managingClassrooms = false; }}
      />
    </div>

  {:else}
    <!-- ═══ EDITOR DE MÓDULO ═══ -->
    <div class="editor-wrapper">
      {#if editing === 'new'}
        <ModuleEditor onSave={handleSaved} onCancel={() => { editing = null; }} />
      {:else}
        <ModuleEditor
          moduleId={editing.id}
          initialTitle={editing.title}
          initialAuthor={editing.author}
          initialUpdatedAt={editing.updatedAt}
          initialChallenges={editing.challenges}
          onSave={handleSaved}
          onCancel={() => { editing = null; }}
        />
      {/if}
    </div>
  {/if}
</div>

<style>
  .editor-page {
    min-height: 100vh;
    display: flex;
    justify-content: center;
    padding: 2rem;
    animation: fadeIn 0.4s ease;
  }

  /* ── Login ── */
  .login-screen {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
  }

  .login-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 2.5rem 2rem;
    max-width: 380px;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    text-align: center;
  }

  .login-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--color-text);
  }

  .login-subtitle {
    font-size: 0.9rem;
    color: var(--color-muted);
  }

  .login-field {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .password-field {
    position: relative;
    width: 100%;
  }

  .login-input {
    width: 100%;
    padding: 0.7rem 1rem;
    padding-right: 2.9rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text);
    font-size: 1rem;
    font-family: var(--font-body);
    text-align: center;
    transition: border-color var(--transition-fast);
  }

  .login-input:focus {
    border-color: var(--color-primary);
    outline: none;
  }

  .password-toggle {
    position: absolute;
    top: 50%;
    right: 0.5rem;
    transform: translateY(-50%);
    width: 2rem;
    height: 2rem;
    border-radius: 9999px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--color-muted);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .password-toggle:hover:not(:disabled) {
    color: var(--color-text);
    border-color: var(--color-border);
    background: rgba(255, 255, 255, 0.03);
  }

  .password-toggle:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .login-error {
    color: var(--color-wrong);
    font-size: 0.8rem;
  }

  .login-btn {
    padding: 0.7rem 2rem;
    background: linear-gradient(135deg, var(--color-primary), #6d28d9);
    border: none;
    border-radius: var(--radius-lg);
    color: white;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    transition: all var(--transition-normal);
    box-shadow: 0 4px 20px var(--color-primary-glow);
  }

  .login-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px var(--color-primary-glow);
  }

  .login-btn:disabled {
    opacity: 0.75;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .back-link {
    background: none;
    border: none;
    color: var(--color-muted);
    font-size: 0.85rem;
    cursor: pointer;
    transition: color var(--transition-fast);
  }

  .back-link:hover {
    color: var(--color-primary);
  }

  /* ── Modules List ── */
  .modules-list-page {
    width: 100%;
    max-width: 700px;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .ui-error-banner {
    background: rgba(248, 113, 113, 0.14);
    color: #fecaca;
    border: 1px solid rgba(248, 113, 113, 0.4);
    border-radius: var(--radius-md);
    padding: 0.7rem 0.9rem;
    font-size: 0.85rem;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .page-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--color-text);
  }

  .header-actions {
    display: flex;
    gap: 0.5rem;
  }

  .new-btn {
    padding: 0.5rem 1rem;
    background: rgba(139, 92, 246, 0.1);
    border: 1px solid var(--color-primary);
    border-radius: var(--radius-md);
    color: var(--color-primary);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .new-btn:hover {
    background: rgba(139, 92, 246, 0.2);
  }

  .back-btn {
    padding: 0.5rem 0.8rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-muted);
    font-size: 0.85rem;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .back-btn:hover {
    border-color: var(--color-primary);
    color: var(--color-text);
  }

  .modules-table {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .module-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 1rem 1.25rem;
    transition: border-color var(--transition-fast);
  }

  .module-row:hover {
    border-color: var(--color-primary);
  }

  .module-info {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .module-title {
    font-weight: 700;
    color: var(--color-text);
    font-size: 0.95rem;
  }

  .module-meta {
    font-size: 0.8rem;
    color: var(--color-muted);
  }

  .module-actions {
    display: flex;
    gap: 0.5rem;
  }

  .action-btn {
    padding: 0.35rem 0.7rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-muted);
    font-size: 0.8rem;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .action-btn.edit:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }

  .action-btn.review:hover {
    border-color: #38bdf8;
    color: #38bdf8;
  }

  .action-btn.delete:hover {
    border-color: var(--color-wrong);
    color: var(--color-wrong);
  }

  /* ── Editor Wrapper ── */
  .editor-wrapper {
    width: 100%;
    display: flex;
    justify-content: center;
  }

  /* ── Center State ── */
  .center-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 3rem;
    text-align: center;
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

  .empty-text {
    color: var(--color-muted);
    font-size: 1rem;
  }
</style>
