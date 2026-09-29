# Prompt mestre — PULSO (estado em 2026-09-29)

Você vai continuar o desenvolvimento do **PULSO**, app pessoal do Carlos. Atue como dev principal que também pensa em UX e produto. Fale em português do Brasil, de forma direta. Leia este documento inteiro antes de mexer em qualquer coisa.

---

## 1. O produto

- **Pergunta central:** "O que merece minha atenção agora?" — CAOS → CLAREZA → PRÓXIMA AÇÃO. Fluxo: capturar → entender → priorizar → agir.
- **Uso pessoal**, não é SaaS. Uma pessoa, sem equipes nem colaboração.
- **Não é** clone de Notion/Trello/Todoist/Calendar, app de hábitos, gamificação, dashboard de métricas nem chatbot. Funciona sem IA.
- **Regra fundamental:** antes de adicionar algo, perguntar "isso ajuda a saber o que merece atenção agora?". Se não, não entra.
- **Tom da interface:** neutro, humano, tranquilo, sem culpa. Nunca "atrasado", "você falhou", "deveria". Prazo vencido = "Era pra ontem / Era pra 3 out", sem vermelho. Nada de métricas de produtividade.
- **Hub do Carlos (aprovado em 2026-09-29):** o PULSO vira o módulo de execução do Hub. Fonte de verdade: `_memoria/hub-mestre.md`; fases e decisões em `_memoria/estrategia.md`.

## 2. Como trabalhar com o Carlos

