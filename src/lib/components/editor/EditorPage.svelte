<script>
  import ModuleEditor from './ModuleEditor.svelte';
  import ClassroomsPanel from './ClassroomsPanel.svelte';
  import LeaderboardCleanupPanel from './LeaderboardCleanupPanel.svelte';
  import OpenTextResponsesPanel from './OpenTextResponsesPanel.svelte';
  import { fetchModules, fetchModuleWithChallenges, deleteModule } from '../../supabase/modules.js';
  import { verifyProfessorPassword } from '../../supabase/professorAuth.js';
  import { navigate } from '../../router.svelte.js';

  let authenticated = $state(false);
  let passwordInput = $state('');
  let passwordError = $state('');
  let showPassword = $state(false);
  let loggingIn = $state(false);
  let failedAttempts = $state(0);
  let lockUntil = $state(0);
  let lockClock = $state(Date.now());

  let modules = $state([]);
  let loading = $state(false);
  let editing = $state(null); // null = lista, 'new' = novo, { id, ... } = editando
  let reviewingResponses = $state(null);
  let cleaningLeaderboard = $state(null);
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

  async function handleLogin() {
    if (isLocked || loggingIn) return;

    if (isLocked) {
      passwordError = `Acesso bloqueado. Tente novamente em ${remainingLockSeconds}s.`;
      return;
    }

    loggingIn = true;
    passwordError = '';

    const { success, error: authError } = await verifyProfessorPassword(passwordInput);

    loggingIn = false;

    if (success) {
      authenticated = true;
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
        passwordError = authError || 'Senha incorreta.';
      }
    }
  }

  function handleKeydown(e) {
    if (e.key === 'Enter' && !loggingIn) handleLogin();
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
    cleaningLeaderboard = null;
    managingClassrooms = false;
    editing = 'new';
  }

  async function editModule(mod) {
    uiError = '';
    reviewingResponses = null;
    cleaningLeaderboard = null;
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
    cleaningLeaderboard = null;
    managingClassrooms = false;
    reviewingResponses = mod;
  }

  function openLeaderboardCleanup(mod) {
    uiError = '';
    editing = null;
    reviewingResponses = null;
    managingClassrooms = false;
    cleaningLeaderboard = mod;
  }

  function openClassrooms() {
    uiError = '';
    editing = null;
    reviewingResponses = null;
    cleaningLeaderboard = null;
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
    cleaningLeaderboard = null;
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

        <button class="login-btn" onclick={handleLogin} disabled={isLocked || loggingIn}>
          {isLocked ? `Aguarde ${remainingLockSeconds}s` : loggingIn ? 'Verificando...' : 'Entrar'}
        </button>

        <button class="back-link" onclick={goToMenu}>← Voltar ao menu</button>
      </div>
    </div>

  {:else if editing === null && reviewingResponses === null && cleaningLeaderboard === null && !managingClassrooms}
    <!-- ═══ LISTA DE MÓDULOS ═══ -->
    <div class="modules-list-page">
      <div class="page-header">
        <div class="page-copy">
          <h2 class="page-title">📚 Seus Módulos</h2>
          <p class="page-subtitle">Organize seus conteúdos, respostas e placares em um só lugar.</p>
        </div>
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
                <div class="module-meta-row">
                  <span class="module-count-pill">{mod.challengeCount} desafios</span>
                </div>
                <span class="module-title">{mod.title}</span>
                <span class="module-meta">{mod.author}</span>
              </div>
              <div class="module-actions">
                <button class="action-btn cleanup" onclick={() => openLeaderboardCleanup(mod)}>🧹 Placar</button>
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

  {:else if cleaningLeaderboard !== null}
    <div class="editor-wrapper">
      <LeaderboardCleanupPanel
        moduleId={cleaningLeaderboard.id}
        moduleTitle={cleaningLeaderboard.title}
        onBack={() => { cleaningLeaderboard = null; }}
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
    max-width: 980px;
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
    gap: 1rem;
    padding: 1.15rem 1.25rem;
    background:
      radial-gradient(circle at top right, rgba(139, 92, 246, 0.14), transparent 32%),
      linear-gradient(180deg, rgba(30, 41, 59, 0.92), rgba(15, 23, 42, 0.86));
    border: 1px solid rgba(148, 163, 184, 0.16);
    border-radius: 24px;
    box-shadow: 0 16px 34px rgba(2, 6, 23, 0.18);
  }

  .page-copy {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .page-title {
    font-size: 1.65rem;
    font-weight: 800;
    color: var(--color-text);
  }

  .page-subtitle {
    color: var(--color-muted);
    font-size: 0.92rem;
    line-height: 1.5;
  }

  .header-actions {
    display: flex;
    gap: 0.65rem;
    flex-wrap: wrap;
  }

  .new-btn {
    padding: 0.65rem 1rem;
    background: rgba(139, 92, 246, 0.14);
    border: 1px solid rgba(139, 92, 246, 0.55);
    border-radius: 14px;
    color: #ddd6fe;
    font-size: 0.88rem;
    font-weight: 700;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .new-btn:hover {
    background: rgba(139, 92, 246, 0.22);
    transform: translateY(-1px);
    box-shadow: 0 10px 20px rgba(139, 92, 246, 0.14);
  }

  .back-btn {
    padding: 0.65rem 0.95rem;
    background: rgba(30, 41, 59, 0.9);
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: 14px;
    color: var(--color-muted);
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .back-btn:hover {
    border-color: var(--color-primary);
    color: var(--color-text);
    transform: translateY(-1px);
  }

  .modules-table {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }

  .module-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    background:
      linear-gradient(180deg, rgba(30, 41, 59, 0.96), rgba(30, 41, 59, 0.9)),
      var(--color-surface);
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: 20px;
    padding: 1.1rem 1.2rem;
    transition: border-color var(--transition-fast), transform var(--transition-fast), box-shadow var(--transition-fast);
    box-shadow: 0 12px 28px rgba(2, 6, 23, 0.12);
  }

  .module-row:hover {
    border-color: var(--color-primary);
    transform: translateY(-2px);
    box-shadow: 0 18px 36px rgba(2, 6, 23, 0.18);
  }

  .module-info {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    flex: 1;
    min-width: 0;
  }

  .module-meta-row {
    display: flex;
    align-items: center;
  }

  .module-count-pill {
    display: inline-flex;
    align-items: center;
    padding: 0.26rem 0.58rem;
    border-radius: 999px;
    background: rgba(56, 189, 248, 0.12);
    border: 1px solid rgba(56, 189, 248, 0.28);
    color: #bfdbfe;
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.01em;
  }

  .module-title {
    font-weight: 700;
    color: var(--color-text);
    font-size: 1.1rem;
    line-height: 1.45;
  }

  .module-meta {
    font-size: 0.84rem;
    color: var(--color-muted);
  }

  .module-actions {
    display: flex;
    gap: 0.55rem;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .action-btn {
    min-width: 112px;
    padding: 0.6rem 0.85rem;
    background: rgba(15, 23, 42, 0.72);
    border: 1px solid rgba(148, 163, 184, 0.16);
    border-radius: 14px;
    color: var(--color-muted);
    font-size: 0.84rem;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .action-btn:hover {
    transform: translateY(-1px);
  }

  .action-btn.edit:hover {
    border-color: var(--color-primary);
    color: #ddd6fe;
    background: rgba(139, 92, 246, 0.14);
  }

  .action-btn.review:hover {
    border-color: #38bdf8;
    color: #dbeafe;
    background: rgba(56, 189, 248, 0.12);
  }

  .action-btn.cleanup:hover {
    border-color: #f59e0b;
    color: #fcd34d;
    background: rgba(245, 158, 11, 0.12);
  }

  .action-btn.delete:hover {
    border-color: var(--color-wrong);
    color: #fecaca;
    background: rgba(248, 113, 113, 0.12);
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

  @media (max-width: 860px) {
    .module-row {
      flex-direction: column;
      align-items: stretch;
    }

    .module-actions {
      justify-content: stretch;
    }

    .action-btn {
      flex: 1 1 calc(50% - 0.55rem);
      min-width: 0;
    }
  }

  @media (max-width: 640px) {
    .editor-page {
      padding: 1rem;
    }

    .page-header {
      padding: 1rem;
      border-radius: 20px;
    }

    .page-title {
      font-size: 1.4rem;
    }

    .header-actions,
    .module-actions {
      width: 100%;
    }

    .new-btn,
    .back-btn,
    .action-btn {
      flex: 1 1 100%;
      width: 100%;
    }

    .module-row {
      padding: 1rem;
    }
  }
</style>
