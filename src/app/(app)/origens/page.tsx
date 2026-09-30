import { GitFork } from "lucide-react";
import { Page } from "@/components/layout/page";
import { OriginTreeEditor } from "@/components/origins/origin-tree-editor";
import { listAreas } from "@/lib/projects/queries";

export const metadata = { title: "Origens" };

export default async function OrigensPage() {
  const areas = await listAreas();

  return (
    <Page back icon={GitFork} title="Origens" description="De onde vêm as tarefas, por módulo. Toque no nome para editar.">
      <OriginTreeEditor areas={areas} />
    </Page>
  );
}
