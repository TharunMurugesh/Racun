import { useState, useCallback, useEffect } from 'react';
import './index.css';


import LandingPage    from './pages/LandingPage.jsx';
import Dashboard      from './pages/Dashboard.jsx';
import CandidateRanker from './pages/CandidateRanker.jsx';
import HoneypotCenter from './pages/HoneypotCenter.jsx';
import OntologySettings from './pages/OntologySettings.jsx';


/* ─────────────────────────────── Icon Components ─────────────────────────────── */
const Icon = ({ d, size = 20, stroke = 'currentColor' }) => (
  <svg width={size} height={size} fill="none" stroke={stroke} strokeWidth="1.8" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const ICONS = {
  home:     'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',
  grid:     'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z',
  users:    'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
  shield:   'M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z',
  cog:      'M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  user:     'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z',
  logout:   'M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9',
  check:    'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  warn:     'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
  info:     'M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z',
};

/* ──────────────────────────── Navigation Config ──────────────────────────── */
const NAV_ITEMS = [
  { id: 'dashboard',  label: 'Dashboard',        icon: ICONS.grid,   section: 'main' },
  { id: 'ranker',     label: 'Candidate Ranker',  icon: ICONS.users,  section: 'main' },
  { id: 'honeypots',  label: 'Honeypot Center',   icon: ICONS.shield, section: 'main' },
  { id: 'ontology',   label: 'Ontology & Settings', icon: ICONS.cog, section: 'settings' },
];

/* ─────────────────────────────── Toast System ────────────────────────────── */
function ToastContainer({ toasts, onDismiss }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: '28px',
      right: '28px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => onDismiss(t.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 18px',
            background: 'var(--bg-secondary)',
            border: `1px solid ${t.type === 'success' ? 'var(--accent-teal)' : t.type === 'error' ? 'var(--accent-red)' : 'var(--border-medium)'}`,
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            backdropFilter: 'blur(20px)',
            color: 'var(--text-primary)',
            fontSize: '0.875rem',
            fontWeight: '500',
            pointerEvents: 'all',
            cursor: 'pointer',
            animation: 'toastSlideIn 0.35s cubic-bezier(0.16,1,0.3,1) forwards',
            maxWidth: '380px',
          }}
        >
          <span style={{ color: t.type === 'success' ? '#34d399' : t.type === 'error' ? '#f87171' : '#93c5fd', flexShrink: 0 }}>
            <Icon d={t.type === 'success' ? ICONS.check : t.type === 'error' ? ICONS.warn : ICONS.info} size={18} />
          </span>
          <span style={{ flex: 1 }}>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

/* ──────────────────────────── Sidebar Component ────────────────────────── */
function Sidebar({ currentPage, onNavigate, sidebarOpen, onToggle }) {
  const mainItems    = NAV_ITEMS.filter(i => i.section === 'main');
  const settingItems = NAV_ITEMS.filter(i => i.section === 'settings');

  return (
    <>
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          onClick={onToggle}
          style={{
            display: 'none',
            position: 'fixed', inset: 0, zIndex: 40,
            background: 'rgba(0,0,0,0.6)',
          }}
          className="sidebar-overlay"
        />
      )}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        {/* Logo / Wordmark */}
        <div style={{ padding: '28px 20px 20px', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px',
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
              borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 16px rgba(124,58,237,0.4)',
              flexShrink: 0,
            }}>
              <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: '800', fontSize: '1.1rem', letterSpacing: '-0.03em' }}>
                RACUN<span style={{ color: 'var(--accent-primary)' }}>v2</span>
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '-2px', letterSpacing: '0.05em' }}>
                REASONING ENGINE
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 8px', marginBottom: '6px' }}>
              Pipeline
            </div>
            {mainItems.map(item => (
              <NavItem key={item.id} item={item} active={currentPage === item.id} onNavigate={onNavigate} />
            ))}
          </div>

          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 8px', marginBottom: '6px' }}>
              Configuration
            </div>
            {settingItems.map(item => (
              <NavItem key={item.id} item={item} active={currentPage === item.id} onNavigate={onNavigate} />
            ))}
          </div>
        </nav>
      </aside>
    </>
  );
}

