import type { IncomeCategory, MoneyCategory, PayMethod, SpendCategory } from "@/types/money";

export const SPEND_LABEL: Record<SpendCategory, string> = {
  ALIMENTACAO: "Alimentação",
  TRANSPORTE: "Transporte",
  CASA: "Casa",
  CONTAS: "Contas",
  SAUDE: "Saúde",
  LAZER: "Lazer",
  COMPRAS: "Compras",
  EDUCACAO: "Educação",
  OUTROS: "Outros",
};

export const INCOME_LABEL: Record<IncomeCategory, string> = {
  SALARIO: "Salário",
  FREELA: "Freela",
  OUTRO: "Outro",
};

export function categoryLabel(category: MoneyCategory): string {
  return category in SPEND_LABEL ? SPEND_LABEL[category as SpendCategory] : INCOME_LABEL[category as IncomeCategory];
}

export const METHOD_LABEL: Record<Exclude<PayMethod, "CARTAO">, string> = {
  PIX: "Pix",
  DINHEIRO: "Dinheiro",
  DEBITO: "Débito",
};

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** 143760 → "R$ 1.437,60" (com espaço que não quebra). */
export function formatCents(cents: number): string {
  return BRL.format(cents / 100);
}

/** 143760 → "1.437,60" — para o campo de valor. */
export function centsToInput(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Texto do campo de valor → centavos. Vazio = null; inválido = undefined.
 * Aceita "1.234,56", "1234,56", "89,9", "89.90", "1234" e "R$ 12,00".
 */
export function parseMoney(text: string): number | null | undefined {
  let value = text.replace(/R\$/i, "").replace(/\s/g, "");
  if (!value) return null;
  if (value.includes(",")) {
    // Vírgula decimal: os pontos são milhar.
    if (!/^\d{1,3}(\.\d{3})*,\d{1,2}$|^\d+,\d{1,2}$/.test(value)) return undefined;
    value = value.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(value)) {
    // "1.234" = mil duzentos e trinta e quatro.
    value = value.replace(/\./g, "");
  } else if (!/^\d+(\.\d{1,2})?$/.test(value)) {
    return undefined;
  }
  const cents = Math.round(Number(value) * 100);
  if (!Number.isFinite(cents) || cents <= 0 || cents > 2_000_000_000) return undefined;
  return cents;
}

/** Total dividido em parcelas: o que sobra dos centavos vai na primeira (a soma bate). */
export function splitInstallments(totalCents: number, installments: number): number[] {
  const base = Math.floor(totalCents / installments);
  const rest = totalCents - base * installments;
  return Array.from({ length: installments }, (_, i) => (i === 0 ? base + rest : base));
}
