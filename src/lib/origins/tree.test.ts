import { describe, expect, it } from "vitest";
import type { Area, ModuleKey } from "@/types/project";
import {
  buildOriginTree,
  canDeleteOrigin,
  descendantIds,
  filterOriginTree,
  indexOrigins,
  moveTargets,
  originFullLabel,
  originHref,
  originLabel,
  originPath,
} from "./tree";

function area(id: string, name: string, parentId: string | null, module: ModuleKey = "TRABALHO", position = 0): Area {
  return { id, name, parentId, module, position };
}

const AREAS: Area[] = [
  area("fac", "Faculdade", null, "FACULDADE"),
  area("tra", "Trabalho", null),
  area("cli", "Clientes / Freelance", "tra", "TRABALHO", 1),
  area("val", "Valentine", "tra", "TRABALHO", 0),
  area("adm", "Administrativo", "val", "TRABALHO", 1),
  area("con", "Conteúdo", "val", "TRABALHO", 0),
  area("ins", "Instagram", "con"),
  area("vid", "Vida pessoal", null, "VIDA_PESSOAL"),
];
const index = indexOrigins(AREAS);

describe("buildOriginTree", () => {
  it("módulos na ordem fixa; filhos por posição", () => {
    const tree = buildOriginTree(AREAS);
    expect(tree.map((n) => n.name)).toEqual(["Trabalho", "Faculdade", "Vida pessoal"]);
    expect(tree[0].children.map((n) => n.name)).toEqual(["Valentine", "Clientes / Freelance"]);
    expect(tree[0].children[0].children.map((n) => n.name)).toEqual(["Conteúdo", "Administrativo"]);
    expect(tree[0].children[0].children[0].children.map((n) => n.name)).toEqual(["Instagram"]);
  });
});

describe("originPath e rótulos", () => {
  it("caminho do módulo até o item", () => {
    expect(originPath("ins", index).map((a) => a.name)).toEqual(["Trabalho", "Valentine", "Conteúdo", "Instagram"]);
    expect(originPath("nada", index)).toEqual([]);
  });

  it("rótulo curto tira o módulo, menos quando é o próprio módulo", () => {
    expect(originLabel("con", index)).toBe("Valentine → Conteúdo");
    expect(originLabel("fac", index)).toBe("Faculdade");
    expect(originLabel("nada", index)).toBeNull();
  });

  it("rótulo relativo a um item acima", () => {
    expect(originLabel("ins", index, "val")).toBe("Conteúdo → Instagram");
    expect(originLabel("val", index, "val")).toBeNull();
  });

  it("rótulo completo mantém o módulo", () => {
    expect(originFullLabel("con", index)).toBe("Trabalho → Valentine → Conteúdo");
  });
});

describe("descendantIds", () => {
  it("o item e tudo abaixo", () => {
    expect([...descendantIds("val", AREAS)].sort()).toEqual(["adm", "con", "ins", "val"]);
    expect([...descendantIds("ins", AREAS)]).toEqual(["ins"]);
  });
});

describe("moveTargets", () => {
  it("mesmo módulo, fora de si mesmo, dos subitens e de onde já está", () => {
    expect(moveTargets("con", AREAS).map((a) => a.id).sort()).toEqual(["adm", "cli", "tra"]);
  });

  it("módulo não se move", () => {
    expect(moveTargets("tra", AREAS)).toEqual([]);
  });
});

describe("canDeleteOrigin", () => {
  it("só item sem subitens, e nunca módulo", () => {
    expect(canDeleteOrigin("ins", AREAS)).toBe(true);
    expect(canDeleteOrigin("con", AREAS)).toBe(false);
    expect(canDeleteOrigin("vid", AREAS)).toBe(false);
  });
});

describe("filterOriginTree", () => {
  it("mantém o caminho até quem casa, sem acento e sem caixa", () => {
    const tree = filterOriginTree(buildOriginTree(AREAS), "conteudo");
    expect(tree.map((n) => n.name)).toEqual(["Trabalho"]);
    expect(tree[0].children.map((n) => n.name)).toEqual(["Valentine"]);
    expect(tree[0].children[0].children.map((n) => n.name)).toEqual(["Conteúdo"]);
  });

  it("busca vazia devolve tudo", () => {
    expect(filterOriginTree(buildOriginTree(AREAS), "  ")).toHaveLength(3);
  });
});

describe("originHref", () => {
  it("módulo com página: raiz na página do módulo, item embaixo dela", () => {
    expect(originHref(AREAS[1])).toBe("/trabalho");
    expect(originHref(AREAS[5])).toBe("/trabalho/con");
  });

  it("módulo ainda sem página não tem link", () => {
    expect(originHref(AREAS[0])).toBeNull();
  });
});
