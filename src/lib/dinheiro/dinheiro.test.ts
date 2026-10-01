import { describe, expect, it } from "vitest";
import type { MoneyBill, MoneyCard, MoneyData, MoneyEntry } from "@/types/money";
import { centsToInput, formatCents, parseMoney, splitInstallments } from "./format";
import {
  activeInstallments,
  buildInvoice,
  cardInUse,
  closingDate,
  dueDate,
  invoiceMonthFor,
  invoiceTabs,
  openInvoiceMonth,
} from "./invoices";
import { addMonths, dayIn, monthShort, monthTitle, monthsBetween } from "./months";
import { billState, dueAttention, dueItems, monthSummary, plannedEntries } from "./summary";

// Quarta, 30 set 2026 — os mesmos valores da maquete aprovada.
const TODAY = "2026-09-30";

const nubank: MoneyCard = { id: "nu", name: "Nubank", closingDay: 28, dueDay: 5, limitCents: 300000, archivedAt: null };
const inter: MoneyCard = { id: "inter", name: "Inter", closingDay: 23, dueDay: 30, limitCents: 150000, archivedAt: null };

function bill(id: string, partial: Partial<MoneyBill>): MoneyBill {
  return {
    id,
    name: id,
    amountCents: 1000,
    variable: false,
    dueDay: 10,
    category: "CONTAS",
    cardId: null,
    startsOn: "2026-09-01",
    endsOn: null,
    ...partial,
  };
}

let seq = 0;
function entry(partial: Partial<MoneyEntry>): MoneyEntry {
  seq += 1;
  return {
    id: `e${seq}`,
    kind: "OUT",
    amountCents: 1000,
    description: `Gasto ${seq}`,
    category: "OUTROS",
    date: "2026-09-01",
    method: "PIX",
    cardId: null,
    installments: 1,
    billId: null,
    billMonth: null,
    planned: false,
    approximate: false,
    createdAt: `2026-09-01T00:00:${String(seq).padStart(2, "0")}Z`,
    ...partial,
  };
}

const card = (c: MoneyCard, date: string, amountCents: number, more: Partial<MoneyEntry> = {}) =>
  entry({ method: "CARTAO", cardId: c.id, date, amountCents, category: "COMPRAS", ...more });

const paid = (b: MoneyBill, date: string, amountCents = b.amountCents) =>
  entry({ description: b.name, category: b.category, method: null, date, amountCents, billId: b.id, billMonth: date.slice(0, 7) });

const bills = {
  aluguel: bill("aluguel", { name: "Aluguel", amountCents: 110000, dueDay: 10, category: "CASA" }),
  faculdade: bill("faculdade", { name: "Mensalidade da faculdade", amountCents: 61200, dueDay: 8, category: "EDUCACAO" }),
  luz: bill("luz", { name: "Luz (Enel)", amountCents: 18000, variable: true, dueDay: 12 }),
  internet: bill("internet", { name: "Internet", amountCents: 9990, dueDay: 15 }),
  celular: bill("celular", { name: "Celular (Claro)", amountCents: 4990, dueDay: 20 }),
  academia: bill("academia", { name: "Academia", amountCents: 8990, dueDay: 30, category: "SAUDE" }),
  spotify: bill("spotify", { name: "Spotify", amountCents: 2190, dueDay: 21, category: "LAZER", cardId: "nu", startsOn: "2026-01-01" }),
};

const jbl = card(nubank, "2026-06-20", 49900, { description: "Fone JBL", installments: 10 });
const curso = card(nubank, "2026-08-14", 58200, { description: "Curso de UX", installments: 6, category: "EDUCACAO" });
const cadeira = card(inter, "2026-07-30", 19200, { description: "Cadeira", installments: 3 });

const data: MoneyData = {
  cards: [nubank, inter],
  bills: Object.values(bills),
  entries: [
    entry({ kind: "IN", description: "Salário", category: "SALARIO", method: null, date: "2026-09-05", amountCents: 360000 }),
    entry({ kind: "IN", description: "Freela — site Dermathos", category: "FREELA", method: null, date: "2026-09-18", amountCents: 125000 }),
    paid(bills.aluguel, "2026-09-10"),
    paid(bills.faculdade, "2026-09-08"),
    paid(bills.luz, "2026-09-12", 18735),
    paid(bills.internet, "2026-09-15"),
    paid(bills.celular, "2026-09-20"),
    entry({ description: "Farmácia", category: "SAUDE", date: "2026-09-26", amountCents: 5620 }),
    entry({ description: "Uber", category: "TRANSPORTE", date: "2026-09-14", amountCents: 3870 }),
    entry({ description: "Mercado", category: "ALIMENTACAO", method: "DEBITO", date: "2026-09-09", amountCents: 13630 }),
    // Nubank: fatura de setembro (paga) = compras de agosto + parcelas + Spotify.
    card(nubank, "2026-08-15", 67335),
    // Fatura de outubro.
    card(nubank, "2026-09-27", 15000, { description: "Posto", category: "TRANSPORTE" }),
    card(nubank, "2026-09-18", 6240, { description: "iFood", category: "ALIMENTACAO" }),
    card(nubank, "2026-09-12", 24830, { description: "Mercado", category: "ALIMENTACAO" }),
    card(nubank, "2026-09-06", 10510, { description: "Renner" }),
    // Fatura de novembro (aberta).
    card(nubank, "2026-09-29", 3940, { description: "iFood", category: "ALIMENTACAO" }),
    jbl,
    curso,
    // Inter: fatura de setembro vence hoje.
    card(inter, "2026-09-02", 7100, { description: "Livro", category: "EDUCACAO" }),
    card(inter, "2026-09-10", 6500, { description: "Cinema", category: "LAZER" }),
    cadeira,
    entry({ description: "Revisão da moto", category: "TRANSPORTE", method: null, planned: true, date: "2026-10-18", amountCents: 35000 }),
    entry({ description: "Presente da mãe", category: "COMPRAS", method: null, planned: true, approximate: true, date: "2026-11-21", amountCents: 20000 }),
  ],
  payments: [
    { cardId: "nu", month: "2026-08" },
    { cardId: "nu", month: "2026-09" },
    { cardId: "inter", month: "2026-08" },
  ],
  links: [],
};

