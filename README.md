# 🎮 GramQuest — O Jogo da Gramática

> Jogo educacional **Web e PWA** para ensino de gramática no Ensino Fundamental II e EJA.

[![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow)]()
[![Stack](https://img.shields.io/badge/stack-Svelte%205%20%2B%20Supabase-blueviolet)]()

---

## 📋 Sobre o Projeto

Uma **engine gamificada com ferramenta de autoria**:
- O **professor** cria desafios diversos (preenchimento, múltipla escolha, V/F, ordenação) usando um editor web integrado, salvos diretamente na nuvem (Supabase).
- O **aluno** joga pelo navegador (PC, Tablet ou Celular), enfrenta monstros e resolve as questões de gramática com mecânica de RPG.
- **Modo Offline:** O jogo é um PWA (Progressive Web App). Pode ser instalado e jogado mesmo quando a internet da escola cair.

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

---

## 📚 Documentação Adicional

- [Manual do Professor](./docs/MANUAL_PROFESSOR.md) - Guia passo a passo de como criar e editar questões no jogo.
- [Continuação e Roadmap](./CONTINUACAO.md) - Contexto completo da arquitetura e próximas tarefas.
