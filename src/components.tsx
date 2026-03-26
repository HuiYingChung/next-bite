import type { ReactNode } from "react";

export function LabeledField(props: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-medium tracking-tight text-slate-700">{props.label}</div>
      {props.children}
    </label>
  );
}

export function TagGroup(props: { title: string; helper: string; tags: string[]; activeTags: string[]; onToggle: (tag: string) => void }) {
  return (
    <div className="mt-5">
      <div className="mb-2">
        <div className="text-sm font-medium tracking-tight text-slate-700">{props.title}</div>
        <div className="mt-1 text-sm text-slate-500">{props.helper}</div>
      </div>
      <div className="flex flex-wrap gap-1.5 md:gap-2">
        {props.tags.map((tag) => {
          const active = props.activeTags.includes(tag);
          return (
            <button key={tag} type="button" onClick={() => props.onToggle(tag)} className={`chip ${active ? "chip-active" : "chip-inactive"}`}>
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function InfoPill(props: { label: string }) {
  return <div className="max-w-full break-keep rounded-full border border-slate-200/90 bg-white/90 px-2.5 py-1 text-[11px] leading-4 text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">{props.label}</div>;
}
