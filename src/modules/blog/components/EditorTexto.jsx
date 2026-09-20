import { useCallback, useEffect, useState } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Heading2, Heading3, Italic, Link2, Link2Off, List, ListOrdered, Minus, Quote, Redo2, Underline as SubrayadoIcono, Undo2 } from 'lucide-react';
import { ESTILOS_ENTRADA } from './estilosEntrada.js';

// Solo estos destinos se aceptan al crear un enlace (el servidor vuelve a validarlos al guardar)
const HREF_VALIDO = /^(https?:\/\/|mailto:|tel:)/i;

const Boton = ({ activo, onClick, titulo, disabled, children }) => (
  <button type="button" onClick={onClick} disabled={disabled} title={titulo} aria-label={titulo} aria-pressed={!!activo}
          className={`flex h-8 w-8 items-center justify-center rounded transition-colors disabled:opacity-30 ${activo ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}`}>
    {children}
  </button>
);
const Separador = () => <span className="mx-1 h-5 w-px bg-slate-700" aria-hidden />;

/**
 * Editor de texto enriquecido de las entradas del blog. Solo ofrece lo que el sitio sabe mostrar (títulos, negritas, listas,
 * citas, enlaces...). `valor` es HTML; `onChange` recibe el HTML nuevo. El servidor lo sanea de todos modos al guardar.
 */
const EditorTexto = ({ valor, onChange }) => {
  const [enlace, setEnlace] = useState(null);   // null = cerrado | { url, error }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false, codeBlock: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https', protocols: ['mailto', 'tel'] },
      }),
      Placeholder.configure({ placeholder: 'Escribe aquí la entrada…' }),
    ],
    content: valor || '',
    onUpdate: ({ editor: ed }) => onChange(ed.isEmpty ? '' : ed.getHTML()),
    editorProps: { attributes: { 'aria-label': 'Contenido de la entrada', role: 'textbox', 'aria-multiline': 'true' } },
  });

  // useEditorState: la barra se actualiza con cada cambio de selección (el editor no vuelve a renderizar solo)
  const est = useEditorState({
    editor,
    selector: ({ editor: ed }) => (ed ? {
      h2: ed.isActive('heading', { level: 2 }), h3: ed.isActive('heading', { level: 3 }),
      negrita: ed.isActive('bold'), cursiva: ed.isActive('italic'), subrayado: ed.isActive('underline'),
      lista: ed.isActive('bulletList'), numerada: ed.isActive('orderedList'), cita: ed.isActive('blockquote'), enlace: ed.isActive('link'),
      deshacer: ed.can().undo(), rehacer: ed.can().redo(),
    } : null),
  });

  // Si el contenido cambia desde fuera (al cargar la entrada), se refleja sin perder el cursor cuando es el mismo texto
  useEffect(() => {
    if (editor && valor !== undefined && valor !== (editor.isEmpty ? '' : editor.getHTML())) editor.commands.setContent(valor || '', { emitUpdate: false });
  }, [valor, editor]);

  const abrirEnlace = useCallback(() => {
    if (!editor) return;
    if (editor.isActive('link')) { setEnlace({ url: editor.getAttributes('link').href || '', error: '' }); return; }
    setEnlace({ url: '', error: '' });
  }, [editor]);

  const aplicarEnlace = (e) => {
    e.preventDefault();
    const url = enlace.url.trim();
    if (!url) { editor.chain().focus().extendMarkRange('link').unsetLink().run(); setEnlace(null); return; }
    const conProtocolo = HREF_VALIDO.test(url) ? url : `https://${url}`;
    if (!HREF_VALIDO.test(conProtocolo) || /\s/.test(conProtocolo)) { setEnlace({ ...enlace, error: 'Escribe una dirección válida (https://…, mailto: o tel:).' }); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: conProtocolo }).run();
    setEnlace(null);
  };

  if (!editor || !est) return <div className="h-[380px] animate-pulse rounded border border-slate-800 bg-slate-900/40" />;
  const c = editor.chain().focus();

  return (
    <div className="overflow-hidden rounded border border-slate-700">
      <style>{ESTILOS_ENTRADA}</style>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-700 bg-[#08101e] px-2 py-1.5" role="toolbar" aria-label="Formato del texto">
        <Boton titulo="Título" activo={est.h2} onClick={() => c.toggleHeading({ level: 2 }).run()}><Heading2 size={16} /></Boton>
        <Boton titulo="Subtítulo" activo={est.h3} onClick={() => c.toggleHeading({ level: 3 }).run()}><Heading3 size={16} /></Boton>
        <Separador />
        <Boton titulo="Negrita" activo={est.negrita} onClick={() => c.toggleBold().run()}><Bold size={15} /></Boton>
        <Boton titulo="Cursiva" activo={est.cursiva} onClick={() => c.toggleItalic().run()}><Italic size={15} /></Boton>
        <Boton titulo="Subrayado" activo={est.subrayado} onClick={() => c.toggleUnderline().run()}><SubrayadoIcono size={15} /></Boton>
        <Separador />
        <Boton titulo="Lista con viñetas" activo={est.lista} onClick={() => c.toggleBulletList().run()}><List size={16} /></Boton>
        <Boton titulo="Lista numerada" activo={est.numerada} onClick={() => c.toggleOrderedList().run()}><ListOrdered size={16} /></Boton>
        <Boton titulo="Cita" activo={est.cita} onClick={() => c.toggleBlockquote().run()}><Quote size={15} /></Boton>
        <Boton titulo="Línea separadora" onClick={() => c.setHorizontalRule().run()}><Minus size={16} /></Boton>
        <Separador />
        <Boton titulo="Enlace" activo={est.enlace} onClick={abrirEnlace}><Link2 size={15} /></Boton>
        <Boton titulo="Quitar enlace" disabled={!est.enlace} onClick={() => c.extendMarkRange('link').unsetLink().run()}><Link2Off size={15} /></Boton>
        <span className="flex-1" />
        <Boton titulo="Deshacer" disabled={!est.deshacer} onClick={() => c.undo().run()}><Undo2 size={15} /></Boton>
        <Boton titulo="Rehacer" disabled={!est.rehacer} onClick={() => c.redo().run()}><Redo2 size={15} /></Boton>
      </div>

      {enlace && (
        <form onSubmit={aplicarEnlace} className="flex flex-wrap items-center gap-2 border-b border-slate-700 bg-[#0b1626] px-3 py-2">
          <label className="sr-only" htmlFor="editor-enlace">Dirección del enlace</label>
          <input id="editor-enlace" autoFocus value={enlace.url} onChange={(e) => setEnlace({ url: e.target.value, error: '' })} placeholder="https://…  (vacío para quitar el enlace)"
                 className="min-w-[220px] flex-1 rounded border border-slate-700 bg-[#08101e] px-3 py-1.5 text-xs text-slate-200 focus:border-sky-500 focus:outline-none" />
          <button type="submit" className="rounded bg-sky-500 px-3 py-1.5 text-[11px] font-bold tracking-wider text-white hover:bg-sky-400">APLICAR</button>
          <button type="button" onClick={() => setEnlace(null)} className="rounded border border-slate-700 px-3 py-1.5 text-[11px] text-slate-400 hover:text-slate-200">CANCELAR</button>
          {enlace.error && <p role="alert" className="w-full text-[11px] text-red-400">{enlace.error}</p>}
        </form>
      )}

      <div className="hoja-entrada bg-white px-5 py-5 sm:px-8"><EditorContent editor={editor} /></div>
    </div>
  );
};

export default EditorTexto;
