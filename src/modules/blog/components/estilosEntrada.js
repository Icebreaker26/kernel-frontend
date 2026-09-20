// Estilos del contenido de una entrada: los mismos del sitio público (.entrada-contenido), para que el editor y la vista previa
// se vean como quedará publicado. Se aplican a `.hoja-entrada` (el editor y la vista previa) sin tocar el resto de Kernel.
export const ESTILOS_ENTRADA = `
.hoja-entrada, .hoja-entrada .ProseMirror { font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; }
.hoja-entrada .ProseMirror { outline: none; min-height: 320px; font-size: 1.05rem; line-height: 1.8; color: #334155; overflow-wrap: anywhere; }
.hoja-entrada .ProseMirror > * + * { margin-top: 1.1rem; }
.hoja-entrada .ProseMirror h2 { margin-top: 2rem; font-size: 1.6rem; line-height: 1.25; font-weight: 800; color: #0f172a; }
.hoja-entrada .ProseMirror h3 { margin-top: 1.6rem; font-size: 1.25rem; line-height: 1.3; font-weight: 800; color: #0f172a; }
.hoja-entrada .ProseMirror strong { font-weight: 700; color: #0f172a; }
.hoja-entrada .ProseMirror a { color: #065B8E; font-weight: 600; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
.hoja-entrada .ProseMirror ul { list-style: disc; padding-left: 1.5rem; }
.hoja-entrada .ProseMirror ol { list-style: decimal; padding-left: 1.5rem; }
.hoja-entrada .ProseMirror li + li { margin-top: 0.4rem; }
.hoja-entrada .ProseMirror li::marker { color: #5B9C3C; }
.hoja-entrada .ProseMirror li > p { margin: 0; }
.hoja-entrada .ProseMirror blockquote { border-left: 4px solid #F6AD18; background: #FFF9EC; border-radius: 0 0.75rem 0.75rem 0; padding: 0.8rem 1.1rem; font-style: italic; color: #475569; }
.hoja-entrada .ProseMirror hr { border: 0; border-top: 2px solid #e2e8f0; margin: 2rem 0; }
.hoja-entrada .ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); float: left; height: 0; pointer-events: none; color: #94a3b8; }
.hoja-entrada .ProseMirror-focused { outline: none; }
`;
