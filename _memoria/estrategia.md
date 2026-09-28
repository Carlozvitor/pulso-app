# Estratégia

> O que importa agora. Prioridades, metas, prazos.

## Fase

Fases 1 (Fundação) e 2 (Experiência mobile) concluídas em 2026-09-28. Próxima: Fase 3 — Captura e Inbox + Supabase (aguardando aprovação). A Agora ainda usa dados de exemplo (src/lib/tasks/sample.ts; ?estado=vazio mostra o vazio).

## Prioridade principal

MVP mobile-first seguindo as fases, uma de cada vez, com aprovação do Carlos entre elas:
1. Fundação · 2. Experiência mobile · 3. Captura e Inbox (+ Supabase schema/auth/RLS) · 4. Sistema de tarefas · 5. Agora · 6. Projetos e áreas · 7. Tenho X minutos · 8. Sync/refinamento Supabase · 9. Refinamento

## Decisões aprovadas (2026-09-28)

- `user_id` + RLS em todas as tabelas.
- Supabase entra no início da Fase 3 (não na 8).
- Prioridade calculada em runtime (`lib/priorities`), sem coluna `priority` no banco.
- Login por código OTP de 6 dígitos (funciona dentro do PWA instalado no iOS).
- Agora = TODO + IN_PROGRESS + itens da Inbox com prazo hoje/amanhã. Máx. 6 tarefas.
- "Tenho X minutos": tarefa sem duração assume ~15 min.
- Área vem do projeto quando a tarefa tem projeto; projetos ganham `due_date`; `session_tasks` para sessões.
- Agenda no MVP = só tarefas com prazo (sem compromissos).
- Accent `#4C5BFF`; texto discreto `#8A8A93` (o `#71717A` falha em contraste para texto).

## O que pode esperar

IA, voz, Google Calendar, notificações complexas, colaboração, gamificação, analytics, desktop completo, modo offline completo, UI de tags.

## Contexto com prazo

Sem prazo externo.
