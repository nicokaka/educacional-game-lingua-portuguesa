# 🧭 GramQuest — Guia de Continuação

> Última atualização: 10/03/2026
> Deadline do estágio: **25/03/2026** (faltam ~15 dias)

---

## Status Atual

### ✅ Pronto (Fase 1 + 2)

| O quê | Arquivo | Status |
|---|---|---|
| Scaffold | Svelte 5 + Vite | ✅ Rodando |
| Strategy Pattern | `src/lib/engine/challengeRegistry.js` | ✅ |
| Parser JSONC | `src/lib/engine/dataLoader.js` | ✅ |
| Fila de desafios | `src/lib/engine/challengeManager.js` | ✅ |
| Feedback (CSS + Audio) | `src/lib/engine/feedbackEngine.js` | ✅ |
| State management | `src/lib/stores/gameStore.svelte.js` | ✅ |
| Renderer: Arrastar | `src/lib/components/renderers/DragDropRenderer.svelte` | ✅ |
| Renderer: Múltipla escolha | `src/lib/components/renderers/MultipleChoiceRenderer.svelte` | ✅ |
| Renderer: V/F | `src/lib/components/renderers/TrueFalseRenderer.svelte` | ✅ |
| Renderer: Ordenação | `src/lib/components/renderers/OrderingRenderer.svelte` | ✅ |
| Host dinâmico | `src/lib/components/ChallengeHost.svelte` | ✅ |
| HUD (score, HP, combo) | `src/lib/components/shared/HUD.svelte` | ✅ |
| App principal | `src/App.svelte` | ✅ 4 fases (menu/playing/victory/error) |
| Design system | `src/app.css` | ✅ Dark theme |
| Conteúdo exemplo | `content/exemplo_modulo.jsonc` | ✅ 7 desafios, 4 tipos |

### 🔲 Falta fazer

#### Fase 3 — Game Feel (prioridade alta)
- [ ] Arquivos de som `.ogg` reais (acerto, erro, vitória) em `src/assets/sounds/`
- [ ] Monstros SVG diferentes por sprite (hoje é um SVG genérico inline)
- [ ] Animação de dano no monstro (CSS: scale, shake, opacity)
- [ ] Animação de morte do monstro (CSS: desaparece)
- [ ] Efeito de partículas simples no acerto (opcional — CSS pseudo-elements)

#### Fase 4 — Editor do Professor (prioridade alta)
- [ ] Criar `src/lib/components/editor/TypeSelector.svelte` — dropdown de tipo
- [ ] Criar `src/lib/components/editor/ChallengeForm.svelte` — formulário dinâmico
- [ ] Página do editor em `src/App.svelte` (aba ou rota separada)
- [ ] Salvar `.jsonc` no disco via Tauri `fs` API
- [ ] Carregar `.jsonc` do disco (file picker)
- [ ] Salvar progresso do aluno em JSON local

#### Fase 5 — Build e Entrega
- [ ] Instalar Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- [ ] Instalar Tauri CLI: `npm install -D @tauri-apps/cli@latest`
- [ ] Inicializar Tauri: `npx tauri init`
- [ ] Configurar `tauri.conf.json` (window size, permissions, webview install mode)
- [ ] Build: `npm run tauri build` → gera `.msi` instalador
- [ ] Testar em máquina antiga (ou VM com CPU throttle)
- [ ] Escrever `docs/MANUAL_PROFESSOR.md`
- [ ] Documentação do estágio

---

## Como rodar (dev)

```bash
cd educacional-game-lingua-portuguesa
npm install       # só na primeira vez
npm run dev       # abre em http://localhost:5173
```

## Arquitetura — Mapa Mental Rápido

```
Professor → JSONC → dataLoader (valida) → challengeManager (embaralha)
                                              ↓
                                    gameStore (state genérico)
                                              ↓
                          ChallengeHost → challengeRegistry → Renderer correto
                                              ↓
                                    Aluno joga → submitAnswer()
                                              ↓
                                    Validator (por tipo) → feedback
```

**Regra de ouro**: Para adicionar um novo tipo de pergunta:
1. Criar `NovoTipoRenderer.svelte` em `src/lib/components/renderers/`
2. Adicionar 1 linha em `challengeRegistry.js` (renderer + validator)
3. Pronto — zero refactor no resto

## Decisões que NÃO devem ser mudadas

1. **Svelte 5 Runes** (`$state`, `$derived`, `$effect`) — não usar stores antigos
2. **Pointer Events** pra drag & drop — não usar HTML5 Drag API nativa
3. **CSS animations** — não usar JS animations (compositor thread = performance)
4. **json5** pra parser — suporta comentários no JSONC
5. **Dark theme** — os tokens estão em `app.css` como CSS Custom Properties

## Stack

| Ferramenta | Versão | Propósito |
|---|---|---|
| Node.js | v24 | Runtime |
| Svelte | 5.x | UI (compila pra JS puro) |
| Vite | 7.x | Bundler |
| json5 | 2.x | Parser JSONC |
| Tauri | 2.x (a instalar) | Empacotamento desktop |
