/** Categorias de gasto (lista fixa curta). */
export const SPEND_CATEGORIES = ["ALIMENTACAO", "TRANSPORTE", "CASA", "CONTAS", "SAUDE", "LAZER", "COMPRAS", "EDUCACAO", "OUTROS"] as const;
export type SpendCategory = (typeof SPEND_CATEGORIES)[number];

/** Tipos de entrada. */
export const INCOME_CATEGORIES = ["SALARIO", "FREELA", "OUTRO"] as const;
export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];

export type MoneyCategory = SpendCategory | IncomeCategory;

/** Como pagou. Sem forma = só "pago" (conta fixa, pagamento futuro). */
export const PAY_METHODS = ["PIX", "DINHEIRO", "DEBITO", "CARTAO"] as const;
export type PayMethod = (typeof PAY_METHODS)[number];

/** "2026-09" */
export type MonthKey = string;

export type MoneyCard = {
  id: string;
  name: string;
  closingDay: number;
  dueDay: number;
  limitCents: number | null;
  archivedAt: string | null;
};

/** Conta fixa: todo mês, no mesmo dia. */
export type MoneyBill = {
  id: string;
  name: string;
  /** Previsto (aproximado quando `variable`). */
  amountCents: number;
  variable: boolean;
  dueDay: number;
  category: SpendCategory;
  /** No cartão: entra sozinha na fatura. */
  cardId: string | null;
  /** YYYY-MM-DD — vale a partir deste mês. */
  startsOn: string;
  /** YYYY-MM-DD — vale até este mês. */
  endsOn: string | null;
};

/** Entrada, gasto ou pagamento futuro (`planned`). */
export type MoneyEntry = {
  id: string;
  kind: "IN" | "OUT";
  /** Parcelado: o total da compra. */
  amountCents: number;
  description: string;
  category: MoneyCategory;
  /** YYYY-MM-DD */
  date: string;
  method: PayMethod | null;
  cardId: string | null;
  installments: number;
  /** Pagamento de conta fixa: qual conta e de qual mês. */
  billId: string | null;
  billMonth: MonthKey | null;
  planned: boolean;
  approximate: boolean;
  createdAt: string;
};

/** Fatura paga: cartão + mês do vencimento. */
export type InvoicePayment = { cardId: string; month: MonthKey };

/** Ação do PULSO ligada ao que ela paga. */
export type MoneyTaskLink =
  | { taskId: string; kind: "bill"; billId: string; month: MonthKey }
  | { taskId: string; kind: "invoice"; cardId: string; month: MonthKey }
  | { taskId: string; kind: "planned"; entryId: string };

/** Tudo que o Dinheiro lê do banco. */
export type MoneyData = {
  cards: MoneyCard[];
  bills: MoneyBill[];
  entries: MoneyEntry[];
  payments: InvoicePayment[];
  links: MoneyTaskLink[];
};
