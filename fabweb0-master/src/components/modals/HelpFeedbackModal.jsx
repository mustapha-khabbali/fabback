import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';

export default function HelpFeedbackModal() {
  const { showHelpFeedbackModal, setShowHelpFeedbackModal, selectedNotificationRequest, setSelectedNotificationRequest, showNotification, setNotifications } = useApp();
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState('');

  if (!showHelpFeedbackModal || !selectedNotificationRequest) return null;

  const handleSubmit = async () => {
    if (rating === 0) { showNotification("Veuillez donner une note de 1 à 5 étoiles.", 'error'); return; }
    
    try {
      if (selectedNotificationRequest.interactionOfferId) {
        await api.rateInteractionOffer(selectedNotificationRequest.interactionOfferId, {
          notificationId: selectedNotificationRequest.id,
          rating,
          comment: note.trim()
        });
      } else {
        await api.updateNotification(selectedNotificationRequest.id, { status: 'read', handled: true, approved: true });
      }
      showNotification("Merci pour votre évaluation !");
      
      // Remove the notification
      setNotifications(prev => prev.filter(n => n.id !== selectedNotificationRequest.id));
      
      setShowHelpFeedbackModal(false);
      setSelectedNotificationRequest(null);
      setRating(0);
      setNote('');
    } catch (error) {
      showNotification(error.message || "Évaluation impossible.", 'error');
    }
  };

  const handleClose = () => {
    setShowHelpFeedbackModal(false);
    setRating(0);
    setNote('');
  };

  const isReview = selectedNotificationRequest.interactionType === 'review';

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-midnight-blue/40 backdrop-blur-sm transition-opacity duration-300"
      onTouchStart={e => e.stopPropagation()}
      onTouchMove={e => e.stopPropagation()}
    >
      <div className="bg-t-surface glass-card w-full max-w-sm rounded-[32px] p-8 shadow-2xl space-y-8 transition-transform duration-300 relative">
        <button onClick={handleClose} className="absolute top-4 right-4 p-2 text-t-tertiary hover:text-t-primary transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <div className="text-center space-y-2 pt-2">
          <h3 className="text-2xl font-bold text-t-primary">{isReview ? 'Évaluer la review' : "Évaluer l'aide"}</h3>
          <p className="text-sm text-t-secondary font-medium leading-relaxed">
            Comment évaluez-vous {isReview ? 'la review' : "l'aide"} de <b>{selectedNotificationRequest.senderName}</b> ?
          </p>
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

        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder={isReview ? 'Un commentaire sur sa review ?' : 'Un commentaire sur son aide ?'} rows="2"
          className="w-full p-4 bg-t-surface-alt border border-t-border rounded-2xl outline-none focus:border-midnight-blue text-sm font-medium custom-scrollbar" />

        <button onClick={handleSubmit}
          className="w-full py-4 bg-[#3B5FE6] text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-500/20 hover:brightness-110 active:scale-95 transition-all">
          Envoyer l'évaluation
        </button>
      </div>
    </div>
  );
}
