import { useState, useMemo, useEffect, useCallback } from 'react';
import { UserService } from '../../services/UserService';
import { InteractionService } from '../../services/InteractionService';
import { api } from '../../services/api';

const EMPTY_INTERACTIONS = {
  reviewedOthers: [],
  helpedOthers: [],
  helpedBy: [],
  reviewedByOthers: []
};

const EMPTY_BEHAVIOR = {
  score: null,
  recognitionsReceived: [],
  recognitionsSent: [],
  reportsReceived: [],
  reportsFiled: []
};

const REPORT_CATEGORY_LABELS = {
  disrespect: 'Manque de respect',
  cooperation: 'Mauvaise collaboration',
  copy: "Vol ou copie d'idée"
};

const REPORT_STATUS_META = {
  nouveau: { label: 'Nouveau', className: 'bg-accent-amber/10 text-accent-amber border-accent-amber/20' },
  valide: { label: 'Validé', className: 'bg-accent-red/10 text-accent-red border-accent-red/20' },
  rejete: { label: 'Rejeté', className: 'bg-white/[0.05] text-white/40 border-white/10 line-through' }
};

// Lab events display in lab time regardless of the viewer's device timezone.
function formatLabDateTime(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Africa/Casablanca',
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(date);
}

function ReportStatusBadge({ status }) {
  const meta = REPORT_STATUS_META[status] || REPORT_STATUS_META.nouveau;
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${meta.className}`}>
      {meta.label}
    </span>
  );
}

function ClickableLink({ text, onClick }) {
  const isClickable = typeof onClick === 'function';

  return (
    <span 
      className={`font-bold text-accent-blue transition-colors ${isClickable ? 'hover:text-white cursor-pointer hover:underline' : ''}`}
      onClick={(e) => {
        if (!isClickable) return;
        e.stopPropagation();
        onClick();
      }}
    >
      {text}
    </span>
  );
}

export default function InteractionsPanel({ user, usersList, onOpenUser }) {
  const interactions = user?.interactions || EMPTY_INTERACTIONS;

  const [activeCategory, setActiveCategory] = useState('all');
  const [expandedReviewId, setExpandedReviewId] = useState(null);
  const [behavior, setBehavior] = useState(EMPTY_BEHAVIOR);

  const loadBehavior = useCallback(() => {
    if (!user?.id) {
      setBehavior(EMPTY_BEHAVIOR);
      return;
    }
    api.getBehavior(user.id)
      .then((data) => setBehavior({ ...EMPTY_BEHAVIOR, ...data }))
      .catch(() => setBehavior(EMPTY_BEHAVIOR));
  }, [user?.id]);

  useEffect(() => {
    loadBehavior();
  }, [loadBehavior]);

  const reviewBehaviorReport = async (id, status) => {
    try {
      await api.reviewBehaviorReport(id, status);
      loadBehavior();
    } catch (error) {
      alert(error.message);
    }
  };

  const reviewsCount = (interactions.reviewedOthers?.length || 0) + (interactions.reviewedByOthers?.length || 0);
  const helpCount = (interactions.helpedOthers?.length || 0) + (interactions.helpedBy?.length || 0);
  const comportementCount = behavior.recognitionsReceived.length + behavior.reportsReceived.length;
  const totalCount = reviewsCount + helpCount + comportementCount;

  // Build unified chronological history
  const unifiedHistory = useMemo(() => {
    let history = [];
    
    (interactions.reviewedOthers || []).forEach(item => {
      history.push({ ...item, type: 'REVIEW_GIVEN' });
    });
    (interactions.reviewedByOthers || []).forEach(item => {
      history.push({ ...item, type: 'REVIEW_RECEIVED' });
    });
    (interactions.helpedOthers || []).forEach(item => {
      history.push({ ...item, type: 'HELP_GIVEN' });
    });
    (interactions.helpedBy || []).forEach(item => {
      history.push({ ...item, type: 'HELP_RECEIVED' });
    });

    // Comportement events join the same timeline (sortDate = real timestamp)
    behavior.recognitionsReceived.forEach(item => {
      history.push({ ...item, type: 'RECOGNITION_RECEIVED', sortDate: new Date(item.createdAt) });
    });
    behavior.recognitionsSent.forEach(item => {
      history.push({ ...item, type: 'RECOGNITION_GIVEN', sortDate: new Date(item.createdAt) });
    });
    behavior.reportsReceived.forEach(item => {
      history.push({ ...item, type: 'REPORT_RECEIVED', task: item.details, sortDate: new Date(item.createdAt) });
    });
    behavior.reportsFiled.forEach(item => {
      history.push({ ...item, type: 'REPORT_FILED', task: item.details, sortDate: new Date(item.createdAt) });
    });

    // Sort chronologically (most recent first)
    const sortValue = (item) => item.sortDate || new Date(`${item.date}T${item.time || '00:00'}`);
    history.sort((a, b) => sortValue(b) - sortValue(a));

    return history;
  }, [interactions, behavior]);

  const renderScorePill = (rating) => {
    const safeRating = Number(rating) || 0;
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent-amber/10 border border-accent-amber/20">
        <svg className="w-3.5 h-3.5 text-accent-amber" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        <span className="text-[11px] font-black text-accent-amber">{safeRating.toFixed(1)}</span>
      </div>
    );
  };

  const renderCriteriaScore = (rating) => {
    const safeRating = Number(rating) || 0;
    const displayRating = safeRating % 1 === 0 ? safeRating : safeRating.toFixed(1);
    
    return (
      <div className="px-2.5 py-1 rounded-md bg-white/[0.05] border border-white/10 flex items-center justify-center">
        <span className="text-[11px] font-black text-accent-amber">{displayRating}</span>
      </div>
    );
  };

  const getInitials = (name) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const toggleExpandReview = (id) => {
    setExpandedReviewId(expandedReviewId === id ? null : id);
  };

  const renderUserLink = (userId, name) => (
    <ClickableLink
      text={name}
      onClick={userId ? () => onOpenUser?.(userId) : undefined}
    />
  );

  // Ultra-Compact Empty State rendering
  const renderEmptyState = (message, iconColor) => (
    <div className="flex items-center justify-center p-3.5 bg-white/[0.02] border border-white/5 rounded-xl w-full gap-3">
      <svg className={`w-4 h-4 opacity-70 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-[12px] text-white/50">{message}</p>
    </div>
  );

  const navItems = [
    {
      id: 'all',
      label: 'Historique',
      count: totalCount,
      activeColor: 'bg-accent-blue border-accent-blue text-white',
      inactiveColor: 'bg-white/[0.02] border-white/10 text-white/50 hover:bg-white/[0.05] hover:text-white',
    },
    {
      id: 'reviews',
      label: 'Évaluations',
      count: reviewsCount,
      activeColor: 'bg-accent-purple border-accent-purple text-white',
      inactiveColor: 'bg-white/[0.02] border-white/10 text-white/50 hover:bg-white/[0.05] hover:text-white',
    },
    {
      id: 'help',
      label: 'Entraide',
      count: helpCount,
      activeColor: 'bg-accent-green border-accent-green text-white',
      inactiveColor: 'bg-white/[0.02] border-white/10 text-white/50 hover:bg-white/[0.05] hover:text-white',
    },
    {
      id: 'comportement',
      label: 'Comportement',
      count: comportementCount,
      activeColor: 'bg-accent-red border-accent-red text-white',
      inactiveColor: 'bg-white/[0.02] border-white/10 text-white/50 hover:bg-white/[0.05] hover:text-white',
    }
  ];

  return (
    <div className="section-card p-6 space-y-6">
      {/* Header & Brutal Horizontal Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h4 className="text-[11px] font-bold text-white/30 uppercase tracking-[2px]">Activité Récente</h4>
          <p className="text-[13px] text-white/50 mt-1">
            Interactions de {renderUserLink(user?.id, `${user?.prenom} ${user?.nom}`)}
          </p>
        </div>

        {/* Brutal Minimalist Horizontal Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {navItems.map((item) => {
            const isActive = activeCategory === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveCategory(item.id);
                  setExpandedReviewId(null);
                }}
                className={`px-4 py-2 rounded-lg border text-[12px] font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                  isActive ? item.activeColor : item.inactiveColor
                }`}
              >
                <span>{item.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                  isActive ? 'bg-black/20 text-white' : 'bg-white/10 text-white/50'
                }`}>
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Full-Width Content Area */}
      <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-2 custom-scrollbar">
        
        {/* UNIFIED HISTORY TIMELINE (ALL TAB) */}
        {activeCategory === 'all' && (
          <div className="space-y-4">
            {unifiedHistory.length === 0 ? (
              renderEmptyState("Aucune activité enregistrée.", "text-white")
            ) : (
              <div className="relative space-y-0 pl-4 border-l-2 border-white/10">
                {unifiedHistory.map((item, idx) => {
                  const peerName = UserService.getUserName(usersList, item.userId);
                  
                  // Determine icon and color based on type
                  let iconBg, iconColor, SvgIcon, content;
                  
                  switch (item.type) {
                    case 'REVIEW_GIVEN':
                      iconBg = 'bg-accent-blue/20'; iconColor = 'text-accent-blue';
                      SvgIcon = <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />;
                      content = <span>A évalué le projet <ClickableLink text={item.projectTitle} /> de {renderUserLink(item.userId, peerName)}</span>;
                      break;
                    case 'REVIEW_RECEIVED':
                      iconBg = 'bg-accent-purple/20'; iconColor = 'text-accent-purple';
                      SvgIcon = <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />;
                      content = <span>{renderUserLink(item.userId, peerName)} a évalué le projet <ClickableLink text={item.projectTitle} /></span>;
                      break;
                    case 'HELP_GIVEN':
                      iconBg = 'bg-accent-green/20'; iconColor = 'text-accent-green';
                      SvgIcon = <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />;
                      content = <span>A aidé {renderUserLink(item.userId, peerName)} sur la machine <span className="font-bold text-white/80">{item.machine}</span></span>;
                      break;
                    case 'HELP_RECEIVED':
                      iconBg = 'bg-accent-amber/20'; iconColor = 'text-accent-amber';
                      SvgIcon = <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />;
                      content = <span>{renderUserLink(item.userId, peerName)} a apporté son aide sur la machine <span className="font-bold text-white/80">{item.machine}</span></span>;
                      break;
                    case 'RECOGNITION_RECEIVED':
                      iconBg = 'bg-accent-green/20'; iconColor = 'text-accent-green';
                      SvgIcon = <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />;
                      content = <span>{renderUserLink(item.senderId, item.senderName)} a envoyé une reconnaissance{item.machineName ? <> (machine <span className="font-bold text-white/80">{item.machineName}</span>)</> : null}{item.counted === false ? <span className="text-white/30"> — non comptée</span> : null}</span>;
                      break;
                    case 'RECOGNITION_GIVEN':
                      iconBg = 'bg-accent-green/20'; iconColor = 'text-accent-green';
                      SvgIcon = <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />;
                      content = <span>A envoyé une reconnaissance à {renderUserLink(item.targetId, item.targetName)}</span>;
                      break;
                    case 'REPORT_RECEIVED':
                      iconBg = 'bg-accent-red/20'; iconColor = 'text-accent-red';
                      SvgIcon = <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />;
                      content = <span>{renderUserLink(item.senderId, item.senderName)} a signalé : <span className="font-bold text-white/80">{REPORT_CATEGORY_LABELS[item.category] || item.category}</span> <ReportStatusBadge status={item.status} /></span>;
                      break;
                    case 'REPORT_FILED':
                      iconBg = 'bg-accent-red/20'; iconColor = 'text-accent-red';
                      SvgIcon = <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2z" />;
                      content = <span>A signalé {renderUserLink(item.targetId, item.targetName)} : <span className="font-bold text-white/80">{REPORT_CATEGORY_LABELS[item.category] || item.category}</span> <ReportStatusBadge status={item.status} /></span>;
                      break;
                  }

                  return (
                    <div key={idx} className="relative pb-6 last:pb-0">
                      {/* Timeline dot */}
                      <div className={`absolute -left-[23px] top-1 w-6 h-6 rounded-full border-[3px] border-[#111827] flex items-center justify-center ${iconBg} ${iconColor}`}>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                          {SvgIcon}
                        </svg>
                      </div>
                      
                      <div className="bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors rounded-xl p-4">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-[13px] text-white/70">{content}</div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] text-white/30 font-mono bg-white/5 px-2 py-0.5 rounded">
                                {item.sortDate ? formatLabDateTime(item.createdAt) : `${item.date} ${item.time}`}
                              </span>
                            </div>
                          </div>
                          
                          {/* Extra info depending on type */}
                          {item.task && (
                            <p className="text-[12px] text-white/50 mt-1 pl-1 border-l border-white/10">{item.task}</p>
                          )}
                          {(item.rating || item.comment) && (
                            <div className="mt-2 flex items-center gap-3">
                              {item.rating && renderScorePill(item.rating)}
                              {item.comment && (
                                <p className="text-[11px] text-white/40 italic">"{item.comment}"</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SECTION: REVIEWS CATEGORY (DONE + RECEIVED) */}
        {activeCategory === 'reviews' && (
          <>
            <div className="space-y-4">
              <h5 className="text-[11px] font-bold text-accent-blue uppercase tracking-[1.5px] flex items-center gap-2 px-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-blue"></span>
                Projets Évalués (Faites)
              </h5>
              {(!interactions.reviewedOthers || interactions.reviewedOthers.length === 0) ? (
                renderEmptyState("Aucune évaluation soumise.", "text-accent-blue")
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {interactions.reviewedOthers.map((item, idx) => {
                    const cardId = `done-${idx}`;
                    const isExpanded = expandedReviewId === cardId;
                    const peerName = UserService.getUserName(usersList, item.userId);
                    
                    return (
                      <div 
                        key={idx} 
                        onClick={() => toggleExpandReview(cardId)}
                        className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col hover:bg-white/[0.04] transition-all cursor-pointer w-full"
                      >
                        <div className="flex gap-3">
                          <div className="w-10 h-10 rounded-xl bg-accent-blue/10 border border-accent-blue/20 text-accent-blue flex items-center justify-center font-bold text-[12px] shrink-0">
                            {getInitials(peerName)}
                          </div>
                          <div className="space-y-2 flex-grow min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h6 className="text-[13px] font-semibold text-white truncate">{renderUserLink(item.userId, peerName)}</h6>
                                <p className="text-[11px] text-white/40 truncate mt-0.5"><ClickableLink text={item.projectTitle} /></p>
                              </div>
                              <div className="flex flex-col items-end gap-1.5 shrink-0">
                                <span className="text-[10px] text-white/30">{item.date} {item.time}</span>
                                <svg 
                                  className={`w-3.5 h-3.5 text-white/40 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                  fill="none" 
                                  viewBox="0 0 24 24" 
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3 flex-wrap">
                              {item.rating && renderScorePill(item.rating)}
                            </div>
                          </div>
                        </div>

                        {/* Criteria Breakdown Accordion */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-white/5 space-y-3 animate-in fade-in duration-200" onClick={e => e.stopPropagation()}>
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-[1px] mb-2">Détail des Critères</p>
                            {(!item.criteriaRatings || Object.keys(item.criteriaRatings).length === 0) ? (
                              <p className="text-[11px] text-white/40 italic">Évaluation globale sans détails disponibles.</p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {Object.entries(item.criteriaRatings).map(([critKey, critVal]) => {
                                  const critInfo = InteractionService.getCriteriaInfo(critKey);
                                  return (
                                    <div key={critKey} className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 flex items-center justify-between gap-2">
                                      <div className="min-w-0">
                                        <p className="text-[11px] font-bold text-white leading-tight">{critInfo.label}</p>
                                      </div>
                                      <div className="shrink-0 w-full sm:w-auto">
                                        {renderCriteriaScore(critVal)}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {item.comment && (
                          <p className="text-[12px] text-white/60 bg-white/[0.02] border-l-2 border-accent-blue rounded-r-xl p-3 italic mt-3 leading-relaxed" onClick={e => e.stopPropagation()}>
                            "{item.comment}"
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h5 className="text-[11px] font-bold text-accent-purple uppercase tracking-[1.5px] flex items-center gap-2 px-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-purple"></span>
                Évaluations Reçues
              </h5>
              {(!interactions.reviewedByOthers || interactions.reviewedByOthers.length === 0) ? (
                renderEmptyState("Aucune évaluation reçue.", "text-accent-purple")
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {interactions.reviewedByOthers.map((item, idx) => {
                    const cardId = `received-${idx}`;
                    const isExpanded = expandedReviewId === cardId;
                    const peerName = UserService.getUserName(usersList, item.userId);

                    return (
                      <div 
                        key={idx} 
                        onClick={() => toggleExpandReview(cardId)}
                        className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col hover:bg-white/[0.04] transition-all cursor-pointer w-full"
                      >
                        <div className="flex gap-3">
                          <div className="w-10 h-10 rounded-xl bg-accent-purple/10 border border-accent-purple/20 text-accent-purple flex items-center justify-center font-bold text-[12px] shrink-0">
                            {getInitials(peerName)}
                          </div>
                          <div className="space-y-2 flex-grow min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h6 className="text-[13px] font-semibold text-white truncate">{renderUserLink(item.userId, peerName)}</h6>
                                <p className="text-[11px] text-white/40 truncate mt-0.5"><ClickableLink text={item.projectTitle} /></p>
                              </div>
                              <div className="flex flex-col items-end gap-1.5 shrink-0">
                                <span className="text-[10px] text-white/30">{item.date} {item.time}</span>
                                <svg 
                                  className={`w-3.5 h-3.5 text-white/40 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                  fill="none" 
                                  viewBox="0 0 24 24" 
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3 flex-wrap">
                              {item.rating && renderScorePill(item.rating)}
                            </div>
                          </div>
                        </div>

                        {/* Criteria Breakdown Accordion */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-white/5 space-y-3 animate-in fade-in duration-200" onClick={e => e.stopPropagation()}>
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-[1px] mb-2">Détail des Critères</p>
                            {(!item.criteriaRatings || Object.keys(item.criteriaRatings).length === 0) ? (
                              <p className="text-[11px] text-white/40 italic">Évaluation globale sans détails disponibles.</p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {Object.entries(item.criteriaRatings).map(([critKey, critVal]) => {
                                  const critInfo = InteractionService.getCriteriaInfo(critKey);
                                  return (
                                    <div key={critKey} className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 flex items-center justify-between gap-2">
                                      <div className="min-w-0">
                                        <p className="text-[11px] font-bold text-white leading-tight">{critInfo.label}</p>
                                      </div>
                                      <div className="shrink-0 w-full sm:w-auto">
                                        {renderCriteriaScore(critVal)}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {item.comment && (
                          <p className="text-[12px] text-white/60 bg-white/[0.02] border-l-2 border-accent-purple rounded-r-xl p-3 italic mt-3 leading-relaxed" onClick={e => e.stopPropagation()}>
                            "{item.comment}"
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* SECTION: HELP CATEGORY (GIVEN + RECEIVED) */}
        {activeCategory === 'help' && (
          <>
            <div className="space-y-4">
              <h5 className="text-[11px] font-bold text-accent-green uppercase tracking-[1.5px] flex items-center gap-2 px-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-green"></span>
                Entraide Apportée (Aidé)
              </h5>
              {(!interactions.helpedOthers || interactions.helpedOthers.length === 0) ? (
                renderEmptyState("Aucune aide enregistrée.", "text-accent-green")
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {interactions.helpedOthers.map((item, idx) => {
                    const peerName = UserService.getUserName(usersList, item.userId);
                    return (
                      <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col gap-3 hover:bg-white/[0.04] transition-colors w-full">
                        <div className="flex gap-3">
                          <div className="w-10 h-10 rounded-xl bg-accent-green/10 border border-accent-green/20 text-accent-green flex items-center justify-center font-bold text-[12px] shrink-0">
                            {getInitials(peerName)}
                          </div>
                          <div className="space-y-1.5 flex-grow min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h6 className="text-[13px] font-semibold text-white truncate">{renderUserLink(item.userId, peerName)}</h6>
                              <span className="text-[10px] text-white/30 shrink-0">{item.date} {item.time}</span>
                            </div>
                            <p className="text-[12px] text-white/70">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent-green/10 text-accent-green mr-2">
                                {item.machine || 'Général'}
                              </span>
                              {item.task}
                            </p>
                          </div>
                        </div>
                        {(item.rating || item.comment) && (
                          <div className="mt-2 pl-12 space-y-2">
                            {item.rating && renderScorePill(item.rating)}
                            {item.comment && (
                              <p className="text-[11px] text-white/50 bg-white/[0.01] border-l-2 border-accent-green/50 rounded-r-lg p-2 italic leading-relaxed">
                                "{item.comment}"
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h5 className="text-[11px] font-bold text-accent-amber uppercase tracking-[1.5px] flex items-center gap-2 px-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-amber"></span>
                Entraide Reçue
              </h5>
              {(!interactions.helpedBy || interactions.helpedBy.length === 0) ? (
                renderEmptyState("Aucune aide reçue.", "text-accent-amber")
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {interactions.helpedBy.map((item, idx) => {
                    const peerName = UserService.getUserName(usersList, item.userId);
                    return (
                      <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col gap-3 hover:bg-white/[0.04] transition-colors w-full">
                        <div className="flex gap-3">
                          <div className="w-10 h-10 rounded-xl bg-accent-amber/10 border border-accent-amber/20 text-accent-amber flex items-center justify-center font-bold text-[12px] shrink-0">
                            {getInitials(peerName)}
                          </div>
                          <div className="space-y-1.5 flex-grow min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h6 className="text-[13px] font-semibold text-white truncate">{renderUserLink(item.userId, peerName)}</h6>
                              <span className="text-[10px] text-white/30 shrink-0">{item.date} {item.time}</span>
                            </div>
                            <p className="text-[12px] text-white/70">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent-amber/10 text-accent-amber mr-2">
                                {item.machine || 'Général'}
                              </span>
                              {item.task}
                            </p>
                          </div>
                        </div>
                        {(item.rating || item.comment) && (
                          <div className="mt-2 pl-12 space-y-2">
                            {item.rating && renderScorePill(item.rating)}
                            {item.comment && (
                              <p className="text-[11px] text-white/50 bg-white/[0.01] border-l-2 border-accent-amber/50 rounded-r-lg p-2 italic leading-relaxed">
                                "{item.comment}"
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* SECTION: COMPORTEMENT (RECONNAISSANCES + SIGNALEMENTS) */}
        {activeCategory === 'comportement' && (
          <>
            <div className="space-y-4">
              <h5 className="text-[11px] font-bold text-accent-green uppercase tracking-[1.5px] flex items-center gap-2 px-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-green"></span>
                Reconnaissances Reçues
              </h5>
              {behavior.recognitionsReceived.length === 0 ? (
                renderEmptyState("Aucune reconnaissance reçue.", "text-accent-green")
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {behavior.recognitionsReceived.map((item) => (
                    <div key={item.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col gap-3 hover:bg-white/[0.04] transition-colors w-full">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent-green/10 border border-accent-green/20 text-accent-green flex items-center justify-center font-bold text-[12px] shrink-0">
                          {getInitials(item.senderName)}
                        </div>
                        <div className="space-y-1.5 flex-grow min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h6 className="text-[13px] font-semibold text-white truncate">{renderUserLink(item.senderId, item.senderName)}</h6>
                            <span className="text-[10px] text-white/30 shrink-0">{formatLabDateTime(item.createdAt)}</span>
                          </div>
                          <p className="text-[12px] text-white/70">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent-green/10 text-accent-green mr-2">
                              {item.machineName || item.projectTitle || 'Général'}
                            </span>
                            {item.counted === false && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/[0.05] text-white/40">non comptée</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 pl-12 space-y-2">
                        <div className="flex items-center gap-3">
                          {renderScorePill(item.rating)}
                          {item.counted !== false && (
                            <button
                              onClick={() => {
                                if (!window.confirm('Révoquer cette reconnaissance ? Le score sera recalculé.')) return;
                                api.revokeRecognition(item.id).then(loadBehavior).catch((error) => alert(error.message));
                              }}
                              className="text-[10px] font-bold uppercase tracking-widest text-white/30 hover:text-accent-red transition-colors"
                            >
                              Révoquer
                            </button>
                          )}
                        </div>
                        {item.comment && (
                          <p className="text-[11px] text-white/50 bg-white/[0.01] border-l-2 border-accent-green/50 rounded-r-lg p-2 italic leading-relaxed">
                            "{item.comment}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h5 className="text-[11px] font-bold text-accent-red uppercase tracking-[1.5px] flex items-center gap-2 px-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-red"></span>
                Signalements Reçus
              </h5>
              {behavior.reportsReceived.length === 0 ? (
                renderEmptyState("Aucun signalement.", "text-accent-red")
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {behavior.reportsReceived.map((item) => (
                    <div key={item.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col gap-3 hover:bg-white/[0.04] transition-colors w-full">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent-red/10 border border-accent-red/20 text-accent-red flex items-center justify-center font-bold text-[12px] shrink-0">
                          {getInitials(item.senderName)}
                        </div>
                        <div className="space-y-1.5 flex-grow min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h6 className="text-[13px] font-semibold text-white truncate">{renderUserLink(item.senderId, item.senderName)}</h6>
                            <span className="text-[10px] text-white/30 shrink-0">{formatLabDateTime(item.createdAt)}</span>
                          </div>
                          <p className="text-[12px] text-white/70 flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent-red/10 text-accent-red">
                              {REPORT_CATEGORY_LABELS[item.category] || item.category}
                            </span>
                            <ReportStatusBadge status={item.status} />
                            {item.reviewedByName && item.status !== 'nouveau' && (
                              <span className="text-[10px] text-white/30">par {item.reviewedByName}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 pl-12 space-y-2">
                        <p className="text-[11px] text-white/50 bg-white/[0.01] border-l-2 border-accent-red/50 rounded-r-lg p-2 italic leading-relaxed">
                          "{item.details}"
                        </p>
                        {item.status === 'nouveau' && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => reviewBehaviorReport(item.id, 'valide')}
                              className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-accent-red/10 border border-accent-red/20 text-accent-red hover:bg-accent-red hover:text-white transition-colors"
                            >
                              Valider
                            </button>
                            <button
                              onClick={() => reviewBehaviorReport(item.id, 'rejete')}
                              className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-white/[0.02] border border-white/10 text-white/50 hover:text-white transition-colors"
                            >
                              Rejeter
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
