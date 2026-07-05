import { useRef, useEffect } from 'react';

export default function RichTextEditor({ value, onChange, placeholder, label, maxLength = 1000 }) {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const execCommand = (command, val = null) => {
    document.execCommand(command, false, val);
    editorRef.current?.focus();
    handleInput();
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const textLength = (value || '').replace(/<[^>]*>/g, '').length;

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-2 ml-1">
        <span className="text-[10px] font-bold text-white/40 uppercase tracking-[2px]">{label}</span>

        {/* Rich Text Toolbar */}
        <div className="flex items-center bg-white/[0.04] rounded-lg p-0.5 border border-white/10">
          <button type="button" onClick={() => execCommand('bold')} className="p-1.5 hover:bg-white/10 rounded-md text-white/60 hover:text-white transition-all active:scale-90 cursor-pointer" title="Gras">
            <span className="font-bold text-[11px]">B</span>
          </button>
          <button type="button" onClick={() => execCommand('italic')} className="p-1.5 hover:bg-white/10 rounded-md text-white/60 hover:text-white transition-all active:scale-90 cursor-pointer" title="Italique">
            <span className="italic font-serif text-[11px]">I</span>
          </button>
          <button type="button" onClick={() => execCommand('underline')} className="p-1.5 hover:bg-white/10 rounded-md text-white/60 hover:text-white transition-all active:scale-90 cursor-pointer" title="Souligner">
            <span className="underline text-[11px]">U</span>
          </button>
          <div className="w-px h-3 bg-white/10 mx-1" />
          <button type="button" onClick={() => execCommand('insertUnorderedList')} className="p-1.5 hover:bg-white/10 rounded-md text-white/60 hover:text-white transition-all active:scale-90 cursor-pointer" title="Liste à puces">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>
      </div>

      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        placeholder={placeholder}
        className="rich-text-content w-full min-h-[140px] p-4 bg-white/[0.05] border border-white/10 rounded-lg focus:border-accent-blue/50 outline-none transition-all text-white text-[13px] font-medium leading-relaxed overflow-y-auto"
      />

      <div className="flex justify-end px-1 mt-1.5">
        <span className="text-[9px] font-bold text-white/20 uppercase tracking-tighter">{textLength} / {maxLength}</span>
      </div>
    </div>
  );
}
