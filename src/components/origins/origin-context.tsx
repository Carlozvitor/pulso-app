"use client";

import { useRef, useState, useTransition } from "react";
import { Check, ExternalLink, Link2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import type { AreaLink } from "@/types/project";
import {
  addOriginLink,
  addProjectLink,
  removeOriginLink,
  removeProjectLink,
  saveOriginNotes,
  saveProjectNotes,
} from "@/lib/actions/client";
import { cn } from "@/lib/utils";

/** De quem é o contexto: uma origem (Trabalho, disciplina…) ou um projeto. */
type Owner = "origin" | "project";

const SAVE = {
  origin: { notes: saveOriginNotes, addLink: addOriginLink, removeLink: removeOriginLink },
  project: { notes: saveProjectNotes, addLink: addProjectLink, removeLink: removeProjectLink },
} as const;

/** Cor do módulo e como ele chama os links (a Faculdade chama de "Materiais"). */
const TONES = {
  blue: {
    card: "tint-blue",
    text: "text-[#dbe7f5]",
    notes: "Anote o que precisa ficar à mão: combinados, contatos, como funciona…",
    links: "Links",
    add: "Adicionar link",
    example: "Nome (ex.: Calendário editorial)",
  },
  rose: {
    card: "tint-rose",
    text: "text-[#f5e1ec]",
    notes: "Professor, contato, como a nota é calculada, combinados da turma…",
    links: "Materiais",
    add: "Adicionar material",
    example: "Nome (ex.: Plano de ensino)",
  },
  plum: {
    card: "tint-plum",
    text: "text-[#ece2fb]",
    notes: "Planos, decisões, contatos, ideias para depois…",
    links: "Links",
    add: "Adicionar link",
    example: "Nome (ex.: Identidade no Figma)",
  },
} as const;

type Tone = keyof typeof TONES;

/** Contexto de uma origem ou de um projeto: anotação livre (salva ao sair do campo) e links. */
export function OriginContext({
  id,
  notes,
  updatedLabel,
  links,
  tone = "blue",
  owner = "origin",
}: {
  id: string;
  notes: string | null;
  /** "Atualizado ontem" — já formatado no servidor. */
  updatedLabel: string | null;
  links: AreaLink[];
  tone?: Tone;
  owner?: Owner;
}) {
  return (
    <div className={cn("tint flex flex-col", TONES[tone].card)}>
      <NotesField id={id} initial={notes ?? ""} updatedLabel={updatedLabel} tone={tone} owner={owner} />
      <LinkList ownerId={id} links={links} tone={tone} owner={owner} />
    </div>
  );
}

function NotesField({
  id,
  initial,
  updatedLabel,
  tone,
  owner,
}: {
  id: string;
  initial: string;
  updatedLabel: string | null;
  tone: Tone;
  owner: Owner;
}) {
  const [value, setValue] = useState(initial);
  const saved = useRef(initial);
  const [status, setStatus] = useState<"idle" | "saved">("idle");

  async function save() {
    if (value === saved.current) return;
    const result = await SAVE[owner].notes(id, value);
    // Se falhar, o texto fica no campo; sair de novo tenta outra vez.
    if (!result.ok) return void toast.error(result.error);
    saved.current = value;
    setStatus("saved");
  }

  return (
    <div className="border-b border-white/8 p-4 lg:px-5">
      <label htmlFor={`notas-${id}`} className="sr-only">
        Anotações
      </label>
      <textarea
        id={`notas-${id}`}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setStatus("idle");
        }}
        onBlur={save}
        maxLength={20000}
        rows={Math.min(14, Math.max(4, value.split("\n").length + 1))}
        placeholder={TONES[tone].notes}
        className={cn(
          "block w-full resize-none bg-transparent text-body leading-relaxed placeholder:text-white/40 focus-visible:outline-none lg:text-[0.9375rem]",
          TONES[tone].text,
        )}
      />
      <p className="mt-2 flex min-h-5 items-center gap-1.5 text-caption text-white/45">
        {status === "saved" ? (
          <>
            <Check aria-hidden className="size-3.5" strokeWidth={2} />
            Salvo
          </>
        ) : (
          updatedLabel
        )}
      </p>
    </div>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function LinkList({ ownerId, links, tone, owner }: { ownerId: string; links: AreaLink[]; tone: Tone; owner: Owner }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [pending, startTransition] = useTransition();

  function add(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await SAVE[owner].addLink(ownerId, { title, url });
      if (!result.ok) return void toast.error(result.error);
      setTitle("");
      setUrl("");
      setAdding(false);
    });
  }

  function remove(link: AreaLink) {
    startTransition(async () => {
      const result = await SAVE[owner].removeLink(link.id);
      if (!result.ok) return void toast.error(result.error);
      toast("Link removido.", {
        action: { label: "Desfazer", onClick: () => void SAVE[owner].addLink(ownerId, { title: link.title, url: link.url }) },
      });
    });
  }

  const fieldClass =
    "h-11 w-full min-w-0 rounded-md border border-white/12 bg-black/25 px-3 text-sm text-foreground placeholder:text-white/40 focus-visible:border-(--tint-ink)/60 focus-visible:outline-none";

  return (
    <div className="p-2.5 lg:p-3">
      <p className="px-2 pt-1 pb-1.5 text-[0.6875rem] font-semibold tracking-[0.1em] text-white/50 uppercase">{TONES[tone].links}</p>
      <ul className="grid gap-0.5">
        {links.map((link) => (
          <li key={link.id} className="group flex items-center rounded-lg transition-colors duration-(--duration-fast) hover:bg-black/20">
            <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex min-h-12 min-w-0 flex-1 items-center gap-3 px-2 py-1.5">
              <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-[7px] bg-black/30 text-(--tint-ink)">
                <Link2 className="size-3.5" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{link.title}</span>
                <span className="block truncate text-caption text-white/45">{hostOf(link.url)}</span>
              </span>
              <ExternalLink aria-hidden className="size-4 shrink-0 text-white/35" strokeWidth={1.75} />
            </a>
            <button
              type="button"
              onClick={() => remove(link)}
              disabled={pending}
              aria-label={`Remover link ${link.title}`}
              className="flex size-11 shrink-0 items-center justify-center text-white/40 transition-opacity duration-(--duration-fast) hover:text-white lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
            >
              <X aria-hidden className="size-4" strokeWidth={1.75} />
            </button>
          </li>
        ))}
      </ul>

      {adding ? (
        <form onSubmit={add} className="mt-1 grid gap-2 rounded-lg bg-black/20 p-2.5">
          <input aria-label="Nome do link" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder={TONES[tone].example} className={fieldClass} />
          <input aria-label="Endereço" value={url} onChange={(e) => setUrl(e.target.value)} maxLength={2000} inputMode="url" placeholder="Endereço (ex.: docs.google.com/…)" className={fieldClass} />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setAdding(false)} className="h-10 rounded-md px-3 text-sm text-white/60 hover:text-white">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending || !title.trim() || !url.trim()}
              className="h-10 rounded-md bg-(--tint-tile) px-4 text-sm font-medium text-(--tint-ink) transition-[filter] duration-(--duration-fast) hover:brightness-125 disabled:opacity-50"
            >
              Adicionar
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className={cn("flex min-h-12 w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm text-white/55 transition-colors duration-(--duration-fast) hover:bg-black/20 hover:text-white")}
        >
          <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-[7px] border border-dashed border-white/20">
            <Plus className="size-3.5" strokeWidth={1.75} />
          </span>
          {TONES[tone].add}
        </button>
      )}
    </div>
  );
}
