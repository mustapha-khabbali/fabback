import { useState } from 'react';
import { useApp } from '../../../context/AppContext';

export default function ArticleCreateForm({ onBack }) {
  const { userArticles, saveArticles, showNotification } = useApp();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [url, setUrl] = useState('');
  const [tempImage, setTempImage] = useState(null);

  const previewImage = (input) => {
    const file = input.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setTempImage(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!title || !desc) { showNotification("Titre et description requis.", "error"); return; }
    const newRequest = { id: crypto.randomUUID(), title, description: desc, url, image: tempImage, status: 'En attente', date: new Date().toISOString() };
    saveArticles([newRequest, ...userArticles]);
    setTitle(''); setDesc(''); setUrl(''); setTempImage(null);
    showNotification("Demande envoyée avec succès !");
    onBack();
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] lg:bg-t-surface-alt/50">
      <div className="pt-10 pb-6 px-6 shrink-0 lg:max-w-4xl lg:mx-auto lg:w-full lg:pt-16 lg:px-12 lg:mb-4">
        <div className="flex items-center space-x-4 lg:space-x-6">
          <button onClick={onBack} className="p-2 -ml-2 text-t-tertiary hover:text-t-primary transition-colors lg:bg-t-surface-alt lg:rounded-full lg:shadow-sm lg:p-3 lg:-ml-0 lg:hover:shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h2 className="text-2xl font-bold text-t-primary lg:text-4xl">Nouvelle Demande</h2>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-24 lg:px-12 lg:pb-32">
        <div className="bg-t-surface rounded-[40px] p-8 shadow-sm border border-t-border-subtle space-y-8 lg:max-w-4xl lg:mx-auto lg:w-full lg:p-12 lg:shadow-xl lg:border-none lg:rounded-[48px] lg:space-y-12">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-t-tertiary uppercase tracking-widest px-1">Titre de l'article</label>
              <input value={title} onChange={e => setTitle(e.target.value)} type="text" placeholder="Ex: Filament PLA 1.75mm"
                className="w-full p-4 bg-t-surface-alt border-2 border-transparent rounded-2xl focus:bg-t-surface focus:border-midnight-blue outline-none transition-all font-bold text-t-primary" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-t-tertiary uppercase tracking-widest px-1">Description / Quantité</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} rows="4" placeholder="Précisez votre besoin..."
                className="w-full p-4 bg-t-surface-alt border-2 border-transparent rounded-2xl focus:bg-t-surface focus:border-midnight-blue outline-none transition-all font-medium text-t-primary resize-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-t-tertiary uppercase tracking-widest px-1">Lien URL (Optionnel)</label>
              <input value={url} onChange={e => setUrl(e.target.value)} type="url" placeholder="https://..."
                className="w-full p-4 bg-t-surface-alt border-2 border-transparent rounded-2xl focus:bg-t-surface focus:border-midnight-blue outline-none transition-all font-medium text-t-primary" />
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-bold text-t-tertiary uppercase tracking-widest">Image de l'article</span>
                <label className="cursor-pointer text-[#3B5FE6] text-[10px] font-bold uppercase hover:underline">
                  <input type="file" className="hidden" accept="image/*" onChange={previewImage} />Sélectionner
                </label>
              </div>
              <div className="w-full h-40 bg-t-surface-alt rounded-2xl overflow-hidden border-2 border-dashed border-t-border-strong flex items-center justify-center group hover:bg-t-surface-input transition-colors">
                {tempImage ? <img src={tempImage} className="w-full h-full object-cover" alt="Preview" /> : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                )}
              </div>
            </div>
          </div>
          <button onClick={handleSubmit}
            className="w-full py-5 bg-midnight-blue text-white font-bold text-lg rounded-[28px] shadow-xl shadow-midnight-blue/20 hover:brightness-110 active:scale-[0.98] transition-all">Envoyer la demande</button>
        </div>
      </div>
    </div>
  );
}
