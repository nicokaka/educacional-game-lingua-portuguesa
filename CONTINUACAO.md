# 🧭 Alquimia Verbal — Guia de Continuação

> Última atualização: 14/03/2026 (deploy em produção no Vercel)
> Deadline do estágio: **25/03/2026** (faltam ~11 dias)

---

## Contexto do Projeto

Alquimia Verbal é um **jogo educacional gamificado de gramática portuguesa** para alunos do Ensino Fundamental II e EJA. O professor cria desafios, o aluno enfrenta monstros resolvendo questões.

**Mudança de arquitetura (11/03):** O projeto foi migrado de app desktop (Tauri + JSONC local) para **site web (Svelte 5 + Vite + Supabase)**. Agora o professor cria módulos no editor web, que são salvos no Supabase e ficam disponíveis em todos os PCs da escola automaticamente.

---

## Stack Atual

| Ferramenta | Versão | Propósito |
|---|---|---|
| Node.js | v24 | Runtime |
| Svelte | 5.x (Runes) | UI (compila pra JS puro) |
| Vite | 7.x | Bundler |
| json5 | 2.x | Parser JSONC (conteúdo legado) |
| @supabase/supabase-js | latest | Backend (banco PostgreSQL na nuvem) |

**Supabase Project:**
- URL: `https://uwimmumfxtbxckunspwr.supabase.co`
- Anon key: está no `.env` (não commitado)
- Organização: "Alquimia Verbal"
- Tabelas: `modules`, `challenges` (com RLS habilitado)

---

## Status Atual

### ✅ Pronto