describe("meses", () => {
  it("soma meses e conta a diferença", () => {
    expect(addMonths("2026-11", 3)).toBe("2027-02");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(monthsBetween("2026-07", "2027-04")).toBe(9);
  });

  it("dia que não existe vira o último do mês", () => {
    expect(dayIn("2026-02", 31)).toBe("2026-02-28");
    expect(dayIn("2028-02", 30)).toBe("2028-02-29");
    expect(dayIn("2026-09", 5)).toBe("2026-09-05");
  });

  it("nomes", () => {
    expect(monthTitle("2026-09")).toBe("Setembro 2026");
    expect(monthShort("2027-04")).toBe("abr/27");
  });
});

describe("valores", () => {
  it("formata em reais", () => {
    expect(formatCents(143760)).toBe("R$ 1.437,60");
    expect(centsToInput(8990)).toBe("89,90");
  });

  it("lê o que se digita no campo", () => {
    expect(parseMoney("1.234,56")).toBe(123456);
    expect(parseMoney("89,9")).toBe(8990);
    expect(parseMoney("89.90")).toBe(8990);
    expect(parseMoney("1.234")).toBe(123400);
    expect(parseMoney("R$ 12,00")).toBe(1200);
    expect(parseMoney("350")).toBe(35000);
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("abc")).toBeUndefined();
    expect(parseMoney("0")).toBeUndefined();
    expect(parseMoney("1,234,5")).toBeUndefined();
  });

  it("divide parcelas e o resto dos centavos vai na primeira", () => {
    expect(splitInstallments(10000, 3)).toEqual([3334, 3333, 3333]);
    expect(splitInstallments(49900, 10)).toEqual(Array(10).fill(4990));
  });
});

describe("faturas", () => {
  it("fecha no mês anterior quando o fechamento vem depois do vencimento", () => {
    expect(closingDate(nubank, "2026-10")).toBe("2026-09-28");
    expect(dueDate(nubank, "2026-10")).toBe("2026-10-05");
    expect(closingDate(inter, "2026-09")).toBe("2026-09-23");
  });

  it("compra no dia do fechamento vai para a próxima fatura", () => {
    expect(invoiceMonthFor(nubank, "2026-09-27")).toBe("2026-10");
    expect(invoiceMonthFor(nubank, "2026-09-28")).toBe("2026-11");
    expect(invoiceMonthFor(inter, "2026-09-22")).toBe("2026-09");
    expect(invoiceMonthFor(inter, "2026-09-23")).toBe("2026-10");
    expect(openInvoiceMonth(nubank, TODAY)).toBe("2026-11");
  });

  it("soma compras, parcelas e conta fixa no cartão", () => {
    const october = buildInvoice(nubank, "2026-10", data, TODAY);
    expect(october.totalCents).toBe(73460);
    expect(october.items).toHaveLength(7);
    expect(october.status).toBe("closed");
    expect(october.items.find((i) => i.description === "Fone JBL")?.installment).toEqual({ index: 4, count: 10, totalCents: 49900 });
    expect(october.items.find((i) => i.description === "Curso de UX")?.installment?.index).toBe(2);
    expect(october.items.some((i) => i.source === "bill" && i.date === "2026-09-21")).toBe(true);

    expect(buildInvoice(nubank, "2026-09", data, TODAY)).toMatchObject({ totalCents: 84215, status: "paid" });
    expect(buildInvoice(nubank, "2026-11", data, TODAY)).toMatchObject({ totalCents: 20820, status: "open" });
    expect(buildInvoice(nubank, "2026-12", data, TODAY).status).toBe("future");
    expect(buildInvoice(inter, "2026-09", data, TODAY)).toMatchObject({ totalCents: 20000, status: "closed" });
  });

  it("em uso = tudo que ainda não foi pago, inclusive parcelas futuras", () => {
    expect(cardInUse(nubank, data, TODAY)).toBe(73460 + 20820 + 5 * 4990 + 3 * 9700);
    expect(cardInUse(inter, data, TODAY)).toBe(20000 + 6400);
  });

  it("abas: duas antes da aberta, a aberta e as que têm parcela", () => {
    expect(invoiceTabs(inter, data, TODAY)).toEqual(["2026-08", "2026-09", "2026-10"]);
    expect(invoiceTabs(nubank, data, TODAY)).toEqual(["2026-09", "2026-10", "2026-11", "2026-12", "2027-01", "2027-02", "2027-03", "2027-04"]);
    expect(invoiceTabs(inter, data, TODAY, "2026-05")[0]).toBe("2026-05");
  });

  it("parcelas ativas: a da próxima fatura a vencer", () => {
    const list = activeInstallments(data, TODAY);
    expect(list.map((i) => [i.entry.description, i.current, i.lastMonth])).toEqual([
      ["Cadeira", 2, "2026-10"],
      ["Curso de UX", 2, "2027-02"],
      ["Fone JBL", 4, "2027-04"],
    ]);
  });
});

