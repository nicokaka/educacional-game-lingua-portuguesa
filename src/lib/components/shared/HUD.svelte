<script>
  let { score = 0, streak = 0, monsterHp = 100, maxMonsterHp = 100, progress = {}, moduleName = '' } = $props();

  let hpPercent = $derived(Math.max(0, Math.round((monsterHp / maxMonsterHp) * 100)));
  let hpColor = $derived(
    hpPercent > 60 ? '#4ade80' :
    hpPercent > 30 ? '#facc15' : '#f87171'
  );
</script>

<div class="hud">
  <div class="hud-top">
    <div class="module-name">{moduleName}</div>
    <div class="progress-info">
      {progress.current || 0}/{progress.total || 0}
    </div>
  </div>

  <div class="hud-main">
    <!-- Score -->
    <div class="stat-block">
      <span class="stat-label">Pontos</span>
      <span class="stat-value score-value">{score}</span>
    </div>

    <!-- HP Bar -->
    <div class="hp-section">
      <span class="hp-label">HP do Monstro</span>
      <div class="hp-bar-bg">
        <div
          class="hp-bar-fill"
          style="width: {hpPercent}%; background: {hpColor};"
        ></div>
      </div>
      <span class="hp-text">{monsterHp}/{maxMonsterHp}</span>
    </div>

    <!-- Streak -->
    <div class="stat-block">
      <span class="stat-label">Combo</span>
      <span class="stat-value streak-value" class:on-fire={streak >= 3}>
        {#if streak >= 3}🔥{/if}
        x{streak}
      </span>
    </div>
  </div>
</div>

<style>
  .hud {
    width: 100%;
    background: var(--color-surface, #1e293b);
    border: 1px solid var(--color-border, #334155);
    border-radius: 16px;
    padding: 1rem 1.5rem;
  }

  .hud-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--color-border, #334155);
  }

  .module-name {
    font-size: 0.85rem;
    color: var(--color-muted, #94a3b8);
    font-weight: 500;
  }

  .progress-info {
    font-size: 0.8rem;
    color: var(--color-muted, #94a3b8);
    background: rgba(139, 92, 246, 0.1);
    border: 1px solid rgba(139, 92, 246, 0.2);
    padding: 0.2rem 0.6rem;
    border-radius: 20px;
  }

  .hud-main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;
  }

  .stat-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
    min-width: 70px;
  }

  .stat-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-muted, #94a3b8);
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
  }

  .score-value {
    color: #facc15;
  }

  .streak-value {
    color: var(--color-primary, #8b5cf6);
    transition: all 0.3s ease;
  }

  .streak-value.on-fire {
    color: #f97316;
    animation: pulse 0.6s ease-in-out infinite alternate;
  }

  .hp-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
  }

  .hp-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-muted, #94a3b8);
  }

  .hp-bar-bg {
    width: 100%;
    height: 14px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 7px;
    overflow: hidden;
    border: 1px solid var(--color-border, #334155);
  }

  .hp-bar-fill {
    height: 100%;
    border-radius: 7px;
    transition: width 0.5s ease, background 0.5s ease;
  }

  .hp-text {
    font-size: 0.75rem;
    color: var(--color-muted, #94a3b8);
  }

  @keyframes pulse {
    from { transform: scale(1); }
    to { transform: scale(1.15); }
  }
</style>
