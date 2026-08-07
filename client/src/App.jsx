import { useState, useEffect } from 'react';
// import Vortex from './components/Vortex';
import Navbar from './components/Navbar';
import Toast from './components/Toast';
import PetMascot from './components/PetMascot';
import FloatingWhatsApp from './components/FloatingWhatsApp';
import ServerWakeUp from './components/ServerWakeUp';
import CustomerPortal from './pages/CustomerPortal';
import BotSimulator from './pages/BotSimulator';
import AdminDashboard from './pages/AdminDashboard';
import { useSettings } from './hooks/useSettings';
import { useAdminAuth } from './hooks/useAdminAuth';
import { useToast } from './components/Toast';
import StarsBackground from './components/StarsBackground';

const TABS = ['portal', 'simulator', 'admin'];

function getInitialTab() {
  const hash = window.location.hash.substring(1);
  return TABS.includes(hash) ? hash : 'portal';
}

export default function App() {
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [showCertModalGlobal, setShowCertModalGlobal] = useState(false);
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

  // Apply initial theme (Permanently Dark Theme)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
  }, []);

  return (
    <StarsBackground containeClassName="min-h-screen">

      <Navbar activeTab={activeTab} onTabChange={switchTab} onOpenCertificate={() => setShowCertModalGlobal(true)} shopSettings={shopSettings} />
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

      {/* GLOBAL CSC CERTIFICATE MODAL */}
      {showCertModalGlobal && (
        <div className="modal open" onClick={() => setShowCertModalGlobal(false)} style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 9999 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '850px', width: '95%', background: 'var(--bg-secondary)', border: '1px solid var(--primary-color)', borderRadius: '16px', overflow: 'hidden' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <i className="fa-solid fa-award" style={{ color: 'var(--primary-color)', fontSize: '1.3rem' }}></i>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>CSC Government Authorized Certificate</h3>
                  <span style={{ fontSize: '0.78rem', color: '#4ade80' }}><i className="fa-solid fa-check-double"></i> Verified Official Document • Ministry of Electronics &amp; IT</span>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowCertModalGlobal(false)}>&times;</button>
            </div>
            <div className="modal-body" style={{ padding: '1rem', textAlign: 'center', background: '#000' }}>
              <img src="/csc_certificate.png" alt="CSC Govt Certificate" style={{ width: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: '8px' }} />
            </div>
            <div className="modal-footer" style={{ justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-tertiary)' }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                CSC ID: <strong>245556360016</strong> • VLE Operator: <strong>Pratap Kushwaha</strong>
              </div>
              <button className="btn btn-outline" onClick={() => setShowCertModalGlobal(false)}>
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-dev">
            <img src="/prave.png" alt="Praveen" className="footer-avatar" />
            <div className="footer-dev-text">
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
            <div className="footer-dev-text">
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
      { <Toast message={toast.message} type={toast.type} visible={toast.visible} /> }
      {/* Server wake-up banner — only shows on production when Render server is cold-starting */}
      <ServerWakeUp />


    </StarsBackground>
  );
}
