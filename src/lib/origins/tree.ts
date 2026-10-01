import { MODULE_KEYS, type Area, type ModuleKey } from "@/types/project";

/**
 * Módulos do Hub. `href` só existe quando o módulo já tem página — até lá ele
 * aparece apenas como origem (no seletor e nos rótulos), nunca na navegação.
 */
export const MODULES: Record<ModuleKey, { label: string; href: string | null }> = {
  TRABALHO: { label: "Trabalho", href: "/trabalho" },
  FACULDADE: { label: "Faculdade", href: "/faculdade" },
  DINHEIRO: { label: "Dinheiro", href: "/dinheiro" },
  TREINO: { label: "Treino", href: null },
  VIDA_PESSOAL: { label: "Vida pessoal", href: null },
};

/** Página de uma origem, quando o módulo dela já tem página. O módulo abre na página dele. */
export function originHref(area: Pick<Area, "id" | "parentId" | "module">): string | null {
  const base = MODULES[area.module].href;
  if (!base) return null;
  return area.parentId ? `${base}/${area.id}` : base;
}

/** Separador dos caminhos: "Valentine → Conteúdo". */
export const PATH_SEPARATOR = " → ";

export type OriginNode = Area & { children: OriginNode[] };
export type OriginIndex = Map<string, Area>;

const bySiblingOrder = (a: Area, b: Area) => a.position - b.position || a.name.localeCompare(b.name, "pt-BR");

export function indexOrigins(areas: Area[]): OriginIndex {
  return new Map(areas.map((a) => [a.id, a]));
}

/** A árvore: módulos na ordem fixa, filhos por posição e depois nome. */
export function buildOriginTree(areas: Area[]): OriginNode[] {
  const children = new Map<string, Area[]>();
  for (const area of areas) {
    if (area.parentId) children.set(area.parentId, [...(children.get(area.parentId) ?? []), area]);
  }
  const grow = (area: Area): OriginNode => ({
    ...area,
    children: (children.get(area.id) ?? []).sort(bySiblingOrder).map(grow),
  });
  return areas
    .filter((a) => a.parentId === null)
    .sort((a, b) => MODULE_KEYS.indexOf(a.module) - MODULE_KEYS.indexOf(b.module))
    .map(grow);
}

/** Do módulo até o item (inclusive). Id desconhecido = caminho vazio. */
export function originPath(id: string, index: OriginIndex): Area[] {
  const path: Area[] = [];
  const seen = new Set<string>();
  let current = index.get(id);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current);
    current = current.parentId ? index.get(current.parentId) : undefined;
  }
  return path;
}

/**
 * Rótulo curto da origem, para cards e listas: sem o módulo quando há algo abaixo dele
 * ("Valentine → Conteúdo"); só o módulo quando a tarefa está nele direto ("Faculdade").
 * `from`: rótulo relativo a um item acima (na página dele, não repete o próprio caminho).
 */
export function originLabel(id: string, index: OriginIndex, from?: string): string | null {
  const path = originPath(id, index);
  if (path.length === 0) return null;
  if (from) {
    const start = path.findIndex((a) => a.id === from);
    if (start >= 0) {
      const below = path.slice(start + 1);
      return below.length > 0 ? below.map((a) => a.name).join(PATH_SEPARATOR) : null;
    }
  }
  const shown = path.length > 1 ? path.slice(1) : path;
  return shown.map((a) => a.name).join(PATH_SEPARATOR);
}

/** Caminho completo, com o módulo: "Trabalho → Valentine → Conteúdo". */
export function originFullLabel(id: string, index: OriginIndex): string | null {
  const path = originPath(id, index);
  return path.length > 0 ? path.map((a) => a.name).join(PATH_SEPARATOR) : null;
}

/** O item e tudo abaixo dele. */
export function descendantIds(id: string, areas: Area[]): Set<string> {
  const ids = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const area of areas) {
      if (area.parentId && ids.has(area.parentId) && !ids.has(area.id)) {
        ids.add(area.id);
        grew = true;
      }
    }
  }
  return ids;
}

/** Para onde um item pode ir: mesmo módulo, fora dele mesmo e dos próprios subitens, e não onde já está. */
export function moveTargets(id: string, areas: Area[]): Area[] {
  const self = areas.find((a) => a.id === id);
  if (!self || self.parentId === null) return [];
  const blocked = descendantIds(id, areas);
  return areas.filter((a) => a.module === self.module && !blocked.has(a.id) && a.id !== self.parentId);
}

/** Encerrado: o próprio item ou algum acima dele foi encerrado. */
export function isArchived(id: string, index: OriginIndex): boolean {
  return originPath(id, index).some((a) => a.archivedAt !== null);
}

/** Só o que está valendo: tira os encerrados e tudo abaixo deles. `keep` fica mesmo encerrado (a origem atual). */
export function activeOrigins(areas: Area[], keep?: string | null): Area[] {
  const index = indexOrigins(areas);
  const kept = keep ? new Set(originPath(keep, index).map((a) => a.id)) : new Set<string>();
  return areas.filter((a) => kept.has(a.id) || !isArchived(a.id, index));
}

/** Pode apagar: não é módulo e não tem subitens. */
export function canDeleteOrigin(id: string, areas: Area[]): boolean {
  const self = areas.find((a) => a.id === id);
  return Boolean(self && self.parentId !== null && !areas.some((a) => a.parentId === id));
}

/**
 * Busca no seletor: mantém quem casa com o texto e o caminho até ele (para dar contexto).
 * Sem acento e sem diferença de maiúsculas.
 */
export function filterOriginTree(tree: OriginNode[], query: string): OriginNode[] {
  const term = normalize(query);
  if (!term) return tree;
  const walk = (nodes: OriginNode[]): OriginNode[] =>
    nodes.flatMap((node) => {
      const children = walk(node.children);
      return normalize(node.name).includes(term) || children.length > 0 ? [{ ...node, children }] : [];
    });
  return walk(tree);
}

function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}
