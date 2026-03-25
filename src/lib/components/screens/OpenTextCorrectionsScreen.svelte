  <script>
  import { navigate } from '../../router.svelte.js';
  import { fetchStudentOpenTextResponses } from '../../supabase/writtenResponses.js';
  import {
    getSavedStudentAccessId,
    getSavedStudentName,
    getSavedClassroomId,
    getSavedClassroomName,
  } from '../../studentIdentity.js';

  let studentName = $state('');
  let classroomName = $state('');
  let responses = $state([]);
  let loading = $state(true);
  let error = $state('');
  let latestRequestToken = 0;

  function goToMenu() {
    navigate('/');
  }

  function getStatusInfo(status) {
    if (status === 'correta') {
      return { label: 'Correta', tone: 'corrected' };
    }

    if (status === 'parcial') {
      return { label: 'Parcial', tone: 'partial' };
    }

    if (status === 'incorreta') {
      return { label: 'Incorreta', tone: 'incorrect' };
    }

    if (status === 'pending' || !status) {
      return { label: 'Pendente', tone: 'pending' };
    }

    return { label: 'Status desconhecido', tone: 'unknown' };
  }

  function getFeedbackText(response) {
    const feedback = response?.teacher_feedback?.trim?.() || '';
    if (feedback) return feedback;

    if ((response?.status || 'pending') === 'pending') {
      return 'Aguardando correcao do professor.';
    }

    return 'O professor ainda nao deixou um comentario.';
  }

  function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }

  async function loadResponses() {
    const currentAccessId = getSavedStudentAccessId();
    const currentName = getSavedStudentName();
    const currentClassroomId = getSavedClassroomId();
    const currentClassroomName = getSavedClassroomName();

    if ((!currentAccessId && !currentName) || !currentClassroomId) {
      navigate('/');
      return;
    }

    const requestId = ++latestRequestToken;
    studentName = currentName;
    classroomName = currentClassroomName || 'Turma nao informada';
    loading = true;
    error = '';

    try {
      const data = await fetchStudentOpenTextResponses({
        studentAccessId: currentAccessId,
        studentName: currentName,
        classroomId: currentClassroomId,
      });
      if (requestId !== latestRequestToken) return;
      responses = data;
    } catch (err) {
      if (requestId !== latestRequestToken) return;
      console.error('Erro ao carregar correcoes do aluno:', err);
      responses = [];
      error = err?.message || 'Nao foi possivel carregar suas correcoes.';
    } finally {
      if (requestId === latestRequestToken) {
        loading = false;
      }
    }
  }

  $effect(() => {
    loadResponses();
  });
</script>

