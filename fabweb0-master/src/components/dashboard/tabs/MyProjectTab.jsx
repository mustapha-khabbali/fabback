import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import ProjectHome from '../project/ProjectHome';
import ProjectCreateForm from '../project/ProjectCreateForm';
import ProjectDetail from '../project/ProjectDetail';
import RecycleBin from '../project/RecycleBin';
import ArticleHome from '../project/ArticleHome';
import ArticleCreateForm from '../project/ArticleCreateForm';
import ArticlePending from '../project/ArticlePending';

const VIEWS = {
  HOME: 'home',
  CREATE: 'create',
  DETAIL: 'detail',
  RECYCLE: 'recycle',
  ARTICLE_HOME: 'article-home',
  ARTICLE_CREATE: 'article-create',
  ARTICLE_PENDING: 'article-pending',
};

export default function MyProjectTab() {
  const { currentProjectId, setCurrentProjectId, projectCreateRequestKey, userProjects } = useApp();
  const hasSelectedProject = Boolean(
    currentProjectId && (userProjects || []).some((project) => String(project.id) === String(currentProjectId))
  );
  const [view, setView] = useState(() => currentProjectId ? VIEWS.DETAIL : VIEWS.HOME);
  const lastHandledCreateRequestRef = useRef(projectCreateRequestKey);

  useEffect(() => {
    if (currentProjectId && hasSelectedProject) {
      setView(VIEWS.DETAIL);
    } else if (!currentProjectId) {
      setView(VIEWS.HOME);
    }
  }, [currentProjectId, hasSelectedProject]);

  useEffect(() => {
    if (projectCreateRequestKey !== lastHandledCreateRequestRef.current) {
      lastHandledCreateRequestRef.current = projectCreateRequestKey;
      setView(VIEWS.CREATE);
    }
  }, [projectCreateRequestKey]);

  const showHome = () => {
    setCurrentProjectId(null);
    setView(VIEWS.HOME);
  };

  const renderHome = () => (
    <ProjectHome
      onCreateProject={() => setView(VIEWS.CREATE)}
      onShowDetail={() => setView(VIEWS.DETAIL)}
      onShowRecycle={() => setView(VIEWS.RECYCLE)}
      onShowArticles={() => setView(VIEWS.ARTICLE_HOME)}
    />
  );

  const renderView = () => {
    switch (view) {
      case VIEWS.HOME:
        return renderHome();
      case VIEWS.CREATE:
        return <ProjectCreateForm onBack={showHome} />;
      case VIEWS.DETAIL:
        return hasSelectedProject ? <ProjectDetail onBack={showHome} /> : renderHome();
      case VIEWS.RECYCLE:
        return <RecycleBin onBack={showHome} />;
      case VIEWS.ARTICLE_HOME:
        return <ArticleHome onBack={showHome} onCreateArticle={() => setView(VIEWS.ARTICLE_CREATE)} onShowPending={() => setView(VIEWS.ARTICLE_PENDING)} />;
      case VIEWS.ARTICLE_CREATE:
        return <ArticleCreateForm onBack={() => setView(VIEWS.ARTICLE_HOME)} />;
      case VIEWS.ARTICLE_PENDING:
        return <ArticlePending onBack={() => setView(VIEWS.ARTICLE_HOME)} />;
      default:
        return renderHome();
    }
  };

  const isDetailView = view !== VIEWS.HOME && !(view === VIEWS.DETAIL && !hasSelectedProject);
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isDetailView) return;

    const stop = (e) => e.stopPropagation();
    el.addEventListener('touchstart', stop, { passive: true });
    el.addEventListener('touchmove', stop, { passive: true });
    el.addEventListener('touchend', stop, { passive: true });

    return () => {
      el.removeEventListener('touchstart', stop);
      el.removeEventListener('touchmove', stop);
      el.removeEventListener('touchend', stop);
    };
  }, [isDetailView]);

  return (
    <div 
      ref={containerRef}
      className="flex flex-col h-full"
    >
      {renderView()}
    </div>
  );
}
