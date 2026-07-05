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
    <div className="space-y-1.5 flex flex-col">
      <div className="flex items-center justify-between px-1">
        <label className="text-[10px] font-bold text-t-tertiary uppercase tracking-widest">{label}</label>
        
        {/* Rich Text Toolbar */}
        <div className="flex items-center bg-t-surface-alt rounded-xl p-0.5 border border-t-border shadow-sm scale-90 origin-right">
          <button type="button" onClick={() => execCommand('bold')} className="p-2 hover:bg-t-surface glass-card hover:shadow-sm rounded-lg text-t-secondary transition-all active:scale-90" title="Gras">
            <span className="font-bold text-xs">B</span>
          </button>
          <button type="button" onClick={() => execCommand('italic')} className="p-2 hover:bg-t-surface glass-card hover:shadow-sm rounded-lg text-t-secondary transition-all active:scale-90" title="Italique">
            <span className="italic font-serif text-xs">I</span>
          </button>
          <button type="button" onClick={() => execCommand('underline')} className="p-2 hover:bg-t-surface glass-card hover:shadow-sm rounded-lg text-t-secondary transition-all active:scale-90" title="Souligner">
            <span className="underline text-xs">U</span>
          </button>
          <div className="w-px h-3 bg-gray-200 mx-1" />
          <button type="button" onClick={() => execCommand('insertUnorderedList')} className="p-2 hover:bg-t-surface glass-card hover:shadow-sm rounded-lg text-t-secondary transition-all active:scale-90" title="Liste à puces">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>
      </div>

      <div 
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="w-full min-h-[120px] p-4 bg-t-surface-alt border border-transparent rounded-2xl focus:bg-t-surface glass-card focus:border-midnight-blue outline-none transition-all text-t-primary text-sm font-medium custom-scrollbar overflow-y-auto rich-text-content max-w-none"
        placeholder={placeholder}
      />
      
      <div className="flex justify-end px-2">
        <span className="text-[9px] font-bold text-t-muted uppercase tracking-tighter">{textLength} / {maxLength}</span>
      </div>
    </div>
  );
}
