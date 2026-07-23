import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Toast from './components/Toast';
import PetMascot from './components/PetMascot';
import FloatingWhatsApp from './components/FloatingWhatsApp';
import CustomerPortal from './pages/CustomerPortal';
import BotSimulator from './pages/BotSimulator';
import AdminDashboard from './pages/AdminDashboard';
import { useSettings } from './hooks/useSettings';
import { useAdminAuth } from './hooks/useAdminAuth';
import { useToast } from './components/Toast';

const TABS = ['portal', 'simulator', 'admin'];

function getInitialTab() {
  const hash = window.location.hash.substring(1);
  return TABS.includes(hash) ? hash : 'portal';
}

export default function App() {
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const { shopSettings, refetch: refetchSettings } = useSettings();
  const { adminToken, login, logout, isLoggedIn } = useAdminAuth();
  const { toast, showToast } = useToast();

  const switchTab = (tab) => {
    setActiveTab(tab);
    window.location.hash = tab;
  };

  // Sync tab with browser hash
  useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash.substring(1);
      if (TABS.includes(hash)) setActiveTab(hash);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Apply initial theme
  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'system';
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  return (
    <>
      <Navbar activeTab={activeTab} onTabChange={switchTab} shopSettings={shopSettings} />
      <main className="main-container">
        {activeTab === 'portal' && (
          <CustomerPortal
            shopSettings={shopSettings}
            showToast={showToast}
            adminToken={adminToken}
            onSubmitSuccess={isLoggedIn ? undefined : undefined}
          />
        )}
        {activeTab === 'simulator' && (
          <BotSimulator shopSettings={shopSettings} onGoToAdmin={() => switchTab('admin')} />
        )}
        {activeTab === 'admin' && (
          <AdminDashboard
            adminToken={adminToken}
            login={login}
            logout={logout}
            showToast={showToast}
            isLoggedIn={isLoggedIn}
            onRefreshSettings={refetchSettings}
          />
        )}
      </main>
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-dev">
            <img src="/prave.png" alt="Praveen" className="footer-avatar" />
            <div>
              <p className="footer-dev-name">Praveen</p>
              <p className="footer-dev-role">Lead Developer &amp; Frontend Engineer</p>
              <p className="footer-dev-sub">MCA Student</p>
            </div>
          </div>
          <div className="footer-center">
            <p className="footer-copy">&copy; 2026 <span>{shopSettings?.shopName || 'Maa Durga Online Center'}</span></p>
            <p className="footer-tagline">Professional Website &amp; Bot Development</p>
          </div>
          <div className="footer-dev footer-dev-right">
            <div style={{ textAlign: 'right' }}>
              <p className="footer-dev-name">Abhishek</p>
              <p className="footer-dev-role">Lead Developer &amp; Frontend Engineer</p>
              <p className="footer-dev-sub">MCA Student</p>
            </div>
            <img src="/abhi.jpg" alt="Abhishek" className="footer-avatar" />
          </div>
        </div>
      </footer>
      <FloatingWhatsApp shopSettings={shopSettings} />
      <PetMascot />
      <Toast message={toast.message} type={toast.type} visible={toast.visible} />
    </>
  );
}
