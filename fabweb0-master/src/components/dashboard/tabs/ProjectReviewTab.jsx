import { useState } from 'react';
import { useApp, TABS } from '../../../context/AppContext';
import { api } from '../../../services/api';

export default function ProjectReviewTab() {
  const { reviewingProject, setReviewingProject, setActiveTab, showNotification, setNotifications } = useApp();
  const [ratings, setRatings] = useState({
    problemSolving: 0,
    technicalExecution: 0,
    functionality: 0,
    innovation: 0,
    feasibility: 0,
    safetyCompliance: 0,
    sdgAlignment: 0,
    intuitionUsability: 0
  });
  const [feedback, setFeedback] = useState('');

  if (!reviewingProject) {
    setActiveTab(TABS.NOTIFICATIONS);
    return null;
  }

  const criteria = [
    { id: 'problemSolving', label: 'Problem Solving', desc: 'Does the prototype solve the specific problem it was designed for?' },
    { id: 'technicalExecution', label: 'Technical Execution', desc: 'Assess the quality of the fabrication (laser cuts, 3D print adhesion, electronics).' },
    { id: 'functionality', label: 'Functionality', desc: 'Assess the overall functional performance of the prototype.' },
    { id: 'innovation', label: 'Innovation', desc: 'Evaluate how innovative the project is.' },
    { id: 'feasibility', label: 'Feasibility', desc: 'Can this project be produced at scale or with sustainable costs?' },
    { id: 'safetyCompliance', label: 'Safety & Compliance', desc: 'No exposed wires, sharp edges, or toxic materials.' },
    { id: 'sdgAlignment', label: 'SDG Alignment', desc: 'Does the prototype align with Sustainable Development Goals (SDGs)?' },
    { id: 'intuitionUsability', label: 'Intuition & Usability', desc: 'Can a new user understand how to interact without a manual?' }
  ];

  const handleRating = (id, value) => {
    setRatings(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async () => {
    try {
      await api.createReview({
        projectId: reviewingProject.projectId,
        ...ratings,
        feedback
      });
      if (reviewingProject.id) {
        await api.updateNotification(reviewingProject.id, { status: 'read', handled: true, approved: true }).catch(() => {});
        setNotifications(prev => prev.filter(n => n.id !== reviewingProject.id));
      }
      showNotification("Review soumise avec succès !");
      setReviewingProject(null);
      setActiveTab(TABS.NOTIFICATIONS);
    } catch (error) {
      showNotification(error.message || "Review impossible.", "error");
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F0F7FF] relative overflow-hidden">
      {/* Header */}
      <div className="pt-12 pb-6 px-6 bg-t-surface glass-card shadow-sm border-b border-t-border shrink-0">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => { setReviewingProject(null); setActiveTab(TABS.NOTIFICATIONS); }}
            className="p-2 text-t-tertiary hover:text-t-primary transition-colors bg-t-surface-alt rounded-full"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-black text-t-primary uppercase tracking-tighter truncate">
              Review: {reviewingProject.projectTitle}
            </h2>
            <p className="text-[10px] font-bold text-t-tertiary uppercase tracking-widest">
              Reviewer: {reviewingProject.senderName}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 pb-32">
        {criteria.map((item) => (
          <div key={item.id} className="bg-t-surface glass-card p-6 rounded-[32px] shadow-sm border border-t-border space-y-4">
            <div className="space-y-1">
              <h4 className="text-sm font-black text-t-primary uppercase">{item.label}</h4>
              <p className="text-xs text-t-primary/50 font-medium leading-relaxed">{item.desc}</p>
            </div>
            
            <div className="flex items-center justify-between py-3 bg-t-surface-alt/50 rounded-2xl px-4 border border-t-border-subtle">
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button 
                    key={star} 
                    onClick={() => handleRating(item.id, star)}
                    className={`p-1 transition-all active:scale-125 ${star <= ratings[item.id] ? 'text-amber-400' : 'text-gray-200'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
              </div>
              <span className={`text-lg font-black ${ratings[item.id] > 0 ? 'text-[#3B5FE6]' : 'text-gray-300'}`}>
                {ratings[item.id]}/5
              </span>
            </div>
          </div>
        ))}

        {/* Feedback Section */}
        <div className="bg-t-surface glass-card p-6 rounded-[32px] shadow-sm border border-t-border space-y-4">
          <div className="space-y-1 px-1">
            <h4 className="text-sm font-black text-t-primary uppercase">Remarques Additionnelles</h4>
            <p className="text-xs text-t-primary/50 font-medium">Laisse un commentaire général sur le projet.</p>
          </div>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Écris tes remarques ici..."
            className="w-full h-40 p-5 bg-t-surface-alt rounded-3xl border border-t-border focus:border-[#3B5FE6] focus:bg-t-surface glass-card outline-none text-sm font-medium transition-all resize-none custom-scrollbar"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button 
            onClick={handleSubmit}
            className="w-full py-5 bg-midnight-blue text-white font-black rounded-3xl shadow-2xl active:scale-95 transition-all uppercase tracking-widest text-sm"
          >
            Soumettre la Review
          </button>
        </div>
      </div>
    </div>
  );
}
