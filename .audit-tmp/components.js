import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function LabeledField(props) {
    return (_jsxs("label", { className: "block", children: [_jsx("div", { className: "mb-2 text-sm font-medium tracking-tight text-slate-700", children: props.label }), props.children] }));
}
export function TagGroup(props) {
    return (_jsxs("div", { className: "mt-5", children: [_jsxs("div", { className: "mb-2", children: [_jsx("div", { className: "text-sm font-medium tracking-tight text-slate-700", children: props.title }), _jsx("div", { className: "mt-1 text-sm text-slate-500", children: props.helper })] }), _jsx("div", { className: "flex flex-wrap gap-1.5 md:gap-2", children: props.tags.map((tag) => {
                    const active = props.activeTags.includes(tag);
                    return (_jsx("button", { type: "button", onClick: () => props.onToggle(tag), className: `chip ${active ? "chip-active" : "chip-inactive"}`, children: tag }, tag));
                }) })] }));
}
export function InfoPill(props) {
    return _jsx("div", { className: "max-w-full break-keep rounded-full border border-slate-200/90 bg-white/90 px-2.5 py-1 text-[11px] leading-4 text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]", children: props.label });
}
