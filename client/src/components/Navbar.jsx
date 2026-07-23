import { useState } from 'react';

export default function Navbar({ activeTab, onTabChange, shopSettings }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'system');

  const applyTheme = (t) => {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('theme', t);
    setTheme(t);
  };

  const cleanPhone = String(shopSettings?.shopPhone || '918707845206').replace(/[^0-9]/g, '');

  const navItems = [
    { id: 'portal', label: 'Customer Portal', icon: 'fa-solid fa-earth-americas' },
    { id: 'simulator', label: 'Bot Simulator', icon: 'fa-brands fa-whatsapp' },
    { id: 'admin', label: 'Admin Dashboard', icon: 'fa-solid fa-lock' },
  ];

  return (
    <header className="navbar">
      <a href="#portal" onClick={() => { onTabChange('portal'); setMenuOpen(false); }}>
        <div className="logo">
          <div className="logo-icon-wrap">
            <i className="fa-solid fa-laptop-code logo-icon"></i>
          </div>
          <span className="logo-text">Cyber<span className="highlight">Cafe</span></span>
        </div>
      </a>

      <div className="header-actions">
        <label className="theme-switcher">
          <i className="fa-solid fa-palette"></i>
          <select
            className="theme-select"
            value={theme}
            onChange={e => applyTheme(e.target.value)}
            aria-label="Theme preference"
          >
            <option value="system">System</option>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </label>
        <button
          className={`menu-toggle ${menuOpen ? 'active' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      <nav className={`nav-links ${menuOpen ? 'open' : ''}`}>
        {navItems.map(item => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={e => { e.preventDefault(); onTabChange(item.id); setMenuOpen(false); }}
          >
            <i className={item.icon}></i> {item.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
