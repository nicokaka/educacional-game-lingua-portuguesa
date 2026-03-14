<script>
  let { seed = 0, sprite = '', class: className = '' } = $props();

  // 3 tipos de monstros
  let type = $derived(seed % 3);
  let spriteCandidates = $derived(resolveSpriteCandidates(sprite, seed));
  let candidateIndex = $state(0);
  let imageFailed = $state(false);
  let resolvedSprite = $derived(spriteCandidates[candidateIndex] || '');

  $effect(() => {
    spriteCandidates;
    candidateIndex = 0;
    imageFailed = false;
  });

  function resolveSpriteCandidates(value, monsterSeed) {
    const candidates = [];
    const raw = String(value || '').trim();
    const push = (entry) => {
      if (entry && !candidates.includes(entry)) {
        candidates.push(entry);
      }
    };

    const numericMatch = raw.match(/(?:monstro|monster)[_-]?0*(\d+)/i);
    const numberFromName = numericMatch ? Number(numericMatch[1]) : 0;

    if (raw) {
      push(resolveSpritePath(raw));
    }

    if (numberFromName > 0) {
      push(`/monstro${numberFromName}.png`);
      push(`/monster${numberFromName}.png`);
      push(`/monster_${String(numberFromName).padStart(2, '0')}.png`);
    }

    const fallbackIndex = (Math.abs(Number(monsterSeed) || 0) % 6) + 1;
    push(`/monstro${fallbackIndex}.png`);

    // Biblioteca de fallback: tenta os primeiros slots comuns sem depender do cadastro.
    for (let i = 1; i <= 8; i++) {
      push(`/monstro${i}.png`);
      push(`/monster${i}.png`);
    }

    return candidates;
  }

  function resolveSpritePath(rawValue) {
    const raw = String(rawValue || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith('/')) return raw;
    if (/\.[a-z0-9]+$/i.test(raw)) return `/${raw}`;
    return `/${raw}.png`;
  }

  function handleImageError() {
    if (candidateIndex < spriteCandidates.length - 1) {
      candidateIndex += 1;
      return;
    }

    imageFailed = true;
  }
</script>

{#if resolvedSprite && !imageFailed}
  <img
    src={resolvedSprite}
    alt="Monstro"
    class={className}
    loading="eager"
    decoding="async"
    onerror={handleImageError}
  />
{:else}
  <svg viewBox="0 0 120 120" class={className} aria-label="Monstro">
    {#if type === 0}
      <!-- Blob roxo -->
      <circle cx="60" cy="65" r="40" fill="#8b5cf6" opacity="0.2" />
      <circle cx="60" cy="60" r="35" fill="#7c3aed" />
      <circle cx="48" cy="50" r="8" fill="white" />
      <circle cx="72" cy="50" r="8" fill="white" />
      <circle cx="50" cy="50" r="4" fill="#0f172a" />
      <circle cx="74" cy="50" r="4" fill="#0f172a" />
      <path d="M 45 72 Q 60 65 75 72" stroke="#f87171" stroke-width="3" fill="none" stroke-linecap="round" />
    {:else if type === 1}
      <!-- Spiky vermelho -->
      <circle cx="60" cy="65" r="40" fill="#ef4444" opacity="0.2" />
      <polygon points="60,20 70,35 85,30 80,45 100,55 85,65 95,85 75,80 60,100 45,80 25,85 35,65 20,55 40,45 35,30 50,35" fill="#dc2626" />
      <circle cx="50" cy="55" r="7" fill="black" />
      <circle cx="70" cy="55" r="7" fill="black" />
      <circle cx="52" cy="53" r="2" fill="white" />
      <circle cx="72" cy="53" r="2" fill="white" />
      <path d="M 50 75 L 60 70 L 70 75" stroke="#fca5a5" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round" />
    {:else}
      <!-- Quadrado verde -->
      <rect x="20" y="25" width="80" height="80" rx="15" fill="#10b981" opacity="0.2" />
      <rect x="25" y="20" width="70" height="70" rx="10" fill="#059669" />
      <circle cx="60" cy="45" r="15" fill="white" />
      <circle cx="60" cy="45" r="6" fill="#0f172a" />
      <path d="M 40 70 Q 60 80 80 70" stroke="#bef264" stroke-width="4" fill="none" stroke-linecap="round" />
      <rect x="45" y="68" width="5" height="6" fill="white" rx="2" />
      <rect x="70" y="68" width="5" height="6" fill="white" rx="2" />
    {/if}
  </svg>
{/if}
