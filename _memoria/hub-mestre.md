# HUB DO CARLOS

## Documento Mestre do Produto

**Versão:** 1.0
**Status:** Arquitetura conceitual aprovada (recebida em 2026-09-29)
**Objetivo:** Servir como fonte de verdade para produto, UX, arquitetura e futura implementação no Claude Code.

---

# 1. VISÃO DO PRODUTO

O **Hub do Carlos** é o sistema pessoal central do Carlos.

Ele existe para reunir, em um único lugar, os principais contextos da sua vida:

* Trabalho
* Faculdade
* Dinheiro
* Treino
* Projetos
* Compromissos
* Vida pessoal

O Hub não deve ser um clone de Notion, Trello, Todoist ou um dashboard genérico.

Seu propósito é responder de forma simples:

> **"O que está acontecendo na minha vida e o que merece minha atenção agora?"**

O Hub funciona como a **casa central**.

Os módulos organizam o contexto da vida.

O **PULSO** funciona como o motor de execução.

---

# 2. PRINCÍPIO CENTRAL

A arquitetura do produto deve seguir três conceitos:

### 1. Módulos = contexto

Os módulos armazenam informações e contexto sobre determinada área da vida.

Exemplo:

> Faculdade → Marketing → Trabalho final → prazo sexta-feira

### 2. PULSO = execução

O PULSO transforma aquilo que precisa ser feito em ações concretas.

Exemplo:

> "Finalizar introdução do trabalho"

### 3. Central = síntese

A Central reúne somente aquilo que merece atenção naquele momento.

Não deve mostrar tudo.

---

# 3. HIERARQUIA GERAL

```text
HUB DO CARLOS
│
├── ⚡ Central
│
├── 🧠 PULSO
│
├── 💼 Trabalho
├── 🎓 Faculdade
├── 💰 Dinheiro
├── 🏋️ Treino
├── 🚀 Projetos
├── 📅 Compromissos
│
├── 👤 Vida pessoal
│
└── ⚙️ Configurações
```

A Central e o PULSO possuem posição especial.

A Central é a porta de entrada.

O PULSO é o principal sistema de execução.

Os demais módulos representam contextos da vida.

---

# 4. FILOSOFIA DO PRODUTO

O Hub deve preservar a filosofia original do PULSO:

> **CAOS → CLAREZA → PRÓXIMA AÇÃO**

E:

> **Capturar → Entender → Priorizar → Agir**

A pergunta central permanece:

> **"O que merece minha atenção agora?"**

O produto deve ser calmo, direto e sem gerar sensação de culpa ou sobrecarga.

Não devemos adicionar funcionalidades simplesmente porque são comuns em aplicativos de produtividade.

Toda funcionalidade precisa justificar sua existência pela capacidade de ajudar o usuário a compreender, organizar ou agir.

O PULSO já possui essa filosofia documentada e implementada como núcleo de execução.

---

# 5. CENTRAL

A Central é a tela inicial do Hub.

Ela deve permitir que Carlos compreenda sua situação em poucos segundos.

## 5.1 Agora

Principal área da Central.

Mostra as ações mais relevantes vindas do PULSO.

Pergunta respondida:

> **"O que eu deveria fazer agora?"**

## 5.2 Hoje

Mostra acontecimentos relevantes do dia:

* compromissos;
* horários;
* prazos de hoje;
* eventos importantes.

## 5.3 Próximas atenções

Mostra informações que ainda não exigem ação imediata, mas merecem atenção.

Exemplos:

* trabalho da faculdade vencendo amanhã;
* fatura chegando;
* entrega de projeto;
* compromisso importante próximo.

## 5.4 Áreas

Acesso rápido aos principais módulos:

* Trabalho
* Faculdade
* Dinheiro
* Treino
* Projetos
* Compromissos
* Vida pessoal

## 5.5 Captura rápida

A Central deve permitir registrar rapidamente algo que esteja na cabeça do usuário.

