# Estratégia

> O que importa agora. Prioridades, metas, prazos.

## Fase

Fases 1 e 2 concluídas em 2026-09-28. Fase 3 (Captura, Inbox, edição, status + Supabase/auth/RLS) concluída em 2026-09-28: migration aplicada no Supabase (pesazkdmmirxffhqkhhs) e fluxo testado de ponta a ponta com conta descartável; conta do Carlos criada e novos cadastros desligados (disable_signup). Agora usa ordem provisória (src/lib/priorities/agora.ts) até a Fase 5. Fase 4 (atributos: prazo, duração, energia, importância, urgência) concluída em 2026-09-28 com salvamento automático — React Hook Form descartado por não ser necessário.

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

## O que pode esperar

IA, voz, Google Calendar, notificações complexas, colaboração, gamificação, analytics, desktop completo, modo offline completo, UI de tags.

## Contexto com prazo

Sem prazo externo.
