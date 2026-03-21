<script>
  import { fetchModuleOpenTextResponses, updateOpenTextResponseReview } from '../../supabase/writtenResponses.js';

  let { moduleId, moduleTitle = 'Respostas', onBack } = $props();

  let loading = $state(true);
  let error = $state('');
  let responses = $state([]);
  let selectedResponseId = $state(null);
  let draftStatus = $state('correta');
  let draftFeedback = $state('');
  let saving = $state(false);
  let saveError = $state('');
  let saveSuccess = $state('');

  let selectedResponse = $derived(
    responses.find((response) => response.id === selectedResponseId) || null
  );

  $effect(() => {
    moduleId;
    loadResponses();
  });

  function getReviewStatus(status) {
    return ['correta', 'parcial', 'incorreta'].includes(status) ? status : 'correta';
  }

  function getStatusLabel(status) {
    if (status === 'correta') return 'Correta';
    if (status === 'parcial') return 'Parcial';
    if (status === 'incorreta') return 'Incorreta';
    return 'Pendente';
  }

  function summarizePrompt(prompt) {
    const normalized = (prompt || 'Pergunta removida ou indisponivel').trim();
    return normalized.length > 90 ? `${normalized.slice(0, 87)}...` : normalized;
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

  function selectResponse(responseId, list = responses) {
    selectedResponseId = responseId;
    const response = list.find((item) => item.id === responseId);
    draftStatus = getReviewStatus(response?.status);
    draftFeedback = response?.teacher_feedback || '';
    saveError = '';
    saveSuccess = '';
  }

  async function loadResponses() {
    loading = true;
    error = '';
    saveError = '';
    saveSuccess = '';

    try {
      const data = await fetchModuleOpenTextResponses(moduleId);
      responses = data;

      if (data.length === 0) {
        selectedResponseId = null;
        draftStatus = 'correta';
        draftFeedback = '';
        return;
      }

      const nextId = data.some((item) => item.id === selectedResponseId)
        ? selectedResponseId
        : data[0].id;

      selectResponse(nextId, data);
    } catch (err) {
      console.error('Erro ao carregar respostas abertas:', err);
      error = err.message || 'Nao foi possivel carregar as respostas.';
      responses = [];
      selectedResponseId = null;
    } finally {
      loading = false;
    }
  }

  async function saveReview() {
    if (!selectedResponse) return;

    saving = true;
    saveError = '';
    saveSuccess = '';

    try {
      const { reviewed_at } = await updateOpenTextResponseReview(selectedResponse.id, {
        status: draftStatus,
        teacher_feedback: draftFeedback,
      });

      responses = responses.map((response) =>
        response.id === selectedResponse.id
          ? {
              ...response,
              status: draftStatus,
              teacher_feedback: draftFeedback,
              reviewed_at,
            }
          : response
      );

      saveSuccess = 'Correcao salva com sucesso.';
    } catch (err) {
      console.error('Erro ao salvar correcao:', err);
      saveError = err.message || 'Nao foi possivel salvar a correcao.';
    } finally {
      saving = false;
    }
  }
</script>

<div class="responses-panel">
  <div class="panel-header">
    <button type="button" class="back-btn" onclick={onBack}>← Voltar</button>
    <div class="header-copy">
      <h2 class="panel-title">📝 Respostas Abertas</h2>
      <p class="panel-subtitle">{moduleTitle}</p>
    </div>
  </div>

  {#if loading}
    <div class="center-state">
      <div class="spinner"></div>
      <p>Carregando respostas...</p>
    </div>
  {:else if error}
    <div class="error-banner">⚠️ {error}</div>
  {:else if responses.length === 0}
    <div class="empty-state">
      <h3>Nenhuma resposta enviada ainda.</h3>
      <p>Quando os alunos responderem perguntas abertas deste modulo, elas aparecerao aqui.</p>
    </div>
  {:else}
    <div class="responses-layout">
      <aside class="responses-list">
        {#each responses as response (response.id)}
          <button
            type="button"
            class:selected={response.id === selectedResponseId}
            class="response-card"
            onclick={() => selectResponse(response.id)}
          >
            <div class="response-card-top">
              <span class="student-name">{response.student_name}</span>
              <span class={`status-pill ${response.status}`}>{getStatusLabel(response.status)}</span>
            </div>
            <p class="prompt-summary">{summarizePrompt(response.prompt)}</p>
            <p class="response-meta">{formatDate(response.created_at)}</p>
          </button>
        {/each}
      </aside>

      <section class="detail-card">
        {#if selectedResponse}
          <div class="detail-block">
            <p class="detail-label">Aluno</p>
            <p class="detail-value">{selectedResponse.student_name}</p>
          </div>

          <div class="detail-block">
            <p class="detail-label">Pergunta</p>
            <p class="detail-value">{selectedResponse.prompt}</p>
          </div>

          <div class="detail-block">
            <p class="detail-label">Resposta do aluno</p>
            <div class="response-text-box">{selectedResponse.response_text}</div>
          </div>

          <div class="review-form">
            <label class="field">
              <span class="detail-label">Status da correcao</span>
              <select bind:value={draftStatus} class="field-input">
                <option value="correta">Correta</option>
                <option value="parcial">Parcial</option>
                <option value="incorreta">Incorreta</option>
              </select>
            </label>

            <label class="field">
              <span class="detail-label">Feedback do professor (opcional)</span>
              <textarea
                bind:value={draftFeedback}
                class="field-textarea"
                rows="5"
                placeholder="Escreva um retorno para o aluno..."
              ></textarea>
            </label>

            {#if saveError}
              <p class="form-error">{saveError}</p>
            {/if}
            {#if saveSuccess}
              <p class="form-success">{saveSuccess}</p>
            {/if}

            <button type="button" class="save-btn" onclick={saveReview} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar correcao'}
            </button>
          </div>
        {/if}
      </section>
    </div>
  {/if}
</div>

<style>
  .responses-panel {
    width: min(1080px, 100%);
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .panel-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .header-copy {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .panel-title {
    font-size: 1.45rem;
    font-weight: 800;
    color: var(--color-text);
  }

  .panel-subtitle {
    color: var(--color-muted);
    font-size: 0.92rem;
  }

  .responses-layout {
    display: grid;
    grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
    gap: 1rem;
    align-items: start;
  }

  .responses-list,
  .detail-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
  }

  .responses-list {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    padding: 0.85rem;
    max-height: 72vh;
    overflow-y: auto;
  }

  .response-card {
    width: 100%;
    text-align: left;
    background: rgba(15, 23, 42, 0.3);
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: 16px;
    padding: 0.85rem 0.9rem;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    transition: border-color var(--transition-fast), transform var(--transition-fast), background var(--transition-fast);
  }

  .response-card:hover,
  .response-card.selected {
    border-color: var(--color-primary);
    background: rgba(139, 92, 246, 0.08);
    transform: translateY(-1px);
  }

  .response-card-top {
    display: flex;
    justify-content: space-between;
    gap: 0.6rem;
    align-items: center;
  }

  .student-name {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .status-pill {
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0.28rem 0.55rem;
    border-radius: 999px;
    border: 1px solid transparent;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .status-pill.pending {
    background: rgba(59, 130, 246, 0.12);
    border-color: rgba(96, 165, 250, 0.3);
    color: #bfdbfe;
  }

  .status-pill.correta {
    background: rgba(34, 197, 94, 0.14);
    border-color: rgba(74, 222, 128, 0.34);
    color: #bbf7d0;
  }

  .status-pill.parcial {
    background: rgba(250, 204, 21, 0.14);
    border-color: rgba(250, 204, 21, 0.3);
    color: #fde68a;
  }

  .status-pill.incorreta {
    background: rgba(248, 113, 113, 0.14);
    border-color: rgba(248, 113, 113, 0.32);
    color: #fecaca;
  }

  .prompt-summary {
    color: var(--color-text);
    font-size: 0.84rem;
    line-height: 1.5;
  }

  .response-meta {
    color: var(--color-muted);
    font-size: 0.78rem;
  }

  .detail-card {
    padding: 1.15rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-height: 420px;
  }

  .detail-block,
  .review-form {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  .detail-label {
    color: var(--color-muted);
    font-size: 0.82rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .detail-value {
    color: var(--color-text);
    font-size: 0.98rem;
    line-height: 1.6;
    white-space: pre-wrap;
  }

  .response-text-box,
  .field-textarea,
  .field-input {
    width: 100%;
    background: rgba(15, 23, 42, 0.5);
    border: 1px solid var(--color-border);
    border-radius: 14px;
    color: var(--color-text);
    font: inherit;
  }

  .response-text-box {
    padding: 0.95rem 1rem;
    min-height: 150px;
    line-height: 1.6;
    white-space: pre-wrap;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .field-input {
    padding: 0.72rem 0.85rem;
  }

  .field-textarea {
    padding: 0.85rem 0.95rem;
    resize: vertical;
    min-height: 120px;
    line-height: 1.55;
  }

  .field-input:focus,
  .field-textarea:focus {
    border-color: var(--color-primary);
    outline: none;
  }

  .save-btn {
    align-self: flex-start;
    padding: 0.7rem 1.15rem;
    background: linear-gradient(135deg, var(--color-primary), #6d28d9);
    border: none;
    border-radius: var(--radius-md);
    color: white;
    font-weight: 700;
    cursor: pointer;
    transition: transform var(--transition-fast), box-shadow var(--transition-fast);
    box-shadow: 0 4px 18px rgba(139, 92, 246, 0.28);
  }

  .save-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 8px 26px rgba(139, 92, 246, 0.34);
  }

  .save-btn:disabled {
    opacity: 0.72;
    cursor: wait;
    transform: none;
    box-shadow: none;
  }

  .form-error,
  .form-success,
  .error-banner {
    font-size: 0.85rem;
    line-height: 1.45;
  }

  .form-error,
  .error-banner {
    color: #fecaca;
  }

  .form-success {
    color: #bbf7d0;
  }

  .error-banner,
  .empty-state,
  .center-state {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 1.25rem;
  }

  .empty-state {
    text-align: center;
    color: var(--color-muted);
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  .empty-state h3 {
    color: var(--color-text);
    font-size: 1.05rem;
  }

  .center-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.85rem;
    color: var(--color-muted);
  }

  .spinner {
    width: 34px;
    height: 34px;
    border: 3px solid var(--color-border);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 0.9s linear infinite;
  }

  @media (max-width: 860px) {
    .responses-layout {
      grid-template-columns: 1fr;
    }

    .responses-list {
      max-height: none;
    }
  }

  @media (max-width: 640px) {
    .responses-panel {
      gap: 1rem;
    }

    .panel-header {
      align-items: flex-start;
    }

    .detail-card,
    .responses-list {
      padding: 0.9rem;
    }

    .save-btn {
      width: 100%;
      justify-content: center;
    }
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