Exemplo:

> "Preciso mandar o post da Valentine amanhã."

Isso pode entrar inicialmente no PULSO para posterior organização.

---

# 6. PULSO

O PULSO deixa de ser o aplicativo inteiro e passa a ser um **módulo central do Hub**.

Seu papel:

> **Transformar contexto em execução.**

A estrutura e funcionalidades já existentes do PULSO devem ser preservadas como base.

Entre elas:

* Captura
* A Fazer
* Agora
* Agora não
* Projetos
* Semana
* Feitas
* Busca
* Sessões
* Prioridade
* Pausar / retomar
* Atalhos
* Autosave
* Offline/PWA

Essas funcionalidades fazem parte do estado atual aprovado do PULSO.

O redesign visual aprovado e a estrutura atual também devem ser aproveitados, evitando reconstrução desnecessária.

---

# 7. REGRA FUNDAMENTAL: CONTEXTO ≠ AÇÃO

Uma das regras mais importantes do Hub:

> **Informação não é automaticamente uma tarefa.**

Exemplo:

### Dinheiro

> Fatura vence dia 5.

Isso é uma informação/obrigação financeira.

Não precisa automaticamente virar uma tarefa.

Se Carlos decidir:

> "Vou pagar a fatura hoje."

Então existe uma ação no PULSO:

> **Pagar fatura do cartão**

---

# 8. REGRA FUNDAMENTAL: UMA AÇÃO = UMA TAREFA

Os módulos não devem possuir sistemas paralelos de tarefas.

Exemplo:

A Faculdade pode possuir:

> Trabalho final de Marketing
> Prazo: sexta-feira

O PULSO pode possuir:

> Finalizar introdução do trabalho

A tarefa existe uma única vez.

Ela pertence ao PULSO, mas possui contexto de origem.

---

# 9. ORIGEM HIERÁRQUICA

Toda tarefa do PULSO pode possuir uma origem hierárquica.

Exemplo:

```text
Trabalho
└── Valentine
    └── Conteúdo
        └── Instagram
```

Ou:

```text
Projetos
└── CRUMB CLUB
```

Ou:

```text
Faculdade
└── Marketing Digital
```

Isso permite que uma tarefa seja executada pelo PULSO sem perder o contexto de onde ela veio.

Exemplo:

> ⚡ Criar legenda do Reels

Origem:

> Trabalho → Valentine → Conteúdo → Instagram

---

# 10. MÓDULO — TRABALHO

O módulo Trabalho reúne toda a atividade profissional.

```text
💼 Trabalho
│
├── Valentine
│   ├── Conteúdo
│   ├── Administrativo
│   ├── Demandas da empresa
│   └── Outros
│
└── Clientes / Freelance
    ├── Clientes
    ├── Propostas
    ├── Entregas
    └── Follow-ups
```

O módulo pode armazenar:

* informações;
* contatos;
* projetos;
* prazos;
* links;
* arquivos;
* histórico;
* contexto.

As ações concretas continuam no PULSO.

---

# 11. MÓDULO — FACULDADE

A Faculdade funciona como centro acadêmico.

```text
🎓 Faculdade
│
├── Disciplinas
├── Trabalhos
├── Provas
├── Atividades
├── Prazos
├── Notas
├── Materiais
└── Horários de estudo
```

Uma disciplina pode conter:

```text
Disciplina
├── Notas
├── Materiais
├── Trabalhos
└── Provas
```

O módulo registra o contexto.

O PULSO registra as ações.

---

# 12. MÓDULO — DINHEIRO

O módulo financeiro será pessoal e simples.

Não deve tentar ser um banco ou sistema contábil completo.

```text
💰 Dinheiro
│
├── Entradas
├── Gastos
├── Contas
├── Cartões
├── Parcelas
└── Compromissos futuros
```

Deve permitir acompanhar:

### Entradas

* salário;
* freelas;
* outros recebimentos.

### Gastos