function NavItem({ item, active, onNavigate }) {
  return (
    <button
      onClick={() => onNavigate(item.id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        width: '100%',
        padding: '10px 10px',
        borderRadius: 'var(--radius-sm)',
        border: 'none',
        background: active ? 'rgba(124, 58, 237, 0.15)' : 'transparent',
        color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
        fontFamily: 'var(--font-body)',
        fontWeight: active ? '600' : '500',
        fontSize: '0.875rem',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all var(--transition-fast)',
        position: 'relative',
        marginBottom: '2px',
      }}
      className="nav-item"
    >
      {active && (
        <span style={{
          position: 'absolute',
          left: 0,
          top: '20%',
          bottom: '20%',
          width: '3px',
          borderRadius: '0 3px 3px 0',
          background: 'var(--accent-primary)',
          boxShadow: '0 0 8px var(--accent-primary)',
        }} />
      )}
      <Icon d={item.icon} size={18} stroke={active ? 'var(--accent-primary)' : 'currentColor'} />
      {item.label}
    </button>
  );
}

/* ────────────────────── Mobile Hamburger Button ──────────────────────── */
function HamburgerBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="hamburger-btn"
      style={{
        position: 'fixed',
        top: '16px',
        left: '16px',
        zIndex: 50,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-sm)',
        padding: '8px',
        cursor: 'pointer',
        color: 'var(--text-primary)',
      }}
    >
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
      </svg>
    </button>
  );
}

/* ──────────────────────── Topbar Component ────────────────────────────── */
function Topbar({ currentPage, onToggle }) {
  const label = NAV_ITEMS.find(n => n.id === currentPage)?.label || 'RACUN v2';
  return (
    <header style={{
      height: '64px',
      borderBottom: '1px solid var(--border-light)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 28px',
      gap: '16px',
      background: 'var(--bg-primary)',
      flexShrink: 0,
    }}>
      <button
        onClick={onToggle}
        className="topbar-hamburger"
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          display: 'none',
          padding: '4px',
          borderRadius: '6px',
        }}
      >
        <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>
      <div style={{ fontFamily: 'var(--font-heading)', fontWeight: '700', fontSize: '1.05rem' }}>
        {label}
      </div>
      <div style={{ flex: 1 }} />
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '5px 12px',
        background: 'rgba(13, 148, 136, 0.1)',
        border: '1px solid rgba(13, 148, 136, 0.25)',
        borderRadius: 'var(--radius-full)',
      }}>
        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', animation: 'pulseStatus 2s infinite' }} />
        <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: '600' }}>Engine Ready</span>
      </div>
    </header>
  );
}

/* ─────────────────────────────── Main App ────────────────────────────── */
export default function App() {
  const [page, setPage] = useState('ranker');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Toast helpers
  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const navigate = useCallback((target) => {
    setPage(target);
    setSidebarOpen(false);
  }, []);

  // Key shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const showAppShell = page !== 'landing';

  const renderPage = () => {
    switch (page) {
      case 'landing':
        return <LandingPage onLaunch={() => navigate('dashboard')} />;
      case 'dashboard':
        return <Dashboard onNavigate={navigate} addToast={addToast} />;
      case 'ranker':
        return <CandidateRanker addToast={addToast} />;
      case 'honeypots':
        return <HoneypotCenter addToast={addToast} />;
      case 'ontology':
        return <OntologySettings addToast={addToast} />;
      default:
        return <Dashboard onNavigate={navigate} addToast={addToast} />;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Landing page — full width, no sidebar */}
      {!showAppShell && (
        <div style={{ width: '100%', height: '100%', overflowY: 'auto' }}>
          {renderPage()}
        </div>
      )}

      {/* App shell with sidebar */}
      {showAppShell && (
        <>
          <Sidebar
            currentPage={page}
            onNavigate={navigate}
            sidebarOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(o => !o)}
          />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
            <Topbar currentPage={page} onToggle={() => setSidebarOpen(o => !o)} />
            <main style={{
              flex: 1,
              overflowY: 'auto',
              padding: '32px 36px',
              background: 'var(--bg-base)',
            }}>
              {renderPage()}
            </main>
          </div>
        </>
      )}


      {/* Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
