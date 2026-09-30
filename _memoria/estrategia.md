# Estratégia

> O que importa agora. Prioridades, metas, prazos.

## Fase

Fases 1 e 2 concluídas em 2026-09-28. Fase 3 (Captura, Inbox, edição, status + Supabase/auth/RLS) concluída em 2026-09-28: migration aplicada no Supabase (pesazkdmmirxffhqkhhs) e fluxo testado de ponta a ponta com conta descartável; conta do Carlos criada e novos cadastros desligados (disable_signup). Fase 4 (atributos: prazo, duração, energia, importância, urgência) concluída em 2026-09-28 com salvamento automático — React Hook Form descartado por não ser necessário. Fase 5 (motor de prioridade, src/lib/priorities/score.ts) concluída em 2026-09-28. Fase 6 (projetos e áreas: /projetos, /projetos/[id], /areas, projeto/área na tarefa, nome do projeto nas listas) concluída e testada pelo Carlos em 2026-09-28, sem mudança no banco; cadastro inicial feito via dados/cadastro-inicial.sql (5 áreas; AURA CAFÉ, PORTFÓLIO e PULSO em Pessoal; CRUMB CLUB sem área). Fase 7 (Tenho X minutos: /sessao, src/lib/priorities/session.ts, src/lib/sessions/) com código pronto em 2026-09-28, sem mudança no banco; falta teste do Carlos. Teste no celular: npm run dev e abrir http://192.168.1.5:3000 (IP liberado em allowedDevOrigins).

### Hub do Carlos (2026-09-29)

Fase 8 e Fase 9 etapa 1 (visual novo + layout PC, com Feitas, A fazer, captura direto em TODO, "Agora não" e Pausar/Retomar) concluídas e salvas no GitHub em 2026-09-29. O Carlos entregou o documento mestre do **Hub do Carlos** (`_memoria/hub-mestre.md`, agora fonte de verdade de produto): o PULSO vira o módulo de execução dentro do Hub.

Decisões aprovadas (2026-09-29):
- O Hub é o PULSO crescendo: mesmo app, mesmo repo, mesmo Supabase.
- URLs atuais do PULSO ficam iguais (/agora, /a-fazer…); a Central vira a página inicial.
- Módulo só aparece na barra lateral quando estiver construído (sem telas "em breve").
- Áreas atuais viram origens: Valentine → Trabalho/Valentine; Faculdade → Faculdade; Pessoal → Vida pessoal; Trabalho → Trabalho; Finanças → Dinheiro.
- Fase 9 etapas pendentes: teclado vira polimento para depois (ficam N e /); agenda semanal entra na H3; "fechar o dia" em espera.

Fases do Hub (uma por vez, com aprovação):
- **H1. Casca + Central** — nome "Hub do Carlos", barra lateral nova, Central (Agora, Hoje, Próximas atenções, Captura). Sem banco novo. Código pronto em 2026-09-29 (Central em /central e página inicial; lógica em src/lib/central; Configurações em /configuracoes; Agora ficou só com tarefas; celular: Central · Agora · + · A fazer · Mais). Testada e aprovada pelo Carlos em 2026-09-29. ✔
- **H2. Origem + Trabalho** — código pronto em 2026-09-30, falta o Carlos aplicar `supabase/migrations/20260930120000_origens.sql` no SQL Editor, testar e aprovar. Decisões: áreas viraram origens (tabela `areas` com `parent_id`, `module`, `notes`, `position`; ids mantidos); módulos = raízes fixas (não apagam, não renomeiam); subitem herda o módulo; mover só dentro do módulo; item com subitens não apaga; links em `area_links`. Trabalho tem cor própria (azul). Telas: /trabalho (frentes + ações), /trabalho/[id] (contexto: anotação + links; ações do PULSO com campo de nova ação), /origens (editor da árvore, em Configurações; /areas redireciona). Campo "Origem" (árvore com busca) na tarefa, no projeto e em novo projeto. Filtro da Agora por módulo (inclui subitens). Central: card do Trabalho em "Minha vida". Migration testada em PGlite (24 verificações).
- **H3. Compromissos** — tabela própria (Agenda ≠ Tarefa), visão semanal, horários no "Hoje".
- **H4. Faculdade** · **H5. Dinheiro** · **H6. Projetos** (Pausado, objetivo, links) · **H7. Treino** · **H8. Vida pessoal**.

