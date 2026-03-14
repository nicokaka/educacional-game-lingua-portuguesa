# Setup de Desenvolvimento

## 1) Pré-requisitos

- Node.js 24.x
- npm 10+
- Conta e projeto no Supabase

## 2) Instalação

```bash
npm install
```

## 3) Variáveis de ambiente

Crie um arquivo `.env` na raiz com base no `.env.example`:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_PROFESSOR_PASSWORD=prof2026
```

## 4) Rodar localmente

```bash
npm run dev
```

App local: `http://localhost:5173`

## 5) Build de verificação

```bash
npm run build
```

## Observações

- O projeto usa roteamento por hash (`#/`) para deploy estático.
- O backend esperado é Supabase (`modules` e `challenges`).
- SQL de base inicial: `setup_supabase.sql`.