* gastos realizados;
* categorias;
* histórico.

### Contas

* contas recorrentes;
* vencimentos;
* situação.

### Cartões

* cartões;
* faturas;
* vencimentos;
* utilização.

### Parcelas

* compras parceladas;
* quantidade;
* valor;
* próximas parcelas.

### Compromissos futuros

* pagamentos futuros;
* despesas previstas;
* obrigações financeiras.

---

# 13. MÓDULO — TREINO

O módulo Treino deve permanecer simples.

Não deve tentar competir com aplicativos especializados de academia.

```text
🏋️ Treino
│
├── Treino do dia
├── Exercícios
├── Histórico
├── Objetivos
└── Frequência
```

Cada exercício pode registrar:

* séries;
* repetições;
* carga.

Também deve existir:

* histórico;
* evolução;
* objetivos;
* frequência.

A Agenda pode registrar:

> Academia — 20:00

Enquanto o PULSO só recebe uma ação quando realmente existir uma ação concreta.

---

# 14. MÓDULO — PROJETOS

Projetos organizam trabalhos maiores e de longo prazo.

```text
🚀 Projetos
│
├── Em andamento
├── Pausados
├── Concluídos
└── Arquivados
```

Cada projeto pode possuir:

* nome;
* objetivo;
* status;
* prazo;
* próximas etapas;
* links;
* arquivos;
* ações relacionadas.

Exemplos:

* NEXOS
* CRUMB CLUB
* AURA CAFÉ
* Portfólio
* PULSO
* Hub do Carlos

O projeto fornece contexto.

As ações continuam no PULSO.

---

# 15. PROGRESSO DOS PROJETOS

Cada projeto pode possuir uma indicação simples de progresso.

Exemplo:

> CRUMB CLUB
> ███████░░░ 70%

O progresso pode ser calculado a partir das etapas/tarefas relacionadas ao projeto.

Não criar um sistema complexo de gerenciamento de projetos.

O objetivo é responder:

> **"Em que estado está esse projeto?"**

---

# 16. MÓDULO — COMPROMISSOS

Compromissos representam **quando algo acontece**.

```text
📅 Compromissos
│
├── Hoje
├── Próximos
├── Calendário
└── Concluídos
```

Um compromisso pode conter:

* título;
* data;
* horário;
* duração;
* local;
* descrição;
* área relacionada;
* lembrete.

Exemplos:

* consultas;
* reuniões;
* aulas;
* academia;
* compromissos familiares;
* eventos;
* horários importantes;
* entregas com horário definido.

---

# 17. REGRA: AGENDA ≠ TAREFA

Essa distinção é fundamental:

> **Agenda = quando algo acontece.**
> **PULSO = o que você precisa fazer.**

Exemplo:

```text
📅 Reunião com cliente
Sexta — 14:00
```

É um compromisso.

Enquanto:

```text
⚡ Preparar apresentação para reunião
```

É uma tarefa do PULSO.

Os dois podem estar relacionados.

---

# 18. AGENDA TRANSVERSAL

Os módulos podem alimentar a Agenda.

```text
🎓 Faculdade → Prova de Marketing — 19:00 → 📅 Agenda
🏋️ Treino → Academia — 20:00 → 📅 Agenda
💼 Trabalho → Reunião com cliente — 14:00 → 📅 Agenda
```

O Hub deve possuir **uma única visão de compromissos**.

---

# 19. MÓDULO — VIDA PESSOAL

A Vida pessoal reúne aquilo que não pertence aos demais módulos.

```text
👤 Vida pessoal
│
├── Coisas pessoais
├── Casa
├── Família
├── Compras
├── Objetivos pessoais
└── Informações importantes
```

* **Coisas pessoais** — pendências e informações gerais da vida pessoal.
* **Casa** — coisas para resolver, organizar ou manter.
* **Família** — contextos e informações relacionadas à família.
* **Compras** — itens que precisam ser comprados ou acompanhados.
* **Objetivos pessoais** — metas que não pertencem diretamente a Treino, Dinheiro, Trabalho etc.
* **Informações importantes** — informações pessoais que precisam ficar acessíveis dentro do Hub.

