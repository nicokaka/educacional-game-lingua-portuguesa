<script>
  let {
    score = 0,
    streak = 0,
    monsterHp = 100,
    maxMonsterHp = 100,
    playerHp = 100,
    maxPlayerHp = 100,
    monsterHit = false,
    playerHit = false,
    progress = {},
    moduleName = '',
  } = $props();

  let hpPercent = $derived(Math.max(0, Math.round((monsterHp / maxMonsterHp) * 100)));
  let hpColor = $derived(
    hpPercent > 60 ? '#4ade80' :
    hpPercent > 30 ? '#facc15' : '#f87171'
  );
  let playerHpPercent = $derived(Math.max(0, Math.round((playerHp / maxPlayerHp) * 100)));
  let playerHpColor = $derived(
    playerHpPercent > 60 ? '#60a5fa' :
    playerHpPercent > 30 ? '#facc15' : '#f87171'
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

    <div class="hp-section monster-section" class:hit={monsterHit}>
      <span class="hp-label">HP do Monstro</span>
      <div class="hp-bar-bg">
        <div
          class="hp-bar-fill"
          style="width: {hpPercent}%; background: {hpColor};"
        ></div>
      </div>
      <span class="hp-text monster-hp-text">{monsterHp}/{maxMonsterHp}</span>
    </div>

    <div class="hp-section player-section" class:hit={playerHit}>
      <span class="hp-label">Vida (HP)</span>
      <div class="hp-bar-bg">
        <div
          class="hp-bar-fill"
          style="width: {playerHpPercent}%; background: {playerHpColor};"
        ></div>
      </div>
      <span class="hp-text player-hp-text">{playerHp}/{maxPlayerHp}</span>
    </div>

    <!-- Streak -->
    <div class="stat-block">
      <span class="stat-label">Sequencia</span>
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

  .monster-section.hit .hp-bar-fill {
    animation: monster-hit-pulse 0.34s ease;
  }

  .monster-section.hit .hp-bar-bg {
    border-color: rgba(250, 204, 21, 0.7);
    box-shadow: 0 0 0 1px rgba(250, 204, 21, 0.25), 0 0 14px rgba(250, 204, 21, 0.24);
    animation: monster-hit-shake 0.34s cubic-bezier(0.36, 0.07, 0.19, 0.97);
  }

  @keyframes monster-hit-pulse {
    0% { transform: scaleY(1); filter: brightness(1); }
    50% { transform: scaleY(1.24); filter: brightness(1.3); }
    100% { transform: scaleY(1); filter: brightness(1); }
  }

  @keyframes monster-hit-shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-3px); }
    50% { transform: translateX(3px); }
    75% { transform: translateX(-2px); }
  }

  .player-section {
    position: relative;
    padding: 0.5rem 0.65rem 0.45rem;
    border-radius: 12px;
    border: 1px solid rgba(96, 165, 250, 0.2);
    background: linear-gradient(180deg, rgba(30, 41, 59, 0.95) 0%, rgba(17, 24, 39, 0.9) 100%);
    isolation: isolate;
  }

  .player-section::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: rgba(239, 68, 68, 0.25);
    opacity: 0;
    pointer-events: none;
    z-index: 0;
  }

  .player-section > * {
    position: relative;
    z-index: 1;
  }

  .player-section.hit {
    border-color: rgba(248, 113, 113, 0.65);
    box-shadow: 0 0 0 1px rgba(248, 113, 113, 0.3), 0 0 22px rgba(239, 68, 68, 0.32);
    animation: energy-shake 0.42s cubic-bezier(0.36, 0.07, 0.19, 0.97);
  }

  .player-section.hit::after {
    animation: energy-flash 0.42s ease;
  }

  .player-section.hit .hp-bar-fill {
    animation: player-hit-pulse 0.42s ease;
    background: #f87171 !important;
  }

  @keyframes player-hit-pulse {
    0% { transform: scaleY(1); filter: brightness(1); }
    50% { transform: scaleY(1.25); filter: brightness(1.25); }
    100% { transform: scaleY(1); filter: brightness(1); }
  }

  @keyframes energy-shake {
    0%, 100% { transform: translateX(0); }
    18% { transform: translateX(-4px); }
    36% { transform: translateX(5px); }
    54% { transform: translateX(-3px); }
    72% { transform: translateX(3px); }
  }

  @keyframes energy-flash {
    0% { opacity: 0; }
    25% { opacity: 1; }
    100% { opacity: 0; }
  }

  @keyframes pulse {
    from { transform: scale(1); }
    to { transform: scale(1.15); }
  }
</style>
