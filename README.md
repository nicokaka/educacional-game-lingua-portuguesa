# 🎮 Alquimia Verbal — O Jogo da Gramática

> Jogo educacional **Web e PWA** para ensino de gramática no Ensino Fundamental II e EJA.

[![Status](https://img.shields.io/badge/status-em%20producao-brightgreen)]()
[![Stack](https://img.shields.io/badge/stack-Svelte%205%20%2B%20Supabase-blueviolet)]()

---

## 📋 Sobre o Projeto

Uma **engine gamificada com ferramenta de autoria**:
- O **professor** cria desafios diversos (preenchimento, múltipla escolha, V/F, ordenação) usando um editor web integrado, salvos diretamente na nuvem (Supabase).
- O **aluno** joga pelo navegador (PC, Tablet ou Celular), enfrenta monstros e resolve as questões de gramática com mecânica de RPG.
- **Modo Offline:** O jogo é um PWA (Progressive Web App). Pode ser instalado e jogado mesmo quando a internet da escola cair.

## ✅ Estado Atual

- Produção publicada em `https://alquimiaverbal.vercel.app/`
- CRUD de módulos e desafios funcionando com Supabase
- Fluxo completo de jogo com vitória, `game over`, combo, pontuação e penalidade por bizu
- Monstros dinâmicos por módulo com sprites em `public/monstro*.png`
- Sons `.ogg`, animações de impacto e PWA com cache offline
- Documentação de uso e relatório de estágio concluídos

---

## 🏗️ Arquitetura e Stack

O projeto foi modernizado recentemente, migrando de Desktop (Tauri) para **Web Moderna (PWA)**:

| Camada | Tecnologia | Propósito |
|---|---|---|
| **UI** | Svelte 5 (Runes) | Compila pra JS puro, altíssima performance |
| **Backend** | Supabase | Banco PostgreSQL na nuvem para módulos e desafios |
| **Editor** | Componentes Svelte | Editor visual similar ao Google Forms |
| **Offline** | Vite PWA | Service Worker cacheia os assets e permite instalação |

---

## 🚀 Como Rodar e Fazer Deploy

**URL de produção:** `https://alquimiaverbal.vercel.app/`

**Passos para Desenvolvimento (Local):**
```bash
# 1. Instalar dependências
npm install

# 2. Rodar o servidor local (abre em http://localhost:5173)
npm run dev
```

**Senha do Professor:** Configure no arquivo `.env` a variável `VITE_PROFESSOR_PASSWORD=prof2026`. O padrão é `prof2026`.

**Deploy (Vercel ou similar):**
O projeto está pronto para Vercel. Basta conectar o repositório GitHub e configurar as variáveis de ambiente (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PROFESSOR_PASSWORD`). O comando de build já é o padrão (`npm run build`).

**Publicação contínua:**
- Cada `git push origin main` dispara um novo deploy automático no Vercel.
- Após o deploy ficar `Ready`, a produção já atualiza na URL oficial.

## 🧪 Validação

- `npm test` cobre progresso, vitória, `game over` e penalidade de bizu
- `npm run build` gera o pacote de produção sem erros
- Smoke test executado na URL publicada
- Service worker validado com reload offline após cache inicial

---

## 📚 Documentação Adicional

- [Setup de Desenvolvimento](./docs/SETUP_DEV.md) - Passos diretos para configurar ambiente local.
- [Manual do Professor](./docs/MANUAL_PROFESSOR.md) - Guia passo a passo de como criar e editar questões no jogo.
- [Relatório de Estágio](./docs/RELATORIO_ESTAGIO.md) - Entregas, arquitetura, validação e status final.
- [Continuação e Roadmap](./CONTINUACAO.md) - Contexto completo da arquitetura e próximas tarefas.
