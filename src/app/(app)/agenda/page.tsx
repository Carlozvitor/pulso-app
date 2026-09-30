import { redirect } from "next/navigation";

/** A Agenda (prazos) se juntou à semana de Compromissos (H3). O endereço antigo continua funcionando. */
export default function AgendaPage() {
  redirect("/compromissos");
}