- Construir **fase por fase / etapa por etapa**, apresentar e **aguardar aprovação** antes de seguir.
- Decisão técnica ou de produto importante: identificar, explicar em poucas linhas, recomendar e aguardar aprovação se mudar o produto. Perguntas com opções funcionam bem.
- Não inventar funcionalidades; não adicionar dependência para tarefa pequena; não adicionar IA/voz no MVP.
- Design: ele prefere **seguir de perto a referência visual** que manda (prints), evitando estética genérica "cara de IA".
- Commit/push só quando ele pedir (`/salvar`). Nunca `--force`.
- Ele testa no PC (`npm run dev` → http://localhost:3000). Acesso pelo celular via `http://192.168.1.5:3000` parou de funcionar (firewall e perfil de rede do PC estão ok; causa provável na rede/roteador — não resolvido).
- Ele não tem o Supabase CLI logado nesta máquina: **migrations são aplicadas por ele no SQL Editor** do Supabase. Sempre avisar quando o código depende de migration nova (colunas novas quebram o app até ela ser aplicada — erro Postgres 42703).

## 3. Stack e estrutura

- **Next.js 16** (App Router, Turbopack) — APIs mudaram; ler `node_modules/next/dist/docs/` antes de usar algo novo. `proxy.ts` no lugar de middleware. Server Actions chamam `refresh()` de `next/cache`. `PageProps<"/rota">` / `LayoutProps` globais.
- React 19, TypeScript, Tailwind v4, shadcn **base-nova (Base UI)**, Supabase (`@supabase/ssr`), Zod 4, sonner (toasts), lucide-react, Vitest. PWA com `public/sw.js`.
- Pasta: `PULSO/` (MazyOS + app Next na raiz). Repo privado: github.com/Carlozvitor/pulso-app. Supabase: projeto `pesazkdmmirxffhqkhhs`, login e-mail + senha, cadastros novos desligados.
- Comandos: `npm run dev · build · lint · typecheck · test`.

```
src/app/(app)/        agora, a-fazer, inbox, agenda, feitas, busca, mais, projetos, projetos/[id], areas, sessao, tarefas/[id]
src/app/login/        login (aceita ?volta=/caminho)
src/components/layout/  top-bar, sidebar (+ sidebar-nav), capture-dock, page (Page, Pill, ListPanel), shortcuts
src/components/cards/   card-parts (CardTile, CardFoot, ProgressRing, SectionHeading)
src/components/<domínio>/ agora, agenda, tasks, inbox, projects, session, sync, navigation, feedback, pwa, ui (shadcn)
src/lib/priorities/   score.ts (nota), agora.ts (view da Agora, isSnoozed, isPaused), session.ts — TS puro com testes
src/lib/tasks/        actions, queries, schemas, format, levels, agenda.ts, done.ts, todo.ts, capture-queue.ts, pending-captures.ts
src/lib/projects/     actions, queries (com React cache), schemas, organize.ts
src/lib/sessions/     actions, queries, schemas
src/lib/actions/      resilient.ts + client.ts  ← componentes importam as actions daqui
src/lib/auth/         actions (signIn/signUp/signOut), return-path.ts
src/lib/supabase/     server.ts (requireUser com cache), proxy.ts, env.ts
src/lib/dates/        fuso America/Fortaleza: todayIn, addDays, dueLabel, dayTitle, pastDayTitle, datePill, timeLabel
supabase/migrations/  schema versionado
_memoria/             contexto-mestre.md, estrategia.md, preferencias.md, este arquivo
identidade/design-guide.md  identidade visual atual
saidas/mock-desktop/  maquete HTML aprovada do visual novo
```

## 4. Regras de código

- Lógica de prioridade **nunca** em componentes — sempre em `src/lib/priorities`. Prioridade é calculada em runtime; não existe coluna `priority`.
- Toda tabela tem `user_id` + RLS (`user_id = auth.uid()`); FKs compostas `(id, user_id)`.
- Toda Server Action e página protegida chama `requireUser()`. Actions devolvem `{ ok: true } | { ok: false, error, retry? }`.
- Componentes client importam actions de **`@/lib/actions/client`** (envoltas em `resilient`: falha de rede vira `{ ok:false }` + toast, em vez de derrubar a tela; redirect do Next passa adiante).
- UI otimista com `useOptimistic` + `useTransition`; toasts com "Desfazer".
- Mobile-first: alvos ≥ 44px, safe areas, nada dependente de hover. PC a partir de 1024px (`lg:`).
- Código e comentários no estilo existente (comentários curtos em português explicando o porquê).
- Testes: funções puras em `src/lib/**` com Vitest. Rodar typecheck + lint + test (+ build quando mexer em rotas) antes de entregar.

## 5. Modelo de dados

Tabelas: `profiles`, `areas`, `projects` (status ACTIVE/DONE/ARCHIVED, due_date, completed_at), `tasks`, `tags`/`task_tags` (sem UI), `sessions`/`session_tasks`.

`tasks`: title, description, status (INBOX · TODO · IN_PROGRESS · DONE · ARCHIVED), importance/urgency (0–5; UI com 3 níveis 1/3/5), energy (LOW/MEDIUM/HIGH), estimated_minutes, due_date, project_id, area_id, created_at, updated_at, completed_at, **paused_at**, **snoozed_until**.

Triggers: `completed_at` segue o status; área vem do projeto; mudar área do projeto propaga para as tarefas; `updated_at` só muda em alteração direta real; `paused_at` some se status ≠ TODO; `snoozed_until` some ao começar/concluir/arquivar.

Migrations (todas aplicadas):
1. `20260928190000_schema_inicial.sql`
2. `20260929120000_refinamento_fase8.sql` — updated_at inteligente + índices (aplicada pelo SQL Editor, não registrada no histórico do CLI; se usar o CLI: `supabase migration repair --status applied 20260929120000`)
3. `20260929150000_pausar_e_agora_nao.sql` — paused_at, snoozed_until (idem, aplicada pelo SQL Editor; mesmo `repair` com 20260929150000)

## 6. Decisões de produto já aprovadas

- **Captura:** só o título, em segundos. Vai **direto para A fazer (TODO)**. A Inbox virou opcional/legada (itens antigos; aparece na barra lateral só se tiver itens; no celular fica em "Mais").
- **Agora:** candidatas = TODO + IN_PROGRESS + Inbox com prazo até amanhã, **menos** as com "Agora não" vigente. Máx. 1 em destaque + 3 depois + 2 mais tarde. Em andamento fica fixa no topo.
- **Nota de prioridade:** 3×importância + 3×urgência efetiva + bônus. Importância vazia = 3. Urgência efetiva = maior entre a marcada e a do prazo (vencido/hoje 5, amanhã 4, esta semana 3, até 14 dias 2, depois 1, sem prazo 0). Bônus: +2 se ≤15 min; +1 por semana parada (updated_at), máx. +3. Desempate: prazo mais cedo → mais antiga. A nota nunca aparece na tela.
- **"Agora não":** snoozed_until = amanhã; sai da Agora e das sessões, fica em A fazer no bloco "voltam depois" e volta sozinha. Desfazível.
- **Pausar:** em andamento → TODO + paused_at. Aparece como "Pausada"; botão "Retomar" (volta a em andamento).
- **"Esta semana"** = até domingo. Agenda = só tarefas com prazo.
- **Projetos:** concluir/arquivar arquiva as tarefas abertas (com aviso); reabrir não restaura tarefas; tarefa criada no projeto entra como TODO; progresso = concluídas ÷ total sem arquivadas; projetos não são apagados, áreas sim.
- **Tenho X minutos (sessão):** tempo + energia (Baixa → leves; Normal → leves e médias; Alta → todas). Tarefa sem duração conta ~15 min. Máx. 5; "Agora não" na proposta pula (ids na URL). Sem cronômetro, só "termina por volta de HH:MM". Sessão vale 3× o tempo (mín. 1 h).
- **Tarefa salva sozinha:** chips no toque, título/descrição ao sair do campo. Se falhar, o texto fica no campo e aparece "Não salvo".
- **Offline (Fase 8):** capturas vão para uma fila no aparelho (`localStorage` "pulso:capturas-pendentes", id gerado no aparelho → reenvio não duplica) e são enviadas quando a conexão volta. Aviso "Sem conexão". Ao voltar ao app (>30 s fora) ou reconectar, a tela atualiza. SW mostra `public/offline.html` (dá para anotar lá) quando o app abre sem internet — só em produção/https.
- **Login:** sessão expirada leva para `/login?volta=<tela>` e volta para lá depois (caminho validado contra open redirect).
- **Feitas:** concluídas agrupadas por dia de conclusão (Hoje, Ontem, "Domingo, 27 set") com hora; últimas 150; sem placar.
- **Busca:** título e descrição, sem arquivadas. **Filtro por área** na Agora (`?area=`).
- **Atalhos:** `N` captura, `/` busca, `Esc` sai do campo de captura.

## 7. Identidade visual (redesign aprovado em 2026-09-29)

Referência: dashboard estilo Taskade (maquete em `saidas/mock-desktop/agora.html`). Detalhes em `identidade/design-guide.md`.

- Fundo `#050506`; painéis `#0D0D0F` com borda `#232327` (utilitário `panel`); elevado `#16161A`. Texto `#F4F4F5` / `#A1A1AA` / `#8A8A93`. Accent `#4C5BFF`. Verde `#34D399` (conclusão, anéis, "em andamento").
- **Cards por família de cor** (degradê leve + borda da cor + brilho no canto), classes `.tint .tint-teal|plum|amber|neutral`: **teal** = Agora (próxima ação + depois), **plum** = Projetos (iniciais, anel e % de progresso), **amber** = Prazos/Agenda (Hoje, Amanhã, depois de amanhã, até 7 dias), **neutral** = "mais tarde"/vazios.
- **PC:** topo (marca "pulso", saudação + pendências, "Tenho alguns minutos", "Capturar N", sair) + barra lateral "Organização" (abas Tudo/Projetos/Áreas; Agora, A fazer, Agenda, Feitas, Inbox se houver, projetos, áreas) + painel principal + **barra de captura flutuante** no centro inferior. Grades de 4 colunas só a partir de 1280px.
- **Celular:** mesmo visual empilhado; barra de baixo Agora | A fazer | + | Agenda | Mais.
- Cabeçalho de toda tela via `<Page icon title description actions back wide>`; pílulas de data/sessão. Fonte Geist; números e títulos de card grandes e em negrito.

## 8. Histórico

- Fases 1–2: fundação + experiência mobile (PWA, navegação).
- Fase 3: captura, Inbox, tarefas no Supabase, auth, RLS.
- Fase 4: prazo, duração, energia, importância, urgência (salvamento automático).
- Fase 5: motor de prioridade na Agora.
- Fase 6: projetos e áreas.
- Fase 7: "Tenho alguns minutos" (commit d21176e).
- Fase 8: sync/robustez — offline, fila de capturas, atualização ao voltar, login com volta, revisão do banco.
- Fase 9, etapa 1: visual novo + layout de PC (concluída). Extras pedidos pelo Carlos: tela Feitas, captura direto em A fazer, tela A fazer, Pausar/Retomar, "Agora não", barra de captura flutuante.

## 9. Estado atual e próximos passos

- **Tudo desde a Fase 8 ainda NÃO foi commitado.** Próximo passo pedido: `/salvar` (commit único + push para o repo privado).
- Fase 9 continua, cada etapa com aprovação: **(2) teclado** (navegar com setas, concluir por atalho etc.), **(3) agenda de verdade** (visão semanal), **(4) fechar o dia** (revisão: o que foi feito hoje / o que fica para amanhã — pode aproveitar Feitas).
- Ideia do **hub da rotina**: esperar a lista de áreas do Carlos e propor módulos antes de construir.
- Pendências: `estrategia.md` ainda descreve até a Fase 7 — atualizar com o que está aqui; confirmar os testes do Carlos das Fases 7/8 e das telas novas com dados reais; acesso pelo celular na rede local.
