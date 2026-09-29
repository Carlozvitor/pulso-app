import { describe, expect, it } from "vitest";
import type { Area, Project } from "@/types/project";
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
    { id: "a-trab", name: "Trabalho" },
    { id: "a-fac", name: "Faculdade" },
    { id: "a-fin", name: "Finanças" },
  ];

  it("agrupa por área em ordem alfabética, sem área no fim, e esconde áreas vazias", () => {
    const groups = groupProjects(
      [
        project({ name: "Solto" }),
        project({ name: "TCC", areaId: "a-fac" }),
        project({ name: "CRUMB", areaId: "a-trab" }),
        project({ name: "Área apagada", areaId: "a-sumiu" }),
      ],
      areas,
    );
    expect(groups.map((g) => g.area?.name ?? null)).toEqual(["Faculdade", "Trabalho", null]);
    expect(groups[2].projects.map((p) => p.name)).toEqual(["Área apagada", "Solto"]);
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
    areas: new Map([["a1", "Trabalho"]]),
  };

  it("projeto vence a área; sem projeto usa a área; sem nada é null", () => {
    expect(contextLabel({ projectId: "p1", areaId: "a1" }, lookup)).toBe("CRUMB CLUB");
    expect(contextLabel({ projectId: null, areaId: "a1" }, lookup)).toBe("Trabalho");
    expect(contextLabel({ projectId: null, areaId: null }, lookup)).toBeNull();
  });

  it("id desconhecido cai para a área", () => {
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
