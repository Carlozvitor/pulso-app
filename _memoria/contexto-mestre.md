# PULSO — Contexto mestre

> Versão condensada do documento mestre enviado pelo Carlos em 2026-09-28.
> Decisões aprovadas depois dele (que ajustam alguns pontos abaixo) estão em `estrategia.md`.

## Conceito

Pergunta central: **"O que merece minha atenção agora?"**
Não é um app de tarefas: reduz a carga mental e transforma muitas responsabilidades em uma próxima ação clara.
CAOS → CLAREZA → PRÓXIMA AÇÃO · Fluxo: CAPTURAR → ENTENDER → PRIORIZAR → AGIR.
Sensação desejada: "Eu não preciso resolver tudo agora. Só preciso saber o próximo passo."

Uso pessoal, não SaaS. Sem equipes, colaboração ou multiusuário. Arquitetura organizada e escalável, produto simples.

## Plataforma

Mobile é a experiência principal (uma mão, polegar). Web mobile-first com PWA: instalável, aparência de app, navegação por toque, sem comportamento de site. Desktop só depois.

## O que NÃO é

Clone de Notion/Trello/Todoist/Google Calendar, app de hábitos, gamificação, dashboard empresarial, cheio de gráficos, chatbot, cheio de configurações, dependente de IA.

## Princípios

1. Menos informação, mais direção.
2. Uma próxima ação é melhor que uma lista enorme.
3. Capturar em segundos — não exigir projeto, prioridade, tags, prazo, categoria nem energia na captura.
4. Organização não pode virar nova obrigação.
5. Não gerar culpa — nada de "você está atrasado/falhou/deveria". Linguagem neutra, humana, direta, útil, tranquila.

## Identidade

Dark + tecnológico + sofisticado + minimalista. Foco, clareza, tranquilidade, controle. Evitar cyberpunk, neon, gradientes/glass/sombras em excesso, excesso de cards/cores/bordas, animações decorativas. Paleta e tipografia em `identidade/design-guide.md`. Fonte: Geist.

## Navegação

Bottom navigation: **Agora | Inbox | + | Agenda | Mais**. O `+` central tem destaque (captura rápida). Zona do polegar, safe areas.

## Telas e funções

- **Agora** — coração do app. Sem dashboard, sem dezenas de números. Saudação, "O que merece atenção?", "Você tem N pendências", seções AGORA (1 tarefa + [Começar]), DEPOIS, MAIS TARDE. Quantidade limitada.
- **Captura rápida (+)** — "O que você precisa fazer?" + campo + [Adicionar]. Vai para a Inbox.
- **Inbox** — entrada de ideias/tarefas. "Você possui X itens para organizar", sem virar obrigação.
- **Tenho X minutos** — escolhe tempo (10/20/30/60/personalizado) e energia (Baixa/Normal/Alta); o PULSO monta uma sessão curta que cabe no tempo. Remove a decisão.
- **Projetos** — objetivos com começo e fim (ex.: CRUMB CLUB, AURA CAFÉ, PORTFÓLIO, PULSO): nome, descrição, status, progresso %, tarefas, prazo.
- **Áreas** — responsabilidades contínuas (Valentine, Faculdade, Pessoal, Trabalho, Finanças). Projetos pertencem a áreas.
- **Agenda** — não substitui calendário. Tarefas com prazo e próximos acontecimentos, visual simples.

## Tarefa

Campos: id, título, descrição, status, importância (0–5), urgência (0–5), energia (LOW/MEDIUM/HIGH), duração estimada (atalhos 5/10/15/20/30/45/60/90 + personalizada), prazo (hoje/amanhã/esta semana/data/sem prazo), projeto, área, tags, criação/atualização/conclusão.
Status: INBOX, TODO, IN_PROGRESS, DONE, ARCHIVED — não criar outros sem necessidade real.
Energia — LOW: mensagens, organizar, lançar dados · MEDIUM: estudar, revisar, escrever · HIGH: programar, criar, problemas complexos.

## Priorização

Camada independente dos componentes. Considera importância, urgência, prazo, duração, energia, status, contexto. Fórmula simples e fácil de mudar; o usuário não precisa entendê-la.

## Futuro (não no MVP)

Contexto (tempo + energia + área + local), IA (linguagem natural, prazos, categorização, quebra de tarefas), voz, Google Calendar, notificações complexas, colaboração, gamificação, analytics, integrações, desktop completo. O PULSO deve funcionar perfeitamente sem IA.

## Stack

Next.js (App Router) + TypeScript, Tailwind, shadcn/ui, Supabase (Postgres), Zod, React Hook Form, Lucide, PWA.

## UX mobile, gestos, animação, a11y, performance

- Bottom sheets, modais mobile, feedback imediato, loading e estados vazios, teclado virtual. Nada dependente de hover/mouse. Sem tabelas.
- Gestos só se intuitivos (deslizar p/ concluir/arquivar, long-press) e sempre com alternativa visível.
- Animações discretas: conclusão, bottom sheet, mudança de estado, feedback, progresso. Nada constante, longo ou que atrase.
- Contraste, foco, labels, semântica, alvos de toque, leitor de tela.
- Carregamento rápido, JS mínimo, sem dependência para tarefa pequena.

## MVP

Autenticação; criar/editar/concluir/arquivar tarefas; Inbox; Agora; importância, urgência, energia, duração, prazo; projetos; áreas; prioridade automática; "Tenho X minutos"; persistência Supabase; PWA; mobile-first.

## Componentes previstos

TaskCard, TaskItem, TaskComposer, QuickCapture, PriorityIndicator, EnergyIndicator, DurationBadge, ProjectCard, AreaCard, BottomNavigation, QuickAddButton, EmptyState, LoadingState, ErrorState, FocusSession. Nada de componentes gigantes.

## Comportamento do dev

Dev experiente que pensa em UX e produto. Em decisões importantes: identificar, explicar, recomendar, aguardar aprovação quando mudar o produto. Não inventar funcionalidades. Não mudar o conceito central sem explicar.

**Regra fundamental:** "Isso ajuda o usuário a saber o que merece sua atenção agora?" Se não, não entra agora.