describe("mês", () => {
  it("entrou, saiu (pago + a pagar) e sobra", () => {
    const s = monthSummary("2026-09", data, TODAY);
    expect(s.inCents).toBe(485000);
    expect(s.paidCents).toBe(312250);
    expect(s.dueCents).toBe(8990 + 20000);
    expect(s.outCents).toBe(341240);
    expect(s.leftCents).toBe(143760);
    expect(s.freelaCount).toBe(1);
  });

  it("movimentações: entradas, gastos fora do cartão e a fatura paga numa linha só", () => {
    const s = monthSummary("2026-09", data, TODAY);
    expect(s.movements).toHaveLength(2 + 5 + 3 + 1);
    expect(s.movements[0]).toMatchObject({ kind: "entry", date: "2026-09-26" });
    const invoice = s.movements.find((m) => m.kind === "invoice");
    expect(invoice).toMatchObject({ totalCents: 84215, date: "2026-09-05" });
  });

  it("conta fixa paga no mês seguinte continua contando no mês dela", () => {
    const late = { ...data, entries: [...data.entries, paid(bills.academia, "2026-10-02")].map((e) => (e.billId === "academia" ? { ...e, billMonth: "2026-09" } : e)) };
    expect(monthSummary("2026-09", late, TODAY).dueCents).toBe(20000);
    expect(monthSummary("2026-09", late, TODAY).paidCents).toBe(312250 + 8990);
  });

  it("pagamento futuro conta no mês dele como a pagar", () => {
    expect(monthSummary("2026-10", data, TODAY).dueCents).toBeGreaterThanOrEqual(35000);
  });
});

describe("vencimentos", () => {
  it("do que venceu sem marcar até 30 dias à frente, por data", () => {
    const items = dueItems(data, TODAY);
    expect(items.map((i) => `${i.date} ${i.title}`)).toEqual([
      "2026-09-30 Academia",
      "2026-09-30 Fatura Inter",
      "2026-10-05 Fatura Nubank",
      "2026-10-08 Mensalidade da faculdade",
      "2026-10-10 Aluguel",
      "2026-10-12 Luz (Enel)",
      "2026-10-15 Internet",
      "2026-10-18 Revisão da moto",
      "2026-10-20 Celular (Claro)",
      "2026-10-30 Academia",
      "2026-10-30 Fatura Inter",
    ]);
    expect(items.find((i) => i.title === "Luz (Enel)")?.approximate).toBe(true);
    expect(items.find((i) => i.title === "Fatura Nubank")?.amountCents).toBe(73460);
  });

  it("frase curta", () => {
    expect(dueAttention(dueItems(data, TODAY), TODAY)).toBe("2 vencem hoje");
    expect(dueAttention(dueItems(data, "2026-10-01"), "2026-10-01")).toBe("2 para pagar");
    const quiet = { ...data, bills: [], entries: [], cards: [] };
    expect(dueAttention(dueItems(quiet, TODAY), TODAY)).toBe("Nada vencendo");
    const one = { ...quiet, bills: [{ ...bills.aluguel, startsOn: "2026-10-01" }] };
    expect(dueAttention(dueItems(one, "2026-10-05"), "2026-10-05")).toBe("Aluguel sábado");
  });

  it("situação da conta fixa no mês", () => {
    expect(billState(bills.academia, "2026-09", data.entries)).toEqual({ kind: "due", date: "2026-09-30" });
    expect(billState(bills.aluguel, "2026-09", data.entries).kind).toBe("paid");
    expect(billState(bills.spotify, "2026-09", data.entries).kind).toBe("card");
    expect(billState(bills.aluguel, "2026-08", data.entries).kind).toBe("inactive");
  });

  it("pagamentos futuros por data", () => {
    expect(plannedEntries(data.entries).map((e) => e.description)).toEqual(["Revisão da moto", "Presente da mãe"]);
  });
});
