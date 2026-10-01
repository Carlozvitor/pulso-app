import {
  ArrowDownLeft,
  BookOpen,
  Car,
  Circle,
  HeartPulse,
  House,
  Popcorn,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";
import type { MoneyCategory } from "@/types/money";

/** Ícone de cada categoria (entrada tem um só: a seta de chegar). */
export const CATEGORY_ICON: Record<MoneyCategory, LucideIcon> = {
  ALIMENTACAO: ShoppingCart,
  TRANSPORTE: Car,
  CASA: House,
  CONTAS: Receipt,
  SAUDE: HeartPulse,
  LAZER: Popcorn,
  COMPRAS: ShoppingBag,
  EDUCACAO: BookOpen,
  OUTROS: Circle,
  SALARIO: ArrowDownLeft,
  FREELA: ArrowDownLeft,
  OUTRO: ArrowDownLeft,
};
