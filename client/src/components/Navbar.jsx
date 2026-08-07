import { useState } from 'react';

export default function Navbar({ activeTab, onTabChange, onOpenCertificate, shopSettings }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { id: 'portal', label: 'Customer Portal', icon: 'fa-solid fa-earth-americas' },
    { id: 'certificate', label: 'CSC Certificate', icon: 'fa-solid fa-award', isModalTrigger: true },
    { id: 'admin', label: 'Admin Dashboard', icon: 'fa-solid fa-lock' },
  ];

  const handleNavClick = (e, item) => {
    e.preventDefault();
    setMenuOpen(false);
    if (item.isModalTrigger) {
      if (onOpenCertificate) onOpenCertificate();
    } else {
      onTabChange(item.id);
    }
  };

  return (
    <header className="navbar">
      <a href="#portal" onClick={() => { onTabChange('portal'); setMenuOpen(false); }}>
        <div className="logo">
          <div className="logo-icon-wrap" style={{ background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/logo.jpeg" alt="CSC Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px' }} />
          </div>
          <span className="logo-text">Cyber<span className="highlight">Cafe</span></span>
        </div>
      </a>

      <div className="header-actions">
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
            onClick={e => handleNavClick(e, item)}
          >
            <i className={item.icon}></i> {item.label}
          </a>
        ))}
      </nav>
    </header>
  );
}