<div class="corrections-screen">
  <div class="page-header">
    <button type="button" class="back-btn" onclick={goToMenu}>← Voltar</button>
    <div class="header-copy">
      <h1 class="page-title">📝 Minhas correções</h1>
      {#if studentName}
        <p class="page-subtitle">
          {classroomName || 'Turma nao informada'} · respostas abertas enviadas por {studentName}
        </p>
      {/if}
    </div>
  </div>

  {#if loading}
    <div class="state-card">
      <div class="spinner"></div>
      <p>Carregando suas correcoes...</p>
    </div>
  {:else if error}
    <div class="state-card">
      <p class="error-text">⚠️ {error}</p>
      <div class="state-actions">
        <button type="button" class="action-btn primary" onclick={loadResponses}>Tentar novamente</button>
        <button type="button" class="action-btn" onclick={goToMenu}>Voltar ao menu</button>
      </div>
    </div>
  {:else if responses.length === 0}
    <div class="state-card">
      <p class="empty-title">Voce ainda nao tem respostas abertas registradas.</p>
      <p class="empty-copy">Quando voce enviar perguntas do tipo resposta aberta, elas aparecerao aqui.</p>
    </div>
  {:else}
    <div class="responses-list">
      {#each responses as response (response.id)}
        {@const statusInfo = getStatusInfo(response.status)}
        <article class="response-card">
          <div class="card-top">
            <div class="meta-group">
              <p class="meta-label">Modulo</p>
              <h2 class="module-title">{response.module_title || 'Modulo removido ou indisponivel'}</h2>
            </div>
            <span class={`status-pill ${statusInfo.tone}`}>{statusInfo.label}</span>
          </div>

          <div class="meta-dates">
            <span>Enviada em {formatDate(response.created_at) || 'Data indisponivel'}</span>
            {#if response.reviewed_at}
              <span>Revisada em {formatDate(response.reviewed_at)}</span>
            {/if}
          </div>

          <div class="content-block">
            <p class="content-label">Pergunta</p>
            <p class="content-text">{response.prompt || 'Pergunta removida ou indisponivel'}</p>
          </div>

          <div class="content-block">
            <p class="content-label">Sua resposta</p>
            <div class="content-box">{response.response_text || 'Resposta indisponivel'}</div>
          </div>

          <div class="content-block">
            <p class="content-label">Feedback do professor</p>
            <div class="feedback-box" class:pending-feedback={(response.status || 'pending') === 'pending'}>
              {getFeedbackText(response)}
            </div>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</div>

<style>
  .corrections-screen {
    min-height: 100vh;
    width: 100%;
    max-width: 920px;
    margin: 0 auto;
    padding: 2rem 1.25rem 2.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    animation: fadeIn 0.4s ease;
  }

  .page-header {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .header-copy {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .page-title {
    font-size: 1.7rem;
    font-weight: 800;
    color: var(--color-text);
  }

  .page-subtitle {
    color: var(--color-muted);
    font-size: 0.95rem;
  }

  .back-btn,
  .action-btn {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text);
    padding: 0.65rem 0.95rem;
    font-size: 0.9rem;
    font-weight: 600;
    transition: all var(--transition-fast);
  }

  .back-btn:hover,
  .action-btn:hover {
    border-color: var(--color-primary);
    transform: translateY(-1px);
  }

  .action-btn.primary {
    background: rgba(139, 92, 246, 0.14);
    border-color: rgba(139, 92, 246, 0.55);
  }

  .state-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.85rem;
    text-align: center;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 2rem 1.25rem;
  }

  .spinner {
    width: 36px;
    height: 36px;
    border: 3px solid var(--color-border);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .error-text {
    color: var(--color-wrong);
  }

  .state-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: center;
  }

  .empty-title {
    color: var(--color-text);
    font-size: 1rem;
    font-weight: 700;
  }

  .empty-copy {
    color: var(--color-muted);
    line-height: 1.5;
  }

  .responses-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .response-card {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 20px;
    padding: 1.15rem;
  }

  .card-top {
    display: flex;
    justify-content: space-between;
    gap: 0.8rem;
    align-items: flex-start;
  }

  .meta-group {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .meta-label,
  .content-label {
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-muted);
  }

  .module-title {
    font-size: 1.02rem;
    font-weight: 700;
    color: var(--color-text);
    line-height: 1.4;
  }

  .status-pill {
    border-radius: 999px;
    padding: 0.35rem 0.7rem;
    border: 1px solid transparent;
    font-size: 0.76rem;
    font-weight: 700;
    white-space: nowrap;
  }

  .status-pill.pending {
    background: rgba(59, 130, 246, 0.12);
    border-color: rgba(96, 165, 250, 0.32);
    color: #bfdbfe;
  }

  .status-pill.corrected {
    background: rgba(34, 197, 94, 0.12);
    border-color: rgba(74, 222, 128, 0.34);
    color: #bbf7d0;
  }

  .status-pill.partial {
    background: rgba(250, 204, 21, 0.12);
    border-color: rgba(250, 204, 21, 0.32);
    color: #fde68a;
  }

  .status-pill.incorrect {
    background: rgba(248, 113, 113, 0.12);
    border-color: rgba(248, 113, 113, 0.34);
    color: #fecaca;
  }

  .status-pill.unknown {
    background: rgba(148, 163, 184, 0.12);
    border-color: rgba(148, 163, 184, 0.32);
    color: #e2e8f0;
  }

  .meta-dates {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem 1rem;
    font-size: 0.83rem;
    color: var(--color-muted);
  }

  .content-block {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  .content-text,
  .content-box,
  .feedback-box {
    border: 1px solid rgba(148, 163, 184, 0.16);
    border-radius: 16px;
    background: rgba(15, 23, 42, 0.46);
    color: var(--color-text);
    padding: 0.9rem 1rem;
    line-height: 1.6;
    white-space: pre-wrap;
  }

  .feedback-box.pending-feedback {
    color: var(--color-muted);
  }

  @media (max-width: 640px) {
    .corrections-screen {
      padding: 1.25rem 1rem 2rem;
    }

    .card-top {
      flex-direction: column;
    }

    .status-pill {
      align-self: flex-start;
    }

    .back-btn,
    .action-btn {
      width: 100%;
    }

    .state-actions {
      width: 100%;
      flex-direction: column;
    }
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
