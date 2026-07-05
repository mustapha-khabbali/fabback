import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getPrimaryUserId } from '../../utils/userIdentity';

export default function FeedbackModal() {
  const { showFeedbackModal, setShowFeedbackModal, setIsUserInLab, currentUser, showNotification } = useApp();
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState('');

  if (!showFeedbackModal) return null;

  const saveGateOut = () => {
    const userId = getPrimaryUserId(currentUser) || 'guest';
    const timestampOut = new Date().toISOString();
    let attendance;

    try { attendance = JSON.parse(localStorage.getItem('lab_attendance') || '[]'); } catch {
      attendance = [];
    }

    const openEntryIndex = attendance.findIndex((entry) =>
      entry.type === 'in' &&
      !entry.timestampOut &&
      String(entry.userId || '') === String(userId)
    );

    if (openEntryIndex >= 0) {
      attendance[openEntryIndex] = {
        ...attendance[openEntryIndex],
        timestampOut,
        rating,
        feedbackComment: note.trim()
      };
    } else {
      attendance.unshift({
        userId,
        userName: `${currentUser.prenom || ''} ${currentUser.nom || ''}`.trim(),
        nom: currentUser.nom || '',
        prenom: currentUser.prenom || '',
        role: currentUser.role,
        cin: currentUser.cin || '',
        tel: currentUser.tel || '',
        email: currentUser.email || '',
        type: 'out',
        objective: 'Sortie',
        timestamp: timestampOut,
        timestampOut,
        rating,
        feedbackComment: note.trim()
      });
    }

    localStorage.setItem('lab_attendance', JSON.stringify(attendance));
  };

  const handleSubmit = () => {
    if (rating === 0) { showNotification("Veuillez donner une note de 1 à 5 étoiles.", 'error'); return; }
    saveGateOut();
    setShowFeedbackModal(false);
    showNotification("Merci pour votre feedback ! À bientôt.");
    setIsUserInLab(false);
    setRating(0);
    setNote('');
    setShowFeedbackModal(false);
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-midnight-blue/40 backdrop-blur-sm transition-opacity duration-300"
      onTouchStart={e => e.stopPropagation()}
      onTouchMove={e => e.stopPropagation()}
    >
      <div className="bg-t-surface glass-card w-full max-w-sm rounded-[32px] p-8 shadow-2xl space-y-8 transition-transform duration-300">
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-bold text-t-primary">Comment était votre séance ?</h3>
          <p className="text-sm text-t-secondary font-medium leading-relaxed">Merci de noter votre expérience au Fab Lab aujourd'hui !</p>
        </div>

        {/* Star Rating */}
        <div className="flex items-center justify-center space-x-2">
          {[1,2,3,4,5].map(star => (
            <button key={star} onClick={() => setRating(star)} className={`p-1 hover:scale-110 transition-transform ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 fill-current" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
          ))}
        </div>

        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Un petit mot sur votre projet ou votre visite ?" rows="2"
          className="w-full p-4 bg-t-surface-alt border border-t-border rounded-2xl outline-none focus:border-midnight-blue text-sm font-medium custom-scrollbar" />

        <button onClick={handleSubmit}
          className="w-full py-4 bg-midnight-blue text-white font-bold text-lg rounded-2xl shadow-xl hover:brightness-110 active:scale-95 transition-all">
          Envoyer le Feedback
        </button>
      </div>
    </div>
  );
}
