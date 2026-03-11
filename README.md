# 🎮 GramQuest — Engine Gamificada de Língua Portuguesa

> Jogo educacional offline para ensino de gramática no Ensino Fundamental II e EJA.
> Roda em hardware limitado (PCs antigos de escola pública), instalável via `.msi`.

[![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow)]()
[![Stack](https://img.shields.io/badge/stack-Svelte%205%20%2B%20Tauri%202-blueviolet)]()

---

## 📋 Sobre o Projeto

| Item | Detalhe |
|---|---|
| **Origem** | Estágio da Licenciatura em Computação (UFRPE) |
| **Cliente** | Professor de Português — Ensino Fundamental II e EJA |
| **Público** | Alunos de 11 a 14 anos |
| **Ambiente** | Laboratório de escola pública — 6 PCs, hardware limitado, internet instável |
| **Distribuição** | Instalador `.msi` para Windows (instalado nos 6 PCs do lab) |

### O Problema
O professor precisa prender a atenção dos alunos com gramática, mas os PCs são antigos e a internet é instável. Não pode depender de cloud, APIs ou ferramentas online.

### A Solução
Uma **engine gamificada com ferramenta de autoria**:
- O **professor** cria desafios diversos (preenchimento, múltipla escolha, V/F, ordenação) usando um editor visual integrado
- O **aluno** enfrenta monstros resolvendo os desafios de gramática com mecânica de RPG

---

## 🏗️ Stack

| Camada | Tecnologia | Por quê |
|---|---|---|
| **Empacotamento** | Tauri 2 | `.msi` de ~8 MB, ~20 MB RAM |
| **UI** | Svelte 5 (Runes) | Compila pra JS puro, zero runtime |
| **Drag & Drop** | Pointer Events (manual) | Zero dependência, zero leak |
| **Dados** | JSONC + json5 | Suporta comentários, validação no load |
| **Animações** | CSS Animations + SVG inline | GPU-accelerated, compositor thread |
| **Áudio** | Web Audio API | Buffers pré-carregados |

---

## 🎯 Tipos de Desafio Suportados

| Tipo | `type` no JSON | Mecânica |
|---|---|---|
| Arrastar e soltar | `drag_drop` | Mochila com palavras → arrastar pra lacuna |
| Múltipla escolha | `multiple_choice` | 4 alternativas, feedback por opção |
| Verdadeiro/Falso | `true_false` | Afirmação + explicação pós-resposta |
| Ordenação | `ordering` | Arrastar fragmentos na ordem correta |

> Extensível: adicionar novo tipo = 1 componente + 1 linha no registry. Zero refactor.

---

## 📁 Estrutura do Projeto

```
src/
├── App.svelte                              # App principal (menu/playing/victory/error)
├── app.css                                 # Design system (dark theme + CSS tokens)
├── main.js                                 # Entry point
└── lib/
    ├── engine/
    │   ├── challengeRegistry.js            # Strategy Pattern: tipo → renderer/validator
    │   ├── dataLoader.js                   # Parser JSONC + validação
    │   ├── challengeManager.js             # Fila + shuffle Fisher-Yates
    │   └── feedbackEngine.js               # Screen shake + Web Audio
    ├── stores/
    │   └── gameStore.svelte.js             # State genérico (Svelte 5 Runes)
    └── components/
        ├── ChallengeHost.svelte            # Host dinâmico (delega ao renderer)
        ├── renderers/
        │   ├── DragDropRenderer.svelte     # Pointer Events + hit-test
        │   ├── MultipleChoiceRenderer.svelte
        │   ├── TrueFalseRenderer.svelte
        │   └── OrderingRenderer.svelte
        └── shared/
            └── HUD.svelte                  # Score, HP bar, combo streak

content/
└── exemplo_modulo.jsonc                    # Template de conteúdo do professor
```

---

## 🛠️ Como Rodar

```bash
# Pré-requisitos: Node.js 18+
npm install
npm run dev         # Abre em http://localhost:5173
```

Para build final (requer Rust + Tauri CLI):
```bash
npm run tauri build  # Gera .msi em src-tauri/target/release/bundle/
```

---

## 📦 Exemplo de Conteúdo do Professor

```jsonc
{
  "module": "Ortografia - 6º ano",
  "author": "Prof. Silva",
  "challenges": [
    {
      "type": "drag_drop",
      "prompt": "O menino fez a _____ do trabalho.",
      "correctAnswer": "correção",
      "difficulty": 2,
      "monster": { "name": "Gram-Monstro", "sprite": "monster_01" },
      "loot": [
        { "text": "correção", "correct": true },
        { "text": "correçao", "correct": false }
      ]
    },
    {
      "type": "multiple_choice",
      "prompt": "Qual frase está correta?",
      "options": [
        { "text": "A professora corrigiu.", "correct": true },
        { "text": "A profesora corrijiu.", "correct": false }
      ]
    }
  ]
}
```

---

## 🗓️ Roadmap

- [x] **Fase 1**: Fundação (scaffold, engine, data loader)
- [x] **Fase 2**: Renderers (4 tipos) + HUD
- [ ] **Fase 3**: Game Feel (sons, animações de monstro)
- [ ] **Fase 4**: Editor visual do professor + salvar progresso
- [ ] **Fase 5**: Build `.msi` + testes em máquina real + documentação

> 📌 Detalhes completos de continuação em [`CONTINUACAO.md`](./CONTINUACAO.md)

---

## 📄 Licença

A definir.
