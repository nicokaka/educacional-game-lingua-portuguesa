# Relatorio de Estagio — Alquimia Verbal

## 1. Objetivo
Desenvolver e validar um jogo educacional web para ensino de gramatica portuguesa, com ferramenta de autoria para professores e jogabilidade gamificada para alunos.

## 2. Escopo Entregue
- Migracao da arquitetura desktop para web (Svelte 5 + Vite + Supabase).
- Editor web de modulos e desafios com CRUD completo.
- Suporte aos 4 tipos de desafio: drag and drop, multipla escolha, verdadeiro/falso e ordenacao.
- Sistema de combate com HP do monstro, energia do jogador, combo, pontuacao e penalidade por bizu.
- Fluxos finais de vitoria e game over com telas dedicadas.
- PWA com service worker e deploy em producao no Vercel.

## 3. Arquitetura
- Frontend: Svelte 5 (Runes) + Vite.
- Backend: Supabase (PostgreSQL + RLS).
- Router: hash router para compatibilidade com deploy estatico.
- Engine: challengeRegistry, challengeManager, gameSession e feedbackEngine.

## 4. Melhorias de UX implementadas
- Validacao inline e status de preenchimento no editor.
- Duplicacao de pergunta e autosave local de rascunho.
- Bizu sob demanda com penalidade e feedback visual de energia.
- Responsividade ajustada para resolucoes menores (ex.: 1366x768).
- Pontuacao final exibida como obtida/maxima do modulo.

## 5. Game Feel e Midia
- Sons em `public/sounds/`:
  - `correct.ogg`
  - `wrong.ogg`
  - `victory.ogg`
  - `gameover.ogg`
- Monstros por imagem em `public/monstro*.png`, com selecao automatica por modulo e fallback para SVG.
- Particulas e animacoes de impacto, dano e derrota.

## 6. Validacao Executada
- Testes unitarios (`npm test`) com casos de progresso, vitoria, game over e penalidade de bizu.
- Build de producao (`npm run build`) sem erros.
- Smoke test em producao:
  - URL: `https://alquimiaverbal.vercel.app/`
  - carregamento do menu e modulos: OK
  - service worker pronto: OK
  - reload offline apos cache inicial: OK
- Navegador Chromium/Chrome: validado.

## 7. URL de Producao
`https://alquimiaverbal.vercel.app/`

## 8. Pendencias Finais
- Validacao presencial em laboratorio da escola (Chrome/Edge no hardware alvo).

## 9. Resultado
O projeto foi concluido com arquitetura web escalavel, deploy ativo, editor funcional para professores e fluxo de jogo completo para alunos, incluindo comportamento offline basico via PWA.