| O quê | Arquivo(s) | Status |
|---|---|---|
| Scaffold | Svelte 5 + Vite | ✅ |
| Strategy Pattern | `src/lib/engine/challengeRegistry.js` | ✅ |
| Parser JSONC | `src/lib/engine/dataLoader.js` | ✅ |
| Fila de desafios | `src/lib/engine/challengeManager.js` | ✅ |
| Feedback (CSS + Audio) | `src/lib/engine/feedbackEngine.js` | ✅ |
| State management | `src/lib/stores/gameStore.svelte.js` | ✅ Svelte 5 Runes |
| Renderer: Arrastar | `src/lib/components/renderers/DragDropRenderer.svelte` | ✅ |
| Renderer: Múltipla escolha | `src/lib/components/renderers/MultipleChoiceRenderer.svelte` | ✅ |
| Renderer: V/F | `src/lib/components/renderers/TrueFalseRenderer.svelte` | ✅ |
| Renderer: Ordenação | `src/lib/components/renderers/OrderingRenderer.svelte` | ✅ |
| Host dinâmico | `src/lib/components/ChallengeHost.svelte` | ✅ |
| HUD (score, HP, combo) | `src/lib/components/shared/HUD.svelte` | ✅ |
| Design system | `src/app.css` | ✅ Dark theme |
| **Supabase Client** | `src/lib/supabase/client.js` | ✅ |
| **CRUD Módulos** | `src/lib/supabase/modules.js` | ✅ fetchModules, createModule, updateModule, deleteModule |
| **Router SPA** | `src/lib/router.svelte.js` | ✅ Hash-based (#/, #/play/:id, #/editor) |
| **App Shell** | `src/App.svelte` | ✅ Roteamento MenuScreen/GameScreen/EditorPage |
| **Menu do Aluno** | `src/lib/components/screens/MenuScreen.svelte` | ✅ Cards de módulos do Supabase |
| **Tela do Jogo** | `src/lib/components/screens/GameScreen.svelte` | ✅ Carrega desafios do Supabase |
| **Editor do Professor** | `src/lib/components/editor/EditorPage.svelte` | ✅ Login (senha `prof2026`) + CRUD |
| **Editor de Módulo** | `src/lib/components/editor/ModuleEditor.svelte` | ✅ Create/Edit com validação |
| **Form de Desafio** | `src/lib/components/editor/ChallengeForm.svelte` | ✅ Dinâmico por tipo |
| **Seletor de Tipo** | `src/lib/components/editor/TypeSelector.svelte` | ✅ Dropdown com descrições |
| **Banco de dados** | Supabase (tabelas + RLS + dados exemplo) | ✅ 7 desafios de exemplo |
| **Deploy em produção** | Vercel | ✅ https://alquimiaverbal.vercel.app/ |

### 🔲 Falta fazer

#### Fase F — Testes & Validação (prioridade altíssima)
- [x] Criar no editor um módulo de teste com os 4 tipos de desafio (coberto em E2E)
- [x] Jogar o módulo completo garantindo fluxo de vitória (coberto em E2E)
- [x] Testar falhas intencionais no jogo (dano, game over)
  - Coberto por testes unitários e E2E (incluindo fluxo de derrota / `game_over`)
- [x] Testar persistência de edição (editando módulo existente, coberto em E2E)

#### Fase G — Game Feel (prioridade média)
- [x] Arquivos de som `.ogg` reais (acerto, erro, vitória, derrota) em `public/sounds/`
- [x] Variação automática de monstros por módulo com sprites em `public/monstro*.png`
- [x] Animação de dano no monstro (CSS: scale, shake, opacity)
- [x] Animação de morte do monstro (CSS: desaparece + partículas)
- [x] Efeito de partículas no acerto (anel de impacto + sparks)

#### Fase H — PWA + Deploy (prioridade alta)
- [x] Instalar `vite-plugin-pwa`
- [x] Configurar manifesto PWA (atualmente definido em `vite.config.js`)
- [x] Configurar Service Worker para cache offline
- [x] Atualizar `index.html` com meta tags PWA e SEO
- [x] Deploy no Vercel (repositório conectado + env vars configuradas)
- [x] Testar offline (Service Worker cacheia assets)
- [ ] Testar em navegador de escola (Chrome/Edge)

#### Fase I — Documentação (prioridade média)
- [x] Atualizar `README.md` com a nova arquitetura
- [x] Escrever `docs/MANUAL_PROFESSOR.md`
- [x] Documentação do estágio

---

## Atualização técnica (14/03/2026)

- Editor do professor aprimorado com:
  - validação inline por pergunta
  - status visual `Pronta/Incompleta`
  - duplicação de pergunta
  - auto-save de rascunho em `localStorage` + restauração
- E2E modernizado:
  - `playwright.config.js` agora cross-platform (sem caminhos fixos de Windows)
  - novo arquivo `tests/e2e/pending-flows.spec.js` cobrindo:
    - fluxo completo com 4 tipos de desafio até vitória
    - dano por resposta errada
    - game over por sequência de erros
    - persistência de edição de módulo
- Fluxo de `game_over` implementado na UI com tela de derrota e reinício de rodada.
- Produção publicada em `https://alquimiaverbal.vercel.app/`.
- HUD e feedback ajustados: shake da tela só no erro, impacto local no monstro/HP no acerto.
- Pontuação final agora exibida como `pontos obtidos / pontos máximos do módulo`.
- Responsividade refinada para telas menores (ex.: 1366x768).
- Smoke test de produção executado em Chromium/Chrome e teste offline via service worker.

---

## Como rodar (dev)

```bash
cd educacional-game-lingua-portuguesa
npm install       # só na primeira vez
npm run dev       # abre em http://localhost:5173
```

**Senha do professor:** `prof2026` (configurável no `.env` como `VITE_PROFESSOR_PASSWORD`)

## Arquitetura — Mapa Mental Rápido

```
Professor → Editor Web (EditorPage) → Supabase (modules + challenges)
                                           ↓
                    MenuScreen (lista módulos) ← fetchModules()
                                           ↓
            Aluno clica no módulo → GameScreen → fetchModuleWithChallenges()
                                           ↓
                               challengeManager (embaralha)
                                           ↓
                    ChallengeHost → challengeRegistry → Renderer correto
                                           ↓
                               Aluno joga → submitAnswer()
                                           ↓
                            Validator (por tipo) → feedback
```

## Estrutura do Projeto

```
src/
├── App.svelte                              # Shell de roteamento
├── app.css                                 # Design system (dark theme + CSS tokens)
├── main.js                                 # Entry point
└── lib/
    ├── router.svelte.js                    # Hash router (Svelte 5 Runes)
    ├── supabase/
    │   ├── client.js                       # SDK init
    │   └── modules.js                      # CRUD módulos + challenges
    ├── engine/
    │   ├── challengeRegistry.js            # Strategy Pattern: tipo → renderer/validator
    │   ├── dataLoader.js                   # Parser JSONC + validação
    │   ├── challengeManager.js             # Fila + shuffle Fisher-Yates
    │   └── feedbackEngine.js               # Screen shake + Web Audio
    ├── stores/
    │   └── gameStore.svelte.js             # State genérico (Svelte 5 Runes)
    └── components/
        ├── ChallengeHost.svelte            # Host dinâmico (delega ao renderer)
        ├── screens/
        │   ├── MenuScreen.svelte           # Seleção de módulos (Supabase)
        │   └── GameScreen.svelte           # Tela do jogo
        ├── editor/
        │   ├── EditorPage.svelte           # Login + lista módulos professor
        │   ├── ModuleEditor.svelte         # Formulário do módulo
        │   ├── ChallengeForm.svelte        # Form dinâmico por tipo
        │   └── TypeSelector.svelte         # Dropdown de tipo
        ├── renderers/
        │   ├── DragDropRenderer.svelte     # Pointer Events + hit-test
        │   ├── MultipleChoiceRenderer.svelte
        │   ├── TrueFalseRenderer.svelte
        │   └── OrderingRenderer.svelte
        └── shared/
            └── HUD.svelte                  # Score, HP bar, combo streak
```

## Decisões que NÃO devem ser mudadas

1. **Svelte 5 Runes** (`$state`, `$derived`, `$effect`) — não usar stores antigos
2. **Pointer Events** pra drag & drop — não usar HTML5 Drag API nativa
3. **CSS animations** — não usar JS animations (compositor thread = performance)
4. **Dark theme** — os tokens estão em `app.css` como CSS Custom Properties
5. **Hash router** — usar `#/` pra compatibilidade com deploy estático
6. **Supabase** — backend único, não usar outro banco
7. **Senha do professor** via `VITE_PROFESSOR_PASSWORD` no `.env`
8. **JSONB `data`** — desafios têm campos genéricos (type, prompt, difficulty) + campo `data` JSONB com dados específicos do tipo

## Banco de Dados (Supabase)

**Tabela `modules`:** id (uuid PK), title (text), author (text), created_at, updated_at
**Tabela `challenges`:** id (uuid PK), module_id (FK → modules, CASCADE), type (text), prompt (text), difficulty (smallint 1-3), data (jsonb), sort_order (smallint), created_at

RLS habilitado em ambas com políticas permissivas (leitura/escrita pra todos — segurança feita via senha no frontend).

Schema SQL de setup está em `setup_supabase.sql` (já foi executado, não precisa rodar de novo).
