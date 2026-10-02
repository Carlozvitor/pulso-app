@AGENTS.md

# PULSO — MazyOS

> App pessoal, mobile-first (PWA), que responde uma pergunta:
> **"O que merece minha atenção agora?"** — CAOS → CLAREZA → PRÓXIMA AÇÃO.
> Roda em cima do MazyOS (memória, identidade, skills) junto com o código do app.

## O que é esse workspace

Desenvolvimento do PULSO, produto de uso pessoal do Carlos (não é SaaS). Claude atua
como dev principal, pensando também em UX e produto.

**Estrutura de pastas:**
- `_memoria/` — contexto do projeto, tom da interface, fase atual e decisões aprovadas
- `_memoria/hub-mestre.md` — documento mestre do Hub do Carlos (fonte de verdade de produto; o PULSO é o módulo de execução)
- `_memoria/contexto-mestre.md` — documento mestre do PULSO (ler antes de qualquer funcionalidade)
- `identidade/design-guide.md` — tokens de cor, tipografia, raios, movimento
- `src/app/(app)/` — rotas do app: central (página inicial do Hub), trabalho, trabalho/[id], faculdade, faculdade/[id] (disciplina; `?avaliacao=` abre a gaveta), dinheiro (`?mes=`, `?conta=`, `?lancamento=`), dinheiro/cartoes/[id] (`?fatura=`), dinheiro/[id], treino, treino/fazer/[id] (um treino), treino/exercicios, treino/exercicios/[id], treino/fichas/[id], treino/historico, treino/[id] (subitem de origem), compromissos, origens, configuracoes, agora, a-fazer, inbox, agenda, feitas, busca, mais, projetos, projetos/[id], areas, sessao, tarefas/[id]
- `src/app/login/` — autenticação (e-mail + senha)
- `src/components/ui/` — primitivos shadcn (base-nova / Base UI). Editar só tema/tokens
- `src/components/layout/` — moldura do app: topo e barra lateral (PC), `Page` (cabeçalho de tela), atalhos de teclado
- `src/components/cards/` — peças dos cards coloridos (selo, anel de progresso, rodapé)
- `src/components/<domínio>/` — navigation, tasks, inbox, agora, agenda, projects, session, sync, feedback, pwa, faculdade (gaveta de avaliação, cards de disciplina, aulas), dinheiro (gavetas de gasto/conta/cartão, listas, valor que o olho esconde), treino (card de hoje, frequência, evolução, treino em andamento, campo de adicionar exercício, fichas, gráfico do exercício)
- `src/lib/origins/` — árvore de origens (áreas por módulo), resumos por módulo/item, ações e consultas (TS puro com testes em tree/summary)
- `src/lib/events/` — compromissos: repetição semanal em ocorrências, visões (semana/hoje/próximos/concluídos), ações "só este / todos" (TS puro com testes)
- `src/lib/faculdade/` — avaliações (estado aberta/"era pra"/feita, nota, rótulos), resumo da tela e das disciplinas (TS puro com testes), consultas (`queries` = lista; `pages` = telas e barra lateral) e ações
- `src/lib/dinheiro/` — Dinheiro: meses, faturas/parcelas, resumo do mês e vencimentos (TS puro com testes), consultas (`queries`), telas (`pages`), ações e a ligação com tarefas (`links`)
- `src/lib/treino/` — Treino: formato das linhas (4×10 · 40 kg), comparação com a última vez, evolução, frequência, rodízio de fichas e o gráfico (TS puro com testes em treino.test.ts), consultas (`queries` = tudo do Treino em cache), telas e barra lateral/Central (`pages`) e ações
- `src/lib/central/` — síntese da Central (Agora + Hoje + Próximas atenções), TS puro com testes
- `src/lib/priorities/` — motor de prioridade e seleção de sessão (TS puro, com testes)
- `src/lib/{tasks,projects,sessions}/` — queries, server actions e schemas Zod
- `src/lib/actions/client.ts` — Server Actions para componentes (falha de rede vira `{ ok: false }`); componentes importam daqui
- `src/lib/supabase/` — clients (browser/server) e proxy de auth
- `src/lib/dates/` — datas no fuso do usuário (America/Fortaleza)
- `supabase/migrations/` — schema versionado
- `scripts/gerar-icones.mjs` — gera os ícones do PWA a partir de `identidade/logo-hub-simbolo.png` (`npm run icons`)
- `identidade/logo-hub-do-carlos.png` — logo oficial (2026-09-30); símbolo recortado em `identidade/logo-hub-simbolo.png` e `public/brand/hub-simbolo.png`
- `saidas/`, `marketing/`, `dados/` — pastas padrão do MazyOS

## Regras do projeto

- Regra fundamental: antes de adicionar algo, perguntar "Isso ajuda o usuário a saber o que merece sua atenção agora?"
- Construir fase por fase (ver `_memoria/estrategia.md`); ao fim de cada fase, apresentar e **aguardar aprovação**.
- Decisão técnica/de produto importante: identificar, explicar brevemente, recomendar, aguardar aprovação se mudar o produto.
- Mobile é a experiência principal: toque, uma mão, safe areas, alvos ≥ 44px, nada dependente de hover.
- Lógica de prioridade nunca dentro de componentes — sempre em `src/lib/priorities`.
- Prioridade é calculada em runtime; não existe coluna `priority` no banco.
- Toda tabela tem `user_id` + RLS.
- Linguagem da interface sem culpa (ver `_memoria/preferencias.md`).
- Não adicionar dependência para tarefa pequena. Não adicionar IA/voz no MVP.
- Next.js 16: ler `node_modules/next/dist/docs/` antes de usar APIs que possam ter mudado.

## Comandos

- `npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck` · `npm test`

---

## Regras do MazyOS

- No início de toda conversa, ler `_memoria/empresa.md`, `_memoria/preferencias.md` e `_memoria/estrategia.md` quando preenchidos. Não é preciso confirmar a leitura.
- Antes de executar uma tarefa, verificar se existe skill relevante em `.claude/skills/`.
- Quando o usuário corrigir algo ou der instrução duradoura, perguntar se quer salvar
  (projeto → `empresa.md`; estilo → `preferencias.md`; foco/fase → `estrategia.md`; regra → este arquivo).
- Ao terminar algo que mude o contexto (fase concluída, decisão nova, estrutura alterada), perguntar se atualiza a memória. `/atualizar` faz a varredura completa.
- Salvar no Git/GitHub: `/salvar`.