## Prioridade principal

MVP mobile-first seguindo as fases, uma de cada vez, com aprovação do Carlos entre elas:
1. Fundação · 2. Experiência mobile · 3. Captura e Inbox (+ Supabase schema/auth/RLS) · 4. Sistema de tarefas · 5. Agora · 6. Projetos e áreas · 7. Tenho X minutos · 8. Sync/refinamento Supabase · 9. Refinamento

## Decisões aprovadas (2026-09-28)

- `user_id` + RLS em todas as tabelas.
- Supabase entra no início da Fase 3 (não na 8).
- Prioridade calculada em runtime (`lib/priorities`), sem coluna `priority` no banco.
- Login por e-mail + senha (2026-09-28). O código OTP foi descartado: no plano gratuito com o SMTP padrão o Supabase não deixa editar templates (só manda link, que quebra no PWA do iOS). Autoconfirm ligado, senha mínima 8. Desligar novos cadastros depois da conta do Carlos.
- Agora = TODO + IN_PROGRESS + itens da Inbox com prazo hoje/amanhã. Máx. 6 tarefas.
- "Tenho X minutos": tarefa sem duração assume ~15 min.
- Área vem do projeto quando a tarefa tem projeto; projetos ganham `due_date`; `session_tasks` para sessões.
- Agenda no MVP = só tarefas com prazo (sem compromissos).
- Accent `#4C5BFF`; texto discreto `#8A8A93` (o `#71717A` falha em contraste para texto).

- Tarefa salva sozinha: chips salvam no toque, título/descrição ao sair do campo (sem botão Salvar).
- Importância/urgência na UI com 3 níveis (Baixa/Média/Alta = 1/3/5 no banco).
- "Esta semana" = até domingo. Prazo vencido aparece como "Era pra …", nunca "atrasado".
- Prioridade (Fase 5): nota = 3×importância + 3×urgência efetiva + bônus. Importância sem valor = Média (3). Urgência efetiva = maior entre a marcada e a do prazo (vencido/hoje 5, amanhã 4, esta semana 3, até 14 dias 2, depois 1, sem prazo 0). Bônus: +2 se ≤15 min; +1 por semana parada (updatedAt), máx. +3. Desempate: prazo mais cedo → mais antiga. Em andamento fica fixo no topo. Energia fora da Agora (usada na Fase 7). Nota nunca aparece na tela.
- Projetos (Fase 6): concluir/arquivar projeto arquiva junto as tarefas abertas (com aviso); reabrir não restaura tarefas. Tarefa criada dentro do projeto entra como TODO. Prazo do projeto não entra na nota (rever na Fase 9). Progresso = concluídas ÷ total sem arquivadas. Projetos não são apagados; áreas sim (projetos/tarefas ficam sem área). Ícone/cor de área fora da UI.
- Sessão (Fase 7): entrada discreta na Agora ("Tenho alguns minutos"). Candidatas = as da Agora, filtradas por energia (Baixa → leves; Normal → leves e médias; Alta → todas, pesadas +3); sem energia marcada cabe em qualquer sessão. Ordem pela nota, em andamento primeiro; coloca o que ainda cabe, máx. 5; tarefa maior que o tempo não entra. "Agora não" tira e puxa a próxima (ids na URL). Sem cronômetro: só "termina por volta de HH:MM". Sessão salva no banco; vale por 3× o tempo (mín. 1 h) e depois é esquecida sem cobrança. Na sessão a energia média se chama "Normal".

## O que pode esperar

IA, voz, Google Calendar, notificações complexas, colaboração, gamificação, analytics, desktop completo, modo offline completo, UI de tags.

## Contexto com prazo

Sem prazo externo.
