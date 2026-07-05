import { useApp, TABS } from '../../context/AppContext';
import BottomNav from './BottomNav';
import FabLabTab from './tabs/FabLabTab';
import ScanTab from './tabs/ScanTab';
import NotificationsTab from './tabs/NotificationsTab';
import MyProjectTab from './tabs/MyProjectTab';
import MyProfileTab from './tabs/MyProfileTab';
import MemberProfileTab from './tabs/MemberProfileTab';
import SearchTab from './tabs/SearchTab';
import ProjectReviewTab from './tabs/ProjectReviewTab';
import useSwipe from '../../hooks/useSwipe';

export default function LoginScreen() {
  const { activeTab, setActiveTab, selectedUser, isUserInLab } = useApp();

  const tabOrder = [TABS.FABLAB, TABS.SCAN, TABS.NOTIFICATIONS, TABS.MY_PROJECT, TABS.PROFILE];

  const handleNextTab = () => {
    const currentIndex = tabOrder.indexOf(activeTab);
    if (currentIndex < tabOrder.length - 1) {
      setActiveTab(tabOrder[currentIndex + 1]);
    }
  };

  const handlePrevTab = () => {
    const currentIndex = tabOrder.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabOrder[currentIndex - 1]);
    }
  };

  const isAtFirstTab = activeTab === tabOrder[0];
  const isAtLastTab = activeTab === tabOrder[tabOrder.length - 1];

  const { ref: swipeRef } = useSwipe({
    onSwipeLeft: isAtLastTab ? null : handleNextTab,
    onSwipeRight: isAtFirstTab ? null : handlePrevTab,
  });

  const renderTab = () => {
    switch (activeTab) {
      case TABS.FABLAB: return <FabLabTab />;
      case TABS.SCAN: return <ScanTab />;
      case TABS.NOTIFICATIONS: return <NotificationsTab />;
      case TABS.SEARCH: return <SearchTab />;
      case TABS.MY_PROJECT: return <MyProjectTab />;
      case TABS.PROFILE: 
        return selectedUser ? <MemberProfileTab /> : <MyProfileTab />;
      case TABS.PROJECT_REVIEW:
        return <ProjectReviewTab />;
      default: return <ScanTab />;
    }
  };



  return (
    <div className="flex flex-col w-full h-dvh main-container overflow-hidden">
      {/* Tab Content Area — overscroll-behavior: none ONLY here, not global */}
      <div 
        className="flex-1 overflow-y-auto custom-scrollbar relative"
        style={{ overscrollBehavior: 'none' }}
      >
        <div ref={swipeRef} className="w-full h-full">
          {renderTab()}
        </div>
      </div>

      {/* Floating Status Labels (Only visible in Scan Tab) */}
      {activeTab === TABS.SCAN && (
        <div className="absolute bottom-20 left-0 right-0 flex justify-center items-center space-x-3 pointer-events-none z-40 px-4">
          {isUserInLab && (
            <div className="flex items-center space-x-2 bg-emerald-600 text-white px-5 py-2.5 rounded-full shadow-md pointer-events-auto cursor-pointer animate-in slide-in-from-bottom duration-300"
                 onClick={() => alert('Vous êtes dans le FabLab ! Vous devez utiliser le scan pour sortir.')}>
              <span className="w-2 h-2 rounded-full bg-t-surface glass-card animate-pulse"></span>
              <span className="font-bold text-[13px] tracking-wide whitespace-nowrap">In-FabLab</span>
            </div>
          )}

        </div>
      )}

      {/* Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
}
