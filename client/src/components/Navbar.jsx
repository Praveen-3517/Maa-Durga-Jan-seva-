import { useState, useEffect } from 'react';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';

export default function Navbar({ activeTab, onTabChange, shopSettings }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'system');

  // Theme dropdown menu ke liye anchor element
  const [themeAnchorEl, setThemeAnchorEl] = useState(null);
  const themeMenuOpen = Boolean(themeAnchorEl);

  // "system" select hone par OS ki actual preference track karte hain
  const [systemPrefersLight, setSystemPrefersLight] = useState(
    () => window.matchMedia('(prefers-color-scheme: light)').matches
  );

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => setSystemPrefersLight(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const applyTheme = (t) => {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('theme', t);
    setTheme(t);
    setThemeAnchorEl(null);
  };

  // Button pe dikhne wala icon — "system" ho to actual resolved preference (light/dark) follow karega
  const resolvedIsLight = theme === 'system' ? systemPrefersLight : theme === 'light';
  const CurrentThemeIcon = resolvedIsLight ? LightModeIcon : DarkModeIcon;

  const themeOptions = [
    { value: 'system', label: 'System', icon: SettingsBrightnessIcon },
    { value: 'dark', label: 'Dark', icon: DarkModeIcon },
    { value: 'light', label: 'Light', icon: LightModeIcon },
  ];

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
        <div className="theme-switcher-nav">
          <IconButton
            onClick={(e) => setThemeAnchorEl(e.currentTarget)}
            aria-label="Theme preference"
            aria-controls={themeMenuOpen ? 'theme-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={themeMenuOpen ? 'true' : undefined}
            sx={{
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              width: 38,
              height: 38,
              color: 'var(--primary-color)',
            }}
          >
            <CurrentThemeIcon sx={{ fontSize: 19 }} />
          </IconButton>
          {/* Sirf mobile view mein dikhega (CSS se control hota hai) — kaunsi theme selected hai */}
          <span className="theme-label">
            {themeOptions.find(o => o.value === theme)?.label}
          </span>
        </div>

        <Menu
          id="theme-menu"
          anchorEl={themeAnchorEl}
          open={themeMenuOpen}
          onClose={() => setThemeAnchorEl(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          slotProps={{
            paper: {
              sx: {
                mt: 1,
                minWidth: 150,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
              },
            },
          }}
        >
          {themeOptions.map((opt) => {
            const OptIcon = opt.icon;
            const selected = theme === opt.value;
            return (
              <MenuItem
                key={opt.value}
                selected={selected}
                onClick={() => applyTheme(opt.value)}
                sx={{
                  fontSize: '0.88rem',
                  '&.Mui-selected': {
                    background: 'var(--primary-subtle)',
                    color: 'var(--primary-color)',
                  },
                  '&:hover': { background: 'rgba(255,255,255,0.04)' },
                }}
              >
                <ListItemIcon>
                  <OptIcon sx={{ fontSize: 18, color: selected ? 'var(--primary-color)' : 'var(--text-secondary)' }} />
                </ListItemIcon>
                <ListItemText>{opt.label}</ListItemText>
              </MenuItem>
            );
          })}
        </Menu>

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