---

# 20. NAVEGAÇÃO

A navegação principal será uma sidebar no desktop.

```text
CARLOS
Hub do Carlos

⚡ Central
🧠 PULSO

── MINHA VIDA ──

💼 Trabalho
🎓 Faculdade
💰 Dinheiro
🏋️ Treino
🚀 Projetos
📅 Compromissos
👤 Vida pessoal

────────────────

⚙️ Configurações
```

A Central é a página inicial.

O nome/logo do Hub deve permitir retornar à Central.

A sidebar deve ser adaptada para mobile sem criar uma experiência completamente diferente.

---

# 21. ARQUITETURA CONCEITUAL

```text
                     HUB DO CARLOS
                           │
            ┌──────────────┴──────────────┐
            │                             │
         CONTEXTO                      EXECUÇÃO
            │                             │
      ┌─────┼─────┐                     PULSO
      │     │     │                       │
   Trabalho Faculdade Dinheiro             │
   Treino   Projetos  Vida pessoal         │
            │                             │
            └─────────────┬───────────────┘
                          ↓
                       CENTRAL
                          │
               ┌──────────┼──────────┐
               ↓          ↓          ↓
             AGORA       HOJE     PRÓXIMAS
```

---

# 22. FLUXO PRINCIPAL DO USUÁRIO

```text
CAPTURAR → ENTENDER → IDENTIFICAR O CONTEXTO → DEFINIR SE É INFORMAÇÃO OU AÇÃO
→ SE FOR AÇÃO → PULSO → PRIORIZAR → AGIR
```

Isso mantém a filosofia original do PULSO e amplia sua função dentro do Hub.

---

# 23. REGRA DE NÃO DUPLICAÇÃO

O Hub não deve criar sistemas paralelos.

Não fazer:

```text
Valentine
└── Lista de tarefas

PULSO
└── Outra lista de tarefas
```

Fazer:

```text
Valentine
└── Contexto
     │
     ↓
    PULSO
     └── Tarefa
```

A mesma regra vale para Faculdade, Projetos, Dinheiro, Treino e Vida pessoal.

---

# 24. PRINCÍPIO DE SIMPLICIDADE

O Hub deve evitar:

* dashboards excessivamente carregados;
* dezenas de gráficos;
* funcionalidades sem propósito;
* duplicação de dados;
* sistemas paralelos de tarefas;
* excesso de notificações;
* complexidade desnecessária.

A Central deve mostrar o que importa.

Os módulos devem mostrar o contexto.

O PULSO deve mostrar o que precisa ser executado.

---

# 25. RELAÇÃO HUB ↔ PULSO

> **Hub = minha vida organizada.**
> **Módulos = onde cada coisa pertence.**
> **PULSO = o que eu preciso fazer.**
> **Central = o que merece minha atenção agora.**

Essa é a arquitetura conceitual fundamental do produto.

---

# 26. DIRETRIZ PARA IMPLEMENTAÇÃO

O desenvolvimento deve ser realizado em fases.

Não implementar todo o Hub de uma vez.

Cada fase deve:

1. ter objetivo claro;
2. ser implementada;
3. ser testada;
4. ser visualmente validada;
5. ser aprovada antes da próxima fase.

O PULSO existente deve ser aproveitado sempre que possível.

Não reconstruir funcionalidades já existentes sem necessidade.

---

# 27. PRINCÍPIO FINAL

O Hub do Carlos não existe para controlar cada minuto da vida.

Ele existe para tornar a vida **mais compreensível e executável**.

A pergunta principal do sistema continua sendo:

> **"O que merece minha atenção agora?"**

E a resposta deve surgir da combinação entre:

**contexto + compromissos + prioridades + ações.**
