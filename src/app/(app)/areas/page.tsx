import { redirect } from "next/navigation";

/** Áreas viraram Origens (H2). O endereço antigo continua funcionando. */
export default function AreasPage() {
  redirect("/origens");
}
