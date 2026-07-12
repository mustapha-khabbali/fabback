import { useEffect, useState } from 'react';
import { useApp, TABS } from '../../../context/AppContext';
import { findUserByIdentity } from '../../../utils/userIdentity';
import { isNotificationVisibleForUser } from '../../../utils/notificationVisibility';
import { api } from '../../../services/api';

const ACTIONABLE_TYPES = [
  'contribution_request',
  'help_request',
  'help_feedback_request',
  'review_request',
  'CONTACT_REQUEST',
  'interaction_offer',
  'interaction_approved'
];

function interactionLabel(notif) {
  return notif?.interactionType === 'review' ? 'review' : 'aide';
}

function isReviewTone(notif) {
  return notif?.type === 'review_request' || notif?.interactionType === 'review';
}

const NOTIFICATION_TIME_ZONE = 'Africa/Casablanca';
const RECENT_NOTIFICATION_MS = 5 * 60 * 1000;
const LAB_DATE_KEY_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  timeZone: NOTIFICATION_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});
const NOTIFICATION_HOUR_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  timeZone: NOTIFICATION_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit'
});
const NOTIFICATION_DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  timeZone: NOTIFICATION_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
});

function getLabDateKey(date) {
  const parts = LAB_DATE_KEY_FORMATTER.formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getNotificationDate(notif) {
  const value = notif?.createdAt || notif?.created_at || notif?.timestamp || notif?.date;
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function formatNotificationTime(notif, now) {
  const date = getNotificationDate(notif);
  if (!date) return notif?.time || 'À l\'instant';

  const ageMs = now.getTime() - date.getTime();
  if (ageMs >= 0 && ageMs < RECENT_NOTIFICATION_MS) return 'À l\'instant';

  const notificationDay = getLabDateKey(date);
  const today = getLabDateKey(now);
  if (notificationDay === today) return NOTIFICATION_HOUR_FORMATTER.format(date);

  const yesterday = getLabDateKey(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  if (notificationDay === yesterday) return 'Hier';

  return NOTIFICATION_DATE_FORMATTER.format(date);
}

export default function NotificationsTab() {
  const { currentUser, setSelectedUser, setActiveTab, showNotification, setPreviousTab, activeTab, selectedNotificationRequest, setSelectedNotificationRequest, setReviewingProject, setCurrentProjectId, setDirectProgramView, notifications, setNotifications, handleContactRequestResponse, setShowHelpFeedbackModal, usersList } = useApp();
  const [timeNow, setTimeNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setTimeNow(new Date()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  // A notification with a recipientId is only meant for that user (e.g. don't show
  // the sender their own invite). Notifications without one are shown to everyone (demo seeds).
  const visibleNotifications = notifications.filter(n => isNotificationVisibleForUser(n, currentUser));
  
  const handleApprove = async (id) => {
    try {
      if (selectedNotificationRequest?.type === 'CONTACT_REQUEST') {
        handleContactRequestResponse(id, selectedNotificationRequest.requesterId || selectedNotificationRequest.senderId, true);
        setSelectedNotificationRequest(null);
      } else if (selectedNotificationRequest?.type === 'help_request' || selectedNotificationRequest?.type === 'review_request') {
        if (!selectedNotificationRequest.interactionRequestId) throw new Error('Cette ancienne notification doit être renvoyée.');
        await api.offerInteractionRequest(selectedNotificationRequest.interactionRequestId, { notificationId: id });
        showNotification(`Votre offre de ${interactionLabel(selectedNotificationRequest)} a été envoyée.`);
        setNotifications(prev => prev.filter(n => n.id !== id));
        setSelectedNotificationRequest(null);
      } else if (selectedNotificationRequest?.type === 'interaction_offer') {
        if (!selectedNotificationRequest.interactionOfferId) throw new Error('Offre introuvable.');
        await api.approveInteractionOffer(selectedNotificationRequest.interactionOfferId, { notificationId: id });
        showNotification(`${selectedNotificationRequest.senderName} est approuvé.`);
        setNotifications(prev => prev.filter(n => n.id !== id));
        setSelectedNotificationRequest(null);
      } else if (selectedNotificationRequest?.type === 'interaction_approved') {
        if (!selectedNotificationRequest.interactionOfferId) throw new Error('Interaction introuvable.');
        if (selectedNotificationRequest.interactionType === 'review') {
          setReviewingProject({ ...selectedNotificationRequest, notificationId: id });
          setActiveTab(TABS.PROJECT_REVIEW);
          setSelectedNotificationRequest(null);
        } else {
          await api.completeHelpInteraction(selectedNotificationRequest.interactionOfferId, { notificationId: id });
          showNotification("Aide terminée. Une évaluation a été envoyée.");
          setNotifications(prev => prev.filter(n => n.id !== id));
          setSelectedNotificationRequest(null);
        }
      } else if (selectedNotificationRequest?.type === 'help_feedback_request') {
        setShowHelpFeedbackModal(true);
      } else {
        showNotification("Demande approuvée !");
        api.updateNotification(id, { status: 'read', handled: true, approved: true }).catch(() => {});
        setNotifications(prev => prev.filter(n => n.id !== id));
        setSelectedNotificationRequest(null);
      }
    } catch (error) {
      showNotification(error.message || "Action impossible.", "error");
    }
  };

  const handleDeny = async (id) => {
    try {
      if (selectedNotificationRequest?.type === 'CONTACT_REQUEST') {
        handleContactRequestResponse(id, selectedNotificationRequest.requesterId || selectedNotificationRequest.senderId, false);
      } else if (selectedNotificationRequest?.type === 'interaction_offer') {
        if (!selectedNotificationRequest.interactionOfferId) throw new Error('Offre introuvable.');
        await api.rejectInteractionOffer(selectedNotificationRequest.interactionOfferId, { notificationId: id });
        showNotification("Offre refusée.", "error");
        setNotifications(prev => prev.filter(n => n.id !== id));
      } else {
        showNotification("Demande refusée.", "error");
        api.updateNotification(id, { status: 'read', handled: true, approved: false }).catch(() => {});
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
      setSelectedNotificationRequest(null);
    } catch (error) {
      showNotification(error.message || "Action impossible.", "error");
    }
  };

  const viewSenderProfile = (userId) => {
    const user = findUserByIdentity(usersList, userId, currentUser);
    if (user) {
      setPreviousTab(activeTab);
      setSelectedUser(user);
      setActiveTab(TABS.PROFILE);
    }
  };

  const handleNotificationClick = (notif) => {
    // Mark as read if it's unread
    if (notif.status === 'unread') {
       api.updateNotification(notif.id, { status: 'read' })
         .then(updated => setNotifications(prev => prev.map(n => n.id === notif.id ? updated : n)))
         .catch(() => setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, status: 'read' } : n)));
    }

    if (notif.type === 'program_launch') {
      setDirectProgramView({ programId: notif.programId, returnToTab: TABS.NOTIFICATIONS });
      setActiveTab(TABS.PROFILE);
      return;
    }

    if (notif.type === 'project_invite') {
      setCurrentProjectId(notif.projectId);
      setActiveTab(TABS.MY_PROJECT);
      return;
    }

    if (notif.type === 'contact_approved') {
      const sharerId = notif.targetId || notif.requesterId;
      const cachedSharer = (usersList || []).find((u) => String(u.id) === String(sharerId));
      if (cachedSharer) {
        setSelectedUser(cachedSharer);
        setPreviousTab(activeTab);
        setActiveTab(TABS.PROFILE);
      }
      if (sharerId) {
        api.getUser(sharerId)
          .then((freshSharer) => {
            if (freshSharer) {
              setSelectedUser(freshSharer);
              setPreviousTab(activeTab);
              setActiveTab(TABS.PROFILE);
            }
          })
          .catch(() => {});
      }
      return;
    }

    if (ACTIONABLE_TYPES.includes(notif.type)) {
      setSelectedNotificationRequest(notif);
    }
  };

  const getNotificationTitle = (notif) => {
    if (notif.type === 'CONTACT_REQUEST' || notif.type === 'project_invite') return notif.title;
    if (notif.type === 'contribution_request') return `Demande de : ${notif.senderName}`;
    if (notif.type === 'help_request') return `${notif.senderName} asked for help`;
    if (notif.type === 'help_feedback_request') return `Évaluer ${interactionLabel(notif)} de ${notif.senderName}`;
    if (notif.type === 'review_request') return `Ask for Review : ${notif.projectTitle}`;
    if (notif.type === 'interaction_offer') return `${notif.senderName} propose une ${interactionLabel(notif)}`;
    if (notif.type === 'interaction_approved') return `${interactionLabel(notif)} approuvée`;
    if (notif.type === 'program_launch') return notif.title;
    return notif.title;
  };

  const getDetailTitle = (notif) => {
    if (notif.type === 'help_request') return "Demande d'aide";
    if (notif.type === 'help_feedback_request') return notif.interactionType === 'review' ? 'Évaluer la review' : "Laisser un avis";
    if (notif.type === 'review_request') return 'Review de Projet';
    if (notif.type === 'interaction_offer') return `Offre de ${interactionLabel(notif)}`;
    if (notif.type === 'interaction_approved') return `${interactionLabel(notif)} approuvée`;
    if (notif.type === 'CONTACT_REQUEST') return 'Accès aux contacts';
    return 'Contribution';
  };

  const getApproveLabel = (notif) => {
    if (notif?.type === 'interaction_approved') return notif.interactionType === 'review' ? 'Commencer' : 'Terminer';
    if (notif?.type === 'help_feedback_request') return 'Évaluer';
    return 'Approuver';
  };

  const getDetailMessage = (notif) => notif?.message || notif?.description || '';

  const showDenyButton = (notif) => !['interaction_approved', 'help_feedback_request'].includes(notif?.type);

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Main List */}
      <div className={`flex flex-col h-full p-6 space-y-6 overflow-y-auto custom-scrollbar transition-all duration-300 ${selectedNotificationRequest ? 'opacity-0 -translate-x-full' : 'opacity-100 translate-x-0'}`}>
        <h2 className="text-2xl font-bold text-t-primary px-2 pt-4">Notifications</h2>
        
        <div className="space-y-4">
          {visibleNotifications.map((notif) => (
            <div 
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`bg-t-surface p-5 rounded-[32px] shadow-sm flex items-start space-x-4 border border-t-border active:scale-[0.98] transition-all cursor-pointer group ${[...ACTIONABLE_TYPES, 'program_launch', 'project_invite'].includes(notif.type) ? 'hover:border-[#3B5FE6]/30' : ''}`}
            >
              <div className={`p-3 rounded-2xl shrink-0 ${
                notif.type === 'contribution_request' ? 'bg-blue-100 text-[#3B5FE6]' :
                notif.type === 'help_request' ? 'bg-rose-100 text-rose-500' :
                notif.type === 'help_feedback_request' ? 'bg-amber-100 text-amber-500' :
                isReviewTone(notif) ? 'bg-emerald-100 text-emerald-600' :
                notif.type === 'program_launch' ? 'bg-rose-100 text-rose-500' :
                notif.type === 'CONTACT_REQUEST' ? 'bg-blue-100 text-[#3B5FE6]' :
                notif.type === 'project_invite' ? 'bg-blue-100 text-[#3B5FE6]' :
                'bg-t-surface-alt text-t-muted'
              }`}>
                {notif.type === 'CONTACT_REQUEST' ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                ) : notif.type === 'project_invite' ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-4-4" />
                  </svg>
                ) : notif.type === 'contribution_request' ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                ) : notif.type === 'help_request' ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                ) : notif.type === 'help_feedback_request' ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                ) : isReviewTone(notif) ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                ) : notif.type === 'program_launch' ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-t-primary text-[15px] leading-tight">
                  {getNotificationTitle(notif)}
                </p>
                <p className="text-xs text-t-secondary mt-1 line-clamp-2 font-medium">
                  {notif.message}
                </p>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-[10px] font-black text-t-muted uppercase tracking-widest">{formatNotificationTime(notif, timeNow)}</p>
                  {[...ACTIONABLE_TYPES, 'program_launch', 'project_invite'].includes(notif.type) && (
                    <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase ${notif.type === 'help_request' ? 'bg-rose-50 text-rose-500' : notif.type === 'help_feedback_request' ? 'bg-amber-50 text-amber-500' : isReviewTone(notif) ? 'bg-emerald-50 text-emerald-600' : notif.type === 'program_launch' ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-[#3B5FE6]'}`}>
                      {notif.handled ? (notif.approved ? 'Approuvé' : 'Refusé') : 'Action requise'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {visibleNotifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="w-20 h-20 bg-t-surface-alt rounded-full flex items-center justify-center text-t-muted">
                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0l-8 8-8-8" /></svg>
              </div>
              <p className="text-t-tertiary font-bold italic">Aucune notification</p>
            </div>
          )}
        </div>
      </div>

      {/* Detail View (Slide-in) */}
      {selectedNotificationRequest && (
        <div className="absolute inset-0 z-50 main-container flex flex-col animate-in slide-in-from-right duration-500 overflow-hidden">
          {/* Header */}
          <div className="pt-12 pb-4 px-6 flex items-center justify-between border-b border-t-border shrink-0">
            <button 
              onClick={() => setSelectedNotificationRequest(null)}
              className="p-2 text-t-tertiary hover:text-t-primary transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h2 className="text-lg font-black text-t-primary uppercase tracking-tighter text-center flex-1 mx-4">
              Détails de Demande
            </h2>
            <div className="w-10"></div> {/* Spacer */}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
            {/* Request Info Card */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] font-black text-t-tertiary uppercase tracking-[0.2em]">
                  {getDetailTitle(selectedNotificationRequest)}
                </h3>
                <span className="text-[10px] font-black text-[#3B5FE6]">{formatNotificationTime(selectedNotificationRequest, timeNow)}</span>
              </div>
              
              <div className="bg-t-surface rounded-[32px] p-6 shadow-sm border border-t-border space-y-4 transition-colors duration-300">
                {selectedNotificationRequest.type !== 'CONTACT_REQUEST' && (
                  <div 
                    onClick={() => {
                      const sender = findUserByIdentity(usersList, selectedNotificationRequest.senderId || selectedNotificationRequest.requesterId, currentUser);
                      if (sender) {
                        setPreviousTab(activeTab);
                        setSelectedUser(sender);
                        setCurrentProjectId(selectedNotificationRequest.projectId);
                        setActiveTab(TABS.PROFILE);
                      }
                    }}
                    className={`p-4 rounded-2xl border transition-all ${
                    selectedNotificationRequest.type === 'help_request' ? 'bg-rose-50 border-rose-100' : 
                    selectedNotificationRequest.type === 'help_feedback_request' ? 'bg-amber-50 border-amber-100' : 
                    isReviewTone(selectedNotificationRequest) ? 'bg-emerald-50 border-emerald-100 cursor-pointer hover:bg-emerald-100' : 'bg-blue-50 border-blue-100'
                  }`}>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${
                      selectedNotificationRequest.type === 'help_request' ? 'text-rose-500' : 
                      selectedNotificationRequest.type === 'help_feedback_request' ? 'text-amber-500' : 
                      isReviewTone(selectedNotificationRequest) ? 'text-emerald-600' : 'text-[#3B5FE6]'
                    }`}>Projet cible</p>
                    <p className="text-sm font-black text-t-primary underline">{selectedNotificationRequest.projectTitle}</p>
                  </div>
                )}
                
                {selectedNotificationRequest.type !== 'review_request' && getDetailMessage(selectedNotificationRequest) && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-t-tertiary uppercase">Message</h4>
                    <div className="text-sm font-medium text-t-primary leading-relaxed bg-t-surface-alt p-5 rounded-[24px]">
                      {getDetailMessage(selectedNotificationRequest)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sender Profile Card */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-t-tertiary uppercase tracking-[0.2em] px-2">
                {selectedNotificationRequest.type === 'help_request' ? "Demandeur" : 
                 selectedNotificationRequest.type === 'CONTACT_REQUEST' ? "Requérant" : "Profil"}
              </h3>
              <div 
                onClick={() => viewSenderProfile(selectedNotificationRequest.senderId || selectedNotificationRequest.requesterId)}
                className="bg-t-surface p-5 rounded-[32px] shadow-sm border border-t-border flex items-center space-x-4 cursor-pointer hover:border-[#3B5FE6]/30 active:scale-[0.98] transition-all group"
              >
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-xl font-black text-[#3B5FE6] border-2 border-t-surface shadow-inner">
                  {(selectedNotificationRequest.senderName || selectedNotificationRequest.requesterName || '?')[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-t-primary text-lg leading-tight group-hover:text-[#3B5FE6] transition-colors">
                    {selectedNotificationRequest.senderName || selectedNotificationRequest.requesterName}
                  </h3>
                  <div className="flex items-center space-x-1 mt-1">
                    <span className="text-[10px] font-black text-emerald-500 uppercase">Voir le profil complet</span>
                    <svg className="h-3 w-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 pb-32">
              {!selectedNotificationRequest.handled ? (
                <div className={`grid gap-4 ${showDenyButton(selectedNotificationRequest) ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {showDenyButton(selectedNotificationRequest) && (
                    <button 
                      onClick={() => handleDeny(selectedNotificationRequest.id)}
                      className="py-5 bg-t-surface-alt backdrop-blur-md text-t-tertiary font-black rounded-3xl active:scale-95 transition-all uppercase tracking-widest text-xs border border-t-border shadow-sm"
                    >
                      {selectedNotificationRequest.type === 'CONTACT_REQUEST' ? 'Ignorer' : 'Refuser'}
                    </button>
                  )}
                  <button 
                    onClick={() => handleApprove(selectedNotificationRequest.id)}
                    className="py-5 bg-[#3B5FE6] text-white font-black rounded-3xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all uppercase tracking-widest text-xs"
                  >
                    {getApproveLabel(selectedNotificationRequest)}
                  </button>
                </div>
              ) : (
                <div className="py-4 text-center">
                   <p className="text-sm font-bold text-t-tertiary uppercase tracking-widest">
                     Demande traitée ({selectedNotificationRequest.approved ? 'Approuvée' : 'Refusée'})
                   </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
