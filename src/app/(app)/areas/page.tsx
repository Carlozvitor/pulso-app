import { Layers } from "lucide-react";
import { Page } from "@/components/layout/page";
import { AreaList } from "@/components/projects/area-list";
import { listAreas } from "@/lib/projects/queries";

export const metadata = { title: "Áreas" };

export default async function AreasPage() {
  const areas = await listAreas();

  return (
    <Page icon={Layers} title="Áreas" description="Responsabilidades contínuas, como Faculdade ou Finanças. Toque no nome para editar.">
      <AreaList areas={areas} />
    </Page>
  );
}
