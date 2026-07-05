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
  const { currentProjectId } = useApp();
  const [view, setView] = useState(() => currentProjectId ? VIEWS.DETAIL : VIEWS.HOME);

  useEffect(() => {
    if (currentProjectId) {
      setView(VIEWS.DETAIL);
    } else {
      setView(VIEWS.HOME);
    }
  }, [currentProjectId]);

  const renderView = () => {
    switch (view) {
      case VIEWS.HOME:
        return <ProjectHome onCreateProject={() => setView(VIEWS.CREATE)} onShowDetail={() => setView(VIEWS.DETAIL)} onShowRecycle={() => setView(VIEWS.RECYCLE)} onShowArticles={() => setView(VIEWS.ARTICLE_HOME)} />;
      case VIEWS.CREATE:
        return <ProjectCreateForm onBack={() => setView(VIEWS.HOME)} />;
      case VIEWS.DETAIL:
        return <ProjectDetail onBack={() => setView(VIEWS.HOME)} />;
      case VIEWS.RECYCLE:
        return <RecycleBin onBack={() => setView(VIEWS.HOME)} />;
      case VIEWS.ARTICLE_HOME:
        return <ArticleHome onBack={() => setView(VIEWS.HOME)} onCreateArticle={() => setView(VIEWS.ARTICLE_CREATE)} onShowPending={() => setView(VIEWS.ARTICLE_PENDING)} />;
      case VIEWS.ARTICLE_CREATE:
        return <ArticleCreateForm onBack={() => setView(VIEWS.ARTICLE_HOME)} />;
      case VIEWS.ARTICLE_PENDING:
        return <ArticlePending onBack={() => setView(VIEWS.ARTICLE_HOME)} />;
      default:
        return <ProjectHome onCreateProject={() => setView(VIEWS.CREATE)} onShowDetail={() => setView(VIEWS.DETAIL)} onShowRecycle={() => setView(VIEWS.RECYCLE)} onShowArticles={() => setView(VIEWS.ARTICLE_HOME)} />;
    }
  };

  const isDetailView = view !== VIEWS.HOME;
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
