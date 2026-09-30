import { describe, expect, it } from "vitest";
import type { Area, Project } from "@/types/project";
import { indexOrigins } from "@/lib/origins/tree";
import { contextLabel, groupProjects, projectMonogram, projectProgress, type ContextLookup } from "./organize";

let seq = 0;
function project(partial: Partial<Project>): Project {
  seq += 1;
  return {
    id: `p${seq}`,
    name: `Projeto ${seq}`,
    description: null,
    status: "ACTIVE",
    areaId: null,
    dueDate: null,
    createdAt: "2026-09-01T00:00:00Z",
    completedAt: null,
    ...partial,
  };
}

describe("projectProgress", () => {
  it("concluídas ÷ total, sem contar arquivadas", () => {
    expect(projectProgress(["DONE", "DONE", "TODO", "ARCHIVED"])).toEqual({ done: 2, total: 3, percent: 67 });
  });

  it("projeto sem tarefas fica em 0%", () => {
    expect(projectProgress([])).toEqual({ done: 0, total: 0, percent: 0 });
    expect(projectProgress(["ARCHIVED"])).toEqual({ done: 0, total: 0, percent: 0 });
  });
});

describe("groupProjects", () => {
  const areas: Area[] = [
    { id: "a-trab", name: "Trabalho", parentId: null, module: "TRABALHO", position: 0 },
    { id: "a-val", name: "Valentine", parentId: "a-trab", module: "TRABALHO", position: 0 },
    { id: "a-fac", name: "Faculdade", parentId: null, module: "FACULDADE", position: 0 },
    { id: "a-fin", name: "Dinheiro", parentId: null, module: "DINHEIRO", position: 0 },
  ];

  it("agrupa por origem em ordem alfabética, sem origem no fim, e esconde origens vazias", () => {
    const groups = groupProjects(
      [
        project({ name: "Solto" }),
        project({ name: "TCC", areaId: "a-fac" }),
        project({ name: "CRUMB", areaId: "a-trab" }),
        project({ name: "Área apagada", areaId: "a-sumiu" }),
        project({ name: "Post", areaId: "a-val" }),
      ],
      areas,
    );
    expect(groups.map((g) => g.label)).toEqual(["Faculdade", "Trabalho", "Valentine", "Sem origem"]);
    expect(groups[3].area).toBeNull();
    expect(groups[3].projects.map((p) => p.name)).toEqual(["Área apagada", "Solto"]);
  });

  it("dentro da área: prazo mais cedo primeiro, sem prazo depois, empate pelo nome", () => {
    const [group] = groupProjects(
      [
        project({ name: "Zeta", areaId: "a-trab" }),
        project({ name: "Alfa", areaId: "a-trab" }),
        project({ name: "Com prazo", areaId: "a-trab", dueDate: "2026-10-10" }),
        project({ name: "Prazo antes", areaId: "a-trab", dueDate: "2026-10-01" }),
      ],
      areas,
    );
    expect(group.projects.map((p) => p.name)).toEqual(["Prazo antes", "Com prazo", "Alfa", "Zeta"]);
  });
});

describe("contextLabel", () => {
  const lookup: ContextLookup = {
    projects: new Map([["p1", "CRUMB CLUB"]]),
    origins: indexOrigins([
      { id: "a1", name: "Trabalho", parentId: null, module: "TRABALHO", position: 0 },
      { id: "a2", name: "Valentine", parentId: "a1", module: "TRABALHO", position: 0 },
    ]),
  };

  it("projeto vence a origem; sem projeto usa o caminho da origem; sem nada é null", () => {
    expect(contextLabel({ projectId: "p1", areaId: "a1" }, lookup)).toBe("CRUMB CLUB");
    expect(contextLabel({ projectId: null, areaId: "a1" }, lookup)).toBe("Trabalho");
    expect(contextLabel({ projectId: null, areaId: "a2" }, lookup)).toBe("Valentine");
    expect(contextLabel({ projectId: null, areaId: null }, lookup)).toBeNull();
  });

  it("id desconhecido cai para a origem", () => {
    expect(contextLabel({ projectId: "sumiu", areaId: "a1" }, lookup)).toBe("Trabalho");
  });
});

describe("projectMonogram", () => {
  it("duas palavras: primeira letra de cada; uma palavra: duas primeiras letras", () => {
    expect(projectMonogram("CRUMB CLUB")).toBe("CC");
    expect(projectMonogram("aura café")).toBe("AC");
    expect(projectMonogram("PORTFÓLIO")).toBe("PO");
    expect(projectMonogram("  ")).toBe("?");
  });
});
