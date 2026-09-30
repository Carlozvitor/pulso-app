# Identidade visual — PULSO

> Dark, tecnológico e com personalidade: painéis com moldura sobre fundo preto e cards
> coloridos por seção. Referência aprovada em 2026-09-29: estilo "dashboard Taskade"
> (maquete em `saidas/mock-desktop/`). A cor organiza a tela — cada seção tem a sua família.

---

## Cores

**Base**
- **Fundo:** `#050506` (quase preto)
- **Painel / listas:** `#0D0D0F` · **Elevado (campos, sheets, hover):** `#16161A`
- **Borda:** `#232327` · **Borda forte (botões, pílulas):** `#2E2E33`
- **Texto:** principal `#F4F4F5` · secundário `#A1A1AA` · discreto `#8A8A93` · muted (só não-texto) `#71717A`
- **Accent / captura:** `#4C5BFF` · **Accent suave (links, foco):** `#8B95FF`
- **Verde (conclusão, anéis de progresso, "em andamento", prazo futuro):** `#34D399`

**Famílias por seção** — card com degradê leve (160°, `a` → `b`), borda da mesma cor e brilho no canto superior esquerdo:

| Família | Seção | a / b | Borda | Selo | Tinta |
|---|---|---|---|---|---|
| **teal** | Agora (próxima ação, depois) | `#0C3A42` / `#081B20` | `#1D5C66` | `#0F4E59` | `#5EEAD4` |
| **plum** | Projetos | `#37195A` / `#180D28` | `#5A2F8C` | `#4A2478` | `#C9A7FF` |
| **amber** | Compromissos (módulo) e prazos | `#4D260C` / `#1F1007` | `#8A4818` | `#6D3510` | `#FDBA74` |
| **blue** | Trabalho (módulo) | `#0D2742` / `#08131F` | `#1F4B78` | `#143A63` | `#93C5FD` |
| **rose** | Faculdade (módulo), provas e entregas na agenda | `#3D1030` / `#1A0814` | `#6E2757` | `#5B1C47` | `#F9A8D4` |
| **neutral** | "Mais tarde", estados vazios | `#141417` / `#0D0D0F` | `#232327` | `#222227` | `#A1A1AA` |

Classes em `globals.css`: `.tint .tint-teal|plum|amber|blue|rose|neutral`, `.tint-tile`, utilitário `panel`.

**Nunca:** vermelho de "atraso" (prazo vencido é "Era pra …", neutro), neon, glassmorphism.

---

## Tipografia

- **Família:** Geist Sans (Geist Mono só em atalhos de teclado e contadores pequenos)
- **Escala:** celular 13 / 15 / 17 / 20 / 28 px · PC 13 / 14 / 15 / 20 / 24 px (tokens `--fs-*`) · inputs ≥ 16px no celular
- **Números e títulos de card:** grandes e em negrito (600–700) — `62%`, `3 tarefas`, título da próxima ação 28px
- **Rótulos de seção:** 13px, 600, caixa alta, espaçamento 0.1em

---

## Layout

- **PC (≥ 1024px):** topo (marca · saudação + pendências · "Tenho alguns minutos" · "Capturar N") + barra lateral fixa de 288px, recolhível para só ícones (68px) no botão do rodapé — Central, PULSO, Minha vida (módulos), Configurações + painel principal com moldura + **barra de captura flutuante** no centro, embaixo do painel principal (Enter adiciona à Inbox; N foca).
- **Cabeçalho de toda tela:** selo branco com ícone + título + subtítulo; pílulas à direita (data, "Sessão até…", "Em andamento" em verde).
- **Grades:** 4 colunas em telas largas (≥ 1280px), 2 abaixo disso; a próxima ação ocupa 2 colunas.
- **Celular:** mesma linguagem, cards empilhados (1 coluna para tarefas, 2 para projetos e dias) e navegação embaixo.
- **Listas** (Inbox, Áreas, busca) ficam dentro de um painel, com largura máxima de ~768px no PC.

---

## Elementos-chave

- Raios: 9 (selos, botões de card) · 10 (campos) · 12 (painéis e cards) · 20 (bottom sheets) · pílula para filtros
- Selo do card: 44–48px, cor da família; projetos usam as iniciais ("CC")
- Anel de progresso: 44px, trilho branco 10%, arco verde
- Filtros: pílulas cinza (`#5B5B61`); a ativa fica escura com contorno (`#1A1B24` / `#3B3E55`)
- Sombras: nenhuma — profundidade por cor e borda
- Botões: alvo mínimo 44px no celular; no PC podem ter 36–40px
- Movimento: 150–250ms ease-out; hover clareia o card (`brightness`); respeitar `prefers-reduced-motion`

---

## Regra do conteúdo

A referência é um dashboard, o PULSO não. Números só quando ajudam a agir
(progresso do projeto, quantas tarefas vencem no dia). Nada de métricas de produtividade.

---

## Logo

- **Arquivo:** ainda não existe (ícone PWA provisório em `public/icons/`). Marca provisória: anel azul com ponto `#4C5BFF` + "pulso" em minúsculas.
