# 🧭 GramQuest — Guia de Continuação

> Última atualização: 11/03/2026
> Deadline do estágio: **25/03/2026** (faltam ~14 dias)

---

## Contexto do Projeto

GramQuest é um **jogo educacional gamificado de gramática portuguesa** para alunos do Ensino Fundamental II e EJA. O professor cria desafios, o aluno enfrenta monstros resolvendo questões.

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

### 🔲 Falta fazer

#### Fase F — Game Feel (prioridade média)
- [ ] Arquivos de som `.ogg` reais (acerto, erro, vitória) em `public/sounds/`
- [ ] Monstros SVG diferentes por sprite (hoje é um SVG genérico inline)
- [ ] Animação de dano no monstro (CSS: scale, shake, opacity)
- [ ] Animação de morte do monstro (CSS: desaparece + partículas)
- [ ] Efeito de partículas simples no acerto (CSS pseudo-elements)

#### Fase G — PWA + Deploy (prioridade alta)
- [ ] Instalar `vite-plugin-pwa`
- [ ] Criar `public/manifest.json` (ícone, nome, cores do tema)
- [ ] Configurar Service Worker para cache offline
- [ ] Atualizar `index.html` com meta tags PWA e SEO
- [ ] Deploy no Vercel (conectar repo GitHub, adicionar env vars)
- [ ] Testar offline (Service Worker cacheia assets)
- [ ] Testar em navigador de escola (Chrome/Edge)

#### Fase H — Documentação (prioridade média)
- [ ] Atualizar `README.md` com a nova arquitetura
- [ ] Escrever `docs/MANUAL_PROFESSOR.md`
- [ ] Documentação do estágio

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
