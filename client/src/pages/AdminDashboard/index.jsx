import { useState, useEffect, useRef, useCallback } from 'react';

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatAppId(id) {
  if (!id) return 'MD-00000000';
  const str = String(id).trim();
  if (/^MD(-[A-Z0-9]+)+$/i.test(str)) return str.toUpperCase();
  const hex = str.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return `MD-${hex.slice(0, 8)}`;
}

function LoginCard({ onLogin }) {
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  // FUTURE-PROOF: isLoading prevents double-submit on slow connections
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return; // double-click guard
    setError('');
    setIsLoading(true);
    try {
      await onLogin(password);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-login-card">
      <div className="login-header">
        <div className="login-icon-wrap">
          <i className="fa-solid fa-shield-halved login-icon"></i>
        </div>
        <h2>Admin Login</h2>
        <p>Enter the administrator password to view and manage uploaded client documents.</p>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="admin-password">Password</label>
          <div className="password-input-wrapper">
            <input
              id="admin-password"
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              autoComplete="current-password"
              disabled={isLoading}
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPass(!showPass)}
              title={showPass ? 'Hide password' : 'Show password'}
              aria-label={showPass ? 'Hide password' : 'Show password'}
            >
              <i className={`fa-solid ${showPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
          </div>
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={isLoading}>
          {isLoading
            ? <><span className="spinner"></span> Verifying...</>
            : <><i className="fa-solid fa-right-to-bracket"></i> Access Dashboard</>}
        </button>
        {error && <div className="login-error">{error}</div>}
      </form>
    </div>
  );
}

function StatsRow({ submissions }) {
  const total = submissions.length;
  const normalizeStatus = s => (s?.status || 'pending').toString().toLowerCase().replace(/_/g, '-');
  const pending = submissions.filter(s => normalizeStatus(s) === 'pending').length;
  const processing = submissions.filter(s => ['in-progress', 'processing'].includes(normalizeStatus(s))).length;
  const completed = submissions.filter(s => normalizeStatus(s) === 'completed').length;
  // FUTURE-PROOF: Added rejected count — was missing, admin couldn't see how many were rejected
  const rejected = submissions.filter(s => normalizeStatus(s) === 'rejected').length;
  return (
    <div className="stats-row">
      <div className="stat-card">
        <div className="stat-icon pending"><i className="fa-solid fa-clock"></i></div>
        <div className="stat-details"><span className="stat-value">{pending}</span><span className="stat-label">Pending Reviews</span></div>
      </div>
      <div className="stat-card">
        <div className="stat-icon processing"><i className="fa-solid fa-spinner"></i></div>
        <div className="stat-details"><span className="stat-value">{processing}</span><span className="stat-label">In Progress</span></div>
      </div>
      <div className="stat-card">
        <div className="stat-icon completed"><i className="fa-solid fa-circle-check"></i></div>
        <div className="stat-details"><span className="stat-value">{completed}</span><span className="stat-label">Completed</span></div>
      </div>
      {rejected > 0 && (
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}><i className="fa-solid fa-circle-xmark"></i></div>
          <div className="stat-details"><span className="stat-value">{rejected}</span><span className="stat-label">Rejected</span></div>
        </div>
      )}
      <div className="stat-card">
        <div className="stat-icon total"><i className="fa-solid fa-folder-open"></i></div>
        <div className="stat-details"><span className="stat-value">{total}</span><span className="stat-label">Total Submissions</span></div>
      </div>
    </div>
  );
}

function SubmissionsTable({ submissions, onUpdate, adminToken, showToast }) {
  const [rows, setRows] = useState({});
  // FUTURE-PROOF: Track in-flight save/delete per row to prevent double-click
  const [saving, setSaving] = useState({});
  const [deleting, setDeleting] = useState({});

  useEffect(() => {
    const init = {};
    submissions.forEach(s => { init[s.id] = { status: s.status, remarks: s.remarks || '' }; });
    setRows(init);
  }, [submissions]);

  const saveRow = async (id) => {
    const { status, remarks } = rows[id] || {};
    // FUTURE-PROOF: Prevent double-click saving — track which rows are in-flight
    if (saving[id]) return;
    setSaving(s => ({ ...s, [id]: true }));

    try {
      const res = await fetch(`/api/submissions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // BUG-003 FIX: Removed hardcoded 'Pratap@321' password — JWT token is sufficient
          'Authorization': 'Bearer ' + (adminToken || ''),
        },
        body: JSON.stringify({ status, remarks }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to save');
      showToast('Changes saved successfully!');
      onUpdate();
    } catch (err) { showToast('Failed to save changes: ' + err.message, 'error'); }
    finally { setSaving(s => ({ ...s, [id]: false })); }
  };

  const deleteRow = async (id) => {
    if (!window.confirm('Are you sure you want to delete this submission? All uploaded files will be permanently deleted.')) return;
    // FUTURE-PROOF: Prevent double-click deletion
    if (deleting[id]) return;
    setDeleting(d => ({ ...d, [id]: true }));
    try {
      const res = await fetch(`/api/submissions/${id}`, {
        method: 'DELETE',
        headers: {
          // BUG-003 FIX: Removed hardcoded 'Pratap@321' password
          'Authorization': 'Bearer ' + (adminToken || ''),
        }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to delete');
      showToast('Submission deleted successfully!');
      onUpdate();
    } catch (err) { showToast('Deletion failed: ' + err.message, 'error'); }
    finally { setDeleting(d => ({ ...d, [id]: false })); }
  };

  if (submissions.length === 0) {
    return <tr><td colSpan="7" className="loading-cell">No submissions found.</td></tr>;
  }

  return submissions.map(sub => {
    const dateStr = new Date(sub.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    return (
      <tr key={sub.id} data-status={rows[sub.id]?.status || sub.status}>
        <td>
          <div style={{ fontWeight: 600 }}>{dateStr}</div>
          <div style={{
            fontSize: '0.74rem',
            color: 'var(--primary-color)',
            fontFamily: 'monospace',
            fontWeight: 700,
            marginTop: '3px',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            padding: '1px 6px',
            borderRadius: '4px',
            display: 'inline-block'
          }}>
            {formatAppId(sub.id)}
          </div>
        </td>
        <td>
          <div className="cust-name">{sub.clientName}</div>
          <div className="cust-phone"><i className="fa-brands fa-whatsapp"></i> <a href={`https://wa.me/${sub.clientPhone}`} target="_blank" rel="noreferrer">{sub.clientPhone}</a></div>
          {(sub.email || sub.clientEmail) && (
            <div className="cust-email" style={{ fontSize: '0.78rem', color: 'var(--primary-color)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <i className="fa-solid fa-envelope"></i>
              <a href={`mailto:${sub.email || sub.clientEmail}`} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{sub.email || sub.clientEmail}</a>
            </div>
          )}
        </td>
        <td><span className="service-type-badge">{sub.serviceName}</span></td>
        <td>
          <div className="file-links-container">
            {(sub.files || []).length > 0 ? sub.files.map((f, i) => (
              <a key={i} href={f.url} target="_blank" rel="noreferrer" className="admin-file-link" title={f.originalname}>
                <i className="fa-solid fa-paperclip"></i> {f.originalname}
              </a>
            )) : <span style={{ color: 'var(--text-muted)' }}>No files</span>}
          </div>
        </td>
        <td>
          <select
            className="status-select-inline"
            value={rows[sub.id]?.status || sub.status}
            onChange={e => setRows(r => ({ ...r, [sub.id]: { ...r[sub.id], status: e.target.value } }))}
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', padding: '0.3rem', fontSize: '0.82rem' }}
          >
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
        </td>
        <td>
          <textarea
            className="admin-remarks-area"
            value={rows[sub.id]?.remarks || ''}
            onChange={e => setRows(r => ({ ...r, [sub.id]: { ...r[sub.id], remarks: e.target.value } }))}
            placeholder="Add remarks..."
          />
        </td>
        <td>
          <div className="action-buttons">
            <button
              className="btn btn-save-row btn-icon"
              title={saving[sub.id] ? 'Saving...' : 'Save'}
              onClick={() => saveRow(sub.id)}
              disabled={saving[sub.id] || deleting[sub.id]}
            >
              {saving[sub.id] ? <span className="spinner" style={{width:12,height:12}}></span> : <i className="fa-solid fa-floppy-disk"></i>}
            </button>
            <a href={`/api/submissions/${encodeURIComponent(sub.id)}/receipt`} target="_blank" rel="noreferrer" className="btn btn-outline btn-icon" title="View Receipt"><i className="fa-solid fa-file-pdf"></i></a>
            <a href={`/api/admin/submissions/${encodeURIComponent(sub.id)}/download`} target="_blank" rel="noreferrer" className="btn btn-outline btn-icon" title="Download ZIP"><i className="fa-solid fa-file-zipper"></i></a>
            <button
              className="btn btn-delete-row btn-icon"
              title={deleting[sub.id] ? 'Deleting...' : 'Delete'}
              onClick={() => deleteRow(sub.id)}
              disabled={saving[sub.id] || deleting[sub.id]}
            >
              {deleting[sub.id] ? <span className="spinner" style={{width:12,height:12}}></span> : <i className="fa-solid fa-trash-can"></i>}
            </button>
          </div>
        </td>
      </tr>
    );
  });
}

function ShopSettingsForm({ adminToken, showToast, onRefreshSettings }) {
  const [form, setForm] = useState({ shopName: '', shopOwner: '', shopPhone: '', shopEmail: '', shopAddress: '', shopTimings: '', adminPassword: '' });

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      setForm(f => ({ ...f, shopName: d.shopName || '', shopOwner: d.shopOwner || '', shopPhone: d.shopPhone || '', shopEmail: d.shopEmail || '', shopAddress: d.shopAddress || '', shopTimings: d.shopTimings || '' }));
    }).catch(() => {});
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    const body = { ...form };
    if (!body.adminPassword) delete body.adminPassword;
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // BUG-003 FIX: Removed hardcoded 'Pratap@321' password
          'Authorization': 'Bearer ' + (adminToken || ''),
        },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.message || data.error || 'Failed to update settings');
      }
      showToast('Shop settings saved successfully!');
      setForm(f => ({ ...f, adminPassword: '' }));
      
      // Dispatch real-time events across all tabs & windows
      window.dispatchEvent(new Event('shop_settings_updated'));
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('shop_settings_channel');
        bc.postMessage('updated');
        bc.close();
      }

      if (onRefreshSettings) onRefreshSettings();
    } catch (err) {
      showToast('Failed to save settings: ' + err.message, 'error');
    }
  };

  const field = (key) => ({ value: form[key] || '', onChange: e => setForm(f => ({ ...f, [key]: e.target.value })) });

  return (
    <form className="settings-form" onSubmit={handleSave}>
      <div className="form-grid">
        <div className="form-group"><label>Shop Name</label><input type="text" required {...field('shopName')} /></div>
        <div className="form-group"><label>Shop Owner Name</label><input type="text" required {...field('shopOwner')} /></div>
        <div className="form-group"><label>Shop WhatsApp Number (Include Country Code)</label><input type="text" required {...field('shopPhone')} /></div>
        <div className="form-group"><label>Email Address</label><input type="email" required {...field('shopEmail')} /></div>
      </div>
      <div className="form-group"><label>Shop Physical Address</label><textarea rows="2" required {...field('shopAddress')} /></div>
      <div className="form-group"><label>Shop Timings Message</label><input type="text" required {...field('shopTimings')} /></div>
      <div className="divider"></div>
      <div className="form-group password-group">
        <label>Change Admin Dashboard Password</label>
        <input type="text" placeholder="Leave empty to keep current password" {...field('adminPassword')} />
        <small className="form-hint">Used for logging into this admin panel.</small>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary"><i className="fa-solid fa-floppy-disk"></i> Save Settings</button>
      </div>
    </form>
  );
}

function WhatsAppLiveBotManager({ adminToken, showToast }) {
  const [status, setStatus] = useState({ connected: false, state: 'connecting', user: null, qrAvailable: false });
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!adminToken) return;
    try {
      const res = await fetch('/api/whatsapp-web/status', {
        headers: { 'Authorization': 'Bearer ' + adminToken }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStatus(data);
          if (data.state === 'qr_ready' || data.qrAvailable) {
            fetchQR();
          } else {
            setQrCode(null);
          }
        }
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  }, [adminToken]);

  const fetchQR = async () => {
    try {
      const res = await fetch('/api/whatsapp-web/qr', {
        headers: { 'Authorization': 'Bearer ' + adminToken }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.qr) {
          setQrCode(data.qr);
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchStatus();
    // Poll every 3 seconds while not connected or if QR is shown
    const interval = setInterval(() => {
      fetchStatus();
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleRestart = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/whatsapp-web/restart', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + adminToken }
      });
      const data = await res.json();
      if (data.success) {
        showToast('WhatsApp engine restarted. Generating QR code...', 'success');
        setQrCode(null);
        setTimeout(fetchStatus, 1500);
      } else {
        showToast(data.message || 'Restart failed', 'error');
      }
    } catch (e) {
      showToast('Action failed: ' + e.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!window.confirm('Are you sure you want to disconnect WhatsApp? You will need to scan QR code again.')) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/whatsapp-web/logout', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + adminToken }
      });
      const data = await res.json();
      if (data.success) {
        showToast('WhatsApp disconnected.', 'info');
        setQrCode(null);
        setTimeout(fetchStatus, 1500);
      } else {
        showToast(data.message || 'Logout failed', 'error');
      }
    } catch (e) {
      showToast('Action failed: ' + e.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendTest = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/whatsapp-web/send-test', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + adminToken, 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        showToast('Test message sent to owner WhatsApp!', 'success');
      } else {
        showToast(data.message || 'Test send failed', 'error');
      }
    } catch (e) {
      showToast('Test send failed: ' + e.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="wa-bot-manager-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
      {/* Status & Connection Card */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <i className="fa-brands fa-whatsapp" style={{ fontSize: '2rem', color: '#25d366' }}></i>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>WhatsApp Live Bot</h3>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Self-hosted 24/7 QR-connected Bot Engine</p>
            </div>
          </div>
          <span style={{
            padding: '0.35rem 0.9rem',
            borderRadius: '30px',
            fontSize: '0.8rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: status.connected ? 'rgba(34, 197, 94, 0.15)' : (status.state === 'qr_ready' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)'),
            color: status.connected ? '#4ade80' : (status.state === 'qr_ready' ? '#fbbf24' : '#f87171'),
            border: `1px solid ${status.connected ? '#22c55e' : (status.state === 'qr_ready' ? '#f59e0b' : '#ef4444')}`
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'currentColor', display: 'inline-block' }}></span>
            {status.connected ? 'CONNECTED (Active)' : (status.state === 'qr_ready' ? 'SCAN QR CODE' : 'DISCONNECTED')}
          </span>
        </div>

        {status.connected ? (
          <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '1.25rem', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(37, 211, 102, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#25d366', fontSize: '1.4rem' }}>
                <i className="fa-solid fa-phone-volume"></i>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{status.user?.name || 'Maa Durga Online Center'}</div>
                <div style={{ fontFamily: 'monospace', color: '#4ade80', fontSize: '0.95rem' }}>+{status.user?.phone || 'Connected'}</div>
              </div>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 1rem', lineHeight: '1.5' }}>
              ✅ <strong>Bot is live and listening.</strong> Customers messaging "Hi", "1", "PAN Card", "Certificates", etc., will automatically receive the digital services menu and secure document upload links.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={handleSendTest} disabled={actionLoading} style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
                <i className="fa-solid fa-paper-plane"></i> Send Test Message
              </button>
              <button className="btn btn-outline" onClick={handleLogout} disabled={actionLoading} style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', color: '#f87171', borderColor: 'rgba(239,68,68,0.4)' }}>
                <i className="fa-solid fa-arrow-right-from-bracket"></i> Disconnect / Switch
              </button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '1.5rem 1rem', background: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
            {qrCode ? (
              <div>
                <div style={{ background: '#ffffff', padding: '12px', borderRadius: '12px', display: 'inline-block', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', marginBottom: '1rem' }}>
                  <img src={qrCode} alt="WhatsApp Web QR Code" style={{ width: '220px', height: '220px', display: 'block' }} />
                </div>
                <h4 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>Scan with WhatsApp to Connect</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>QR code updates automatically. Scan from your phone's WhatsApp.</p>
              </div>
            ) : (
              <div style={{ padding: '2rem 1rem' }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2.5rem', color: 'var(--accent-color)', marginBottom: '1rem' }}></i>
                <h4 style={{ color: 'var(--text-primary)', margin: '0 0 0.5rem' }}>Generating WhatsApp QR Code...</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Initializing WhatsApp Web Engine. Please wait a moment.</p>
              </div>
            )}

            <div style={{ marginTop: '1rem' }}>
              <button className="btn btn-outline" onClick={handleRestart} disabled={actionLoading} style={{ fontSize: '0.82rem', padding: '0.4rem 0.9rem' }}>
                <i className="fa-solid fa-rotate-right"></i> Refresh QR Code
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Instructions Card */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem', color: 'var(--text-primary)' }}>
          <i className="fa-solid fa-qrcode" style={{ color: 'var(--accent-color)' }}></i>
          How to Connect Your Phone (3 Steps)
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--accent-color)', color: '#000', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>1</span>
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>Open WhatsApp on Your Phone</strong>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Open your shop's WhatsApp or WhatsApp Business mobile app.</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--accent-color)', color: '#000', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>2</span>
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>Go to Linked Devices</strong>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Tap the <strong>3 Dots (Menu)</strong> on Android or <strong>Settings</strong> on iPhone ➔ Select <strong>Linked Devices</strong> (लिंक्ड डिवाइसेज़).</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--accent-color)', color: '#000', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>3</span>
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>Scan the QR Code on Screen</strong>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Tap <strong>Link a Device</strong> and point your camera at the QR code on the left. Once scanned, your bot will be 24x7 active!</p>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', padding: '0.85rem', background: 'rgba(34, 197, 94, 0.08)', borderRadius: '10px', border: '1px solid rgba(34, 197, 94, 0.25)', fontSize: '0.82rem', color: '#86efac' }}>
          <i className="fa-solid fa-shield-halved" style={{ marginRight: '0.4rem' }}></i>
          <strong>Zero Token Expiration:</strong> Unlike Meta Cloud API, WhatsApp Web session stays authenticated permanently. No credit card, no Meta billing, and no 24-hour expiration!
        </div>
      </div>
    </div>
  );
}

function N8nSetupGuide({ adminToken }) {
  const [waConfig, setWaConfig] = useState(null);

  useEffect(() => {
    if (!adminToken) return;
    fetch('/api/whatsapp/config-status', { headers: { 'Authorization': 'Bearer ' + adminToken } })
      .then(r => r.json()).then(d => { if (d.success) setWaConfig(d); }).catch(() => {});
  }, [adminToken]);

  return (
    <div className="n8n-setup-box">
      {/* WhatsApp Config Status Card */}
      {waConfig && (
        <div className="download-card" style={{ marginBottom: '1.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <i className="fa-brands fa-whatsapp" style={{ fontSize: '1.5rem', color: '#25d366' }}></i>
            <h4 style={{ margin: 0 }}>WhatsApp Integration Status</h4>
            <span style={{ marginLeft: 'auto', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, background: waConfig.n8n_mode ? '#1e3a5f' : '#1a2f1a', color: waConfig.n8n_mode ? '#60a5fa' : '#4ade80', border: `1px solid ${waConfig.n8n_mode ? '#3b82f6' : '#22c55e'}` }}>
              {waConfig.n8n_mode ? '⚡ n8n Mode' : '🔧 Direct Mode'}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: '0.5rem' }}>
            {Object.entries(waConfig.configured).map(([key, val]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', background: 'var(--bg-tertiary)', borderRadius: '8px', fontSize: '0.8rem' }}>
                <span style={{ fontSize: '1rem' }}>{val ? '✅' : '❌'}</span>
                <span style={{ color: val ? 'var(--text-primary)' : 'var(--text-muted)', fontFamily: 'monospace' }}>{key}</span>
              </div>
            ))}
          </div>
          {!waConfig.configured.WHATSAPP_PHONE_NUMBER_ID && (
            <p style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              <i className="fa-solid fa-circle-info"></i> WhatsApp credentials not set yet. The app works fine — use the Bot Simulator to test. Add credentials to <code>.env</code> when the shop phone is ready.
            </p>
          )}
        </div>
      )}

      <div className="download-card">
        <div className="download-icon"><i className="fa-solid fa-file-arrow-down"></i></div>
        <div className="download-info">
          <h4>Download Pre-configured n8n Workflow</h4>
          <p>This JSON file contains the Webhook, Switch logic, and Meta API Request nodes matching this project's requirements.</p>
        </div>
        <a href="/n8n_whatsapp_workflow.json" download="n8n_whatsapp_workflow.json" className="btn btn-primary" id="btn-download-n8n">
          <i className="fa-solid fa-download"></i> Download JSON
        </a>
      </div>
      <div className="setup-steps-container">
        <h4>Setup Instructions (Hinglish / English)</h4>
        {[
          { num: 1, title: 'Step 1: Meta Developer Account Setup', body: 'Go to Meta for Developers, log in with your client\'s Facebook account, and create a new App. Choose Other → Business app type.', hindi: 'Meta for Developers par client ki Business ID se login karke ek App banayein aur usme WhatsApp Business Platform add karein.' },
          { num: 2, title: 'Step 2: Get WhatsApp Credentials', body: 'In the WhatsApp Setup Panel, configure a phone number. Meta will provide a Temporary Access Token, a Phone Number ID, and a WhatsApp Business Account ID.', hindi: 'WhatsApp settings me phone verify karein. Wahan se Phone Number ID copy karein aur System User me ja kar ek Permanent Access Token generate karein. ⚠️ THIS IS THE STEP REQUIRING THE PHYSICAL SHOP PHONE FOR OTP.' },
          { num: 3, title: 'Step 3: Setup n8n & Import Workflow', body: 'Deploy n8n (e.g. self-host on a VPS). Create a new workflow, and click Import from File. Upload the downloaded n8n_whatsapp_workflow.json.', hindi: 'n8n console open karein, Settings menu se Import from File select karein, aur download kiya hua JSON upload karein.' },
          { num: 4, title: 'Step 4: Update Environment Variables', body: 'Add WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN, and other credentials to your .env file (or Render environment variables). Set PUBLIC_APP_URL to your live site URL.', hindi: '.env file me WhatsApp credentials daalna hoga. Render me Environment tab me bhi same variables add karein.' },
          { num: 5, title: 'Step 5: Setup Webhooks in Meta Developer Dashboard', body: 'In n8n, activate the workflow. Copy the Production Webhook URL from the Webhook node. In your Meta App Dashboard, paste this URL and subscribe to messages. Use verify token: maa_durga_verify_token_2026', hindi: 'n8n Webhook Node ka live URL copy karke Meta Developer Portal ke Webhooks Configuration me paste karein. messages event subscribe kar lein. Chatbot live ho jayega!' },
        ].map(step => (
          <div key={step.num} className="accordion-step">
            <div className="step-num">{step.num}</div>
            <div className="step-content">
              <h5>{step.title}</h5>
              <p>{step.body}</p>
              <p className="hinglish-text"><i className="fa-solid fa-language"></i> <strong>Hinglish:</strong> {step.hindi}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Service Management Sub-tab ────────────────────────────────────────────────
// ─── Service Management Sub-tab ────────────────────────────────────────────────
function ServiceManagement({ adminToken, showToast }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editService, setEditService] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'active' | 'inactive'

  const loadServices = async () => {
    setLoading(true);
    try {
      // Try admin endpoint first to get all services (active + inactive)
      const res = await fetch('/api/admin/services', {
        headers: {
          'Authorization': 'Bearer ' + (adminToken || '')
        }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setServices(data.data || []);
      } else {
        // Fallback to public services endpoint
        const fallbackRes = await fetch('/api/services');
        const fallbackData = await fallbackRes.json().catch(() => ({}));
        if (fallbackData.success) {
          setServices(fallbackData.data || []);
        } else {
          showToast('Could not load services from database.', 'error');
          setServices([]);
        }
      }
    } catch (err) {
      showToast('Could not connect to services API.', 'error');
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadServices(); }, []);

  const notifyServicesChanged = () => {
    window.dispatchEvent(new Event('services_updated'));
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('services_channel');
      bc.postMessage('updated');
      bc.close();
    }
  };

  const handleToggleActive = async (svc) => {
    try {
      const res = await fetch(`/api/admin/services/${svc.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + (adminToken || ''),
        },
        body: JSON.stringify({ is_active: !svc.is_active })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to update service');
      showToast(`Service "${svc.name}" ${!svc.is_active ? 'activated' : 'deactivated'} successfully!`);
      loadServices();
      notifyServicesChanged();
    } catch (err) { showToast('Failed to update service: ' + err.message, 'error'); }
  };

  const handleDelete = async (svc) => {
    if (!window.confirm(`Delete service "${svc.name}"?\n\nThis will remove it from the Customer Portal & WhatsApp bot menu.`)) return;
    try {
      const res = await fetch(`/api/admin/services/${svc.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer ' + (adminToken || ''),
        }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to delete service');
      showToast(`Service "${svc.name}" deleted successfully.`);
      loadServices();
      notifyServicesChanged();
    } catch (err) { showToast('Failed to delete service: ' + err.message, 'error'); }
  };

  const openAdd = () => {
    setEditService(null);
    setShowModal(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const openEdit = (svc) => {
    setEditService(svc);
    setShowModal(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const closeModal = () => { setShowModal(false); setEditService(null); };

  // Filter services by search & active state
  const filteredServices = services.filter(svc => {
    const matchesFilter =
      filterTab === 'all' ? true :
      filterTab === 'active' ? svc.is_active !== false :
      svc.is_active === false;

    if (!matchesFilter) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = (svc.name || '').toLowerCase().includes(q);
    const hindiMatch = (svc.hindi_title || '').toLowerCase().includes(q);
    const descMatch = (svc.description || '').toLowerCase().includes(q);
    const docMatch = (svc.documents || []).some(d => (d.document_name || '').toLowerCase().includes(q));

    return nameMatch || hindiMatch || descMatch || docMatch;
  });

  const activeCount = services.filter(s => s.is_active !== false).length;
  const inactiveCount = services.filter(s => s.is_active === false).length;

  return (
    <div>
      {/* Top Header & Actions Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="fa-solid fa-list-check" style={{ color: 'var(--primary-color)' }}></i>
            Service &amp; Documents Management
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>
            Manage all services, customize required/optional documents, titles, icons, and order in real-time.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAdd} id="btn-add-service">
          <i className="fa-solid fa-plus"></i> Add New Service
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.25rem', background: 'var(--bg-secondary)', padding: '0.8rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
        <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.88rem' }}></i>
          <input
            type="text"
            placeholder="Search services or documents (e.g. PAN, Aadhar, Photo)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', paddingLeft: '2.3rem', fontSize: '0.88rem' }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              &times;
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setFilterTab('all')}
            style={{
              fontSize: '0.82rem',
              padding: '0.4rem 0.8rem',
              background: filterTab === 'all' ? 'var(--primary-color)' : 'transparent',
              color: filterTab === 'all' ? '#000' : 'var(--text-color)',
              borderColor: filterTab === 'all' ? 'var(--primary-color)' : 'var(--border-color)',
              fontWeight: 600
            }}
          >
            All ({services.length})
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setFilterTab('active')}
            style={{
              fontSize: '0.82rem',
              padding: '0.4rem 0.8rem',
              background: filterTab === 'active' ? 'rgba(34,197,94,0.2)' : 'transparent',
              color: filterTab === 'active' ? '#4ade80' : 'var(--text-muted)',
              borderColor: filterTab === 'active' ? '#22c55e' : 'var(--border-color)',
              fontWeight: 600
            }}
          >
            Active ({activeCount})
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setFilterTab('inactive')}
            style={{
              fontSize: '0.82rem',
              padding: '0.4rem 0.8rem',
              background: filterTab === 'inactive' ? 'rgba(239,68,68,0.2)' : 'transparent',
              color: filterTab === 'inactive' ? '#f87171' : 'var(--text-muted)',
              borderColor: filterTab === 'inactive' ? '#ef4444' : 'var(--border-color)',
              fontWeight: 600
            }}
          >
            Inactive ({inactiveCount})
          </button>
        </div>
      </div>

      {/* Services Table */}
      {loading ? (
        <div className="loading-cell" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}></i>
          <div>Loading services &amp; documents...</div>
        </div>
      ) : filteredServices.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
          <i className="fa-solid fa-folder-open" style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.4 }}></i>
          <p style={{ marginBottom: '0.5rem', fontWeight: 600 }}>
            {searchQuery ? 'No matching services found.' : 'No services found.'}
          </p>
          <p style={{ fontSize: '0.85rem' }}>
            {searchQuery ? 'Try clearing your search query.' : 'Click "+ Add New Service" above to create your first service.'}
          </p>
          {searchQuery && (
            <button className="btn btn-outline" onClick={() => setSearchQuery('')} style={{ marginTop: '0.5rem' }}>
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '60px', textAlign: 'center' }}>Order</th>
                <th>Service Details</th>
                <th>Hindi Title</th>
                <th>Documents Required / Optional</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Status</th>
                <th style={{ width: '130px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.map(svc => {
                const reqDocs = (svc.documents || []).filter(d => d.is_required !== false);
                const optDocs = (svc.documents || []).filter(d => d.is_required === false);

                return (
                  <tr key={svc.id} data-status={svc.is_active !== false ? 'completed' : 'rejected'}>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--primary-color)' }}>
                      #{svc.display_order ?? 0}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '8px', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                          <i className={svc.icon || 'fa-solid fa-file'} style={{ color: 'var(--primary-color)', fontSize: '1rem' }}></i>
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{svc.name}</div>
                          {svc.description && (
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.3 }}>
                              {svc.description.length > 75 ? svc.description.substring(0, 75) + '...' : svc.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--primary-color)' }}>
                      {svc.hindi_title ? (
                        <span><i className="fa-solid fa-language" style={{ marginRight: 4, opacity: 0.7 }}></i> {svc.hindi_title}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--primary-color)', border: '1px solid rgba(245,158,11,0.3)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                            {reqDocs.length} Mandatory
                          </span>
                          {optDocs.length > 0 && (
                            <span style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                              {optDocs.length} Optional
                            </span>
                          )}
                          {svc.email_requirement === 'required' && (
                            <span style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                              <i className="fa-solid fa-envelope" style={{ marginRight: 3 }}></i> Email Required
                            </span>
                          )}
                          {svc.email_requirement === 'none' && (
                            <span style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>
                              No Email
                            </span>
                          )}
                        </div>
                        {/* Preview first 3 docs */}
                        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: 2 }}>
                          {(svc.documents || []).slice(0, 3).map((d, i) => (
                            <span key={i} style={{ fontSize: '0.72rem', background: 'var(--bg-tertiary)', borderRadius: '4px', padding: '1px 6px', color: d.is_required !== false ? 'var(--text-primary)' : 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
                              {d.document_name}
                            </span>
                          ))}
                          {(svc.documents || []).length > 3 && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--primary-color)', fontWeight: 600 }}>
                              +{(svc.documents || []).length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700,
                        background: svc.is_active !== false ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                        color: svc.is_active !== false ? '#4ade80' : '#f87171',
                        border: `1px solid ${svc.is_active !== false ? '#22c55e40' : '#ef444440'}`,
                        display: 'inline-block'
                      }}>
                        {svc.is_active !== false ? '● Active' : '○ Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons" style={{ justifyContent: 'center' }}>
                        <button className="btn btn-outline btn-icon" title="Edit Service & Documents" onClick={() => openEdit(svc)}>
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button
                          className={`btn btn-icon ${svc.is_active !== false ? 'btn-delete-row' : 'btn-save-row'}`}
                          title={svc.is_active !== false ? 'Deactivate Service' : 'Activate Service'}
                          onClick={() => handleToggleActive(svc)}
                        >
                          <i className={`fa-solid ${svc.is_active !== false ? 'fa-toggle-on' : 'fa-toggle-off'}`}></i>
                        </button>
                        <button className="btn btn-delete-row btn-icon" title="Delete Service" onClick={() => handleDelete(svc)}>
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <ServiceModal
          editService={editService}
          adminToken={adminToken}
          showToast={showToast}
          onClose={closeModal}
          onSaved={() => { closeModal(); loadServices(); }}
        />
      )}
    </div>
  );
}

// ─── Service Modal (Full Service & Document Editor) ────────────────────────────
function ServiceModal({ editService, adminToken, showToast, onClose, onSaved }) {
  const isEdit = !!editService;
  const modalContentRef = useRef(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (modalContentRef.current) {
      modalContentRef.current.scrollTop = 0;
    }
  }, [editService]);

  const [form, setForm] = useState({
    name: editService?.name || '',
    hindi_title: editService?.hindi_title || '',
    description: editService?.description || '',
    icon: editService?.icon || 'fa-solid fa-file-shield',
    display_order: editService?.display_order ?? 0,
    is_active: editService?.is_active !== false,
    email_requirement: editService?.email_requirement || 'optional',
  });
  const [documents, setDocuments] = useState(() => (editService?.documents || []).map((d, i) => ({ ...d, display_order: d.display_order ?? i })));
  const [newDoc, setNewDoc] = useState('');
  const [newDocRequired, setNewDocRequired] = useState(true);
  const [saving, setSaving] = useState(false);

  // Common quick icon presets for Cyber Cafe / CSC services
  const ICON_PRESETS = [
    { icon: 'fa-solid fa-building-shield', label: '👮 Police / Verification' },
    { icon: 'fa-solid fa-address-card', label: '🪪 ID / PAN' },
    { icon: 'fa-solid fa-file-shield', label: '📄 Certificate' },
    { icon: 'fa-solid fa-wheat-awn', label: '🌾 Ration' },
    { icon: 'fa-solid fa-id-badge', label: '🚗 License' },
    { icon: 'fa-solid fa-id-card-clip', label: '🗳️ Voter ID' },
    { icon: 'fa-solid fa-hospital', label: '🏥 Ayushman' },
    { icon: 'fa-solid fa-passport', label: '✈️ Passport' },
    { icon: 'fa-solid fa-graduation-cap', label: '🎓 Student' },
    { icon: 'fa-solid fa-building-columns', label: '🏦 Banking' },
    { icon: 'fa-solid fa-bolt', label: '⚡ Utility' },
    { icon: 'fa-solid fa-file-lines', label: '📑 Form' },
    { icon: 'fa-solid fa-mobile-screen', label: '📱 Mobile' },
  ];

  const addDoc = () => {
    const trimmed = newDoc.trim();
    if (!trimmed) return;
    setDocuments(prev => [...prev, { document_name: trimmed, is_required: newDocRequired, display_order: prev.length, _new: true }]);
    setNewDoc('');
    setNewDocRequired(true);
  };

  const updateDocName = (idx, newName) => {
    setDocuments(prev => prev.map((d, i) => i === idx ? { ...d, document_name: newName } : d));
  };

  const toggleDocRequired = (idx) => {
    setDocuments(prev => prev.map((d, i) => i === idx ? { ...d, is_required: !d.is_required } : d));
  };

  const moveDoc = (idx, direction) => {
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= documents.length) return;
    setDocuments(prev => {
      const arr = [...prev];
      const temp = arr[idx];
      arr[idx] = arr[newIdx];
      arr[newIdx] = temp;
      return arr.map((d, i) => ({ ...d, display_order: i }));
    });
  };

  const removeDoc = (idx) => {
    setDocuments(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('Service Name is required', 'error');
      return;
    }
    setSaving(true);
    try {
      const url = isEdit ? `/api/admin/services/${editService.id || editService.slug}` : '/api/admin/services';
      const method = isEdit ? 'PUT' : 'POST';

      const payload = {
        ...form,
        slug: isEdit ? (editService.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')) : (form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now()),
        display_order: Number(form.display_order) || 0,
        documents: documents.map((d, idx) => ({
          id: d.id,
          document_name: d.document_name,
          is_required: d.is_required !== false,
          display_order: idx
        }))
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + adminToken
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to save service');

      showToast(`Service "${form.name}" ${isEdit ? 'updated' : 'created'} successfully.`);
      if (typeof window !== 'undefined' && window.BroadcastChannel) {
        const bc = new BroadcastChannel('services_channel');
        bc.postMessage('updated');
        bc.close();
      }
      onSaved();
    } catch (err) {
      showToast('Failed to save service: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const field = (key) => ({ value: form[key] || '', onChange: e => setForm(f => ({ ...f, [key]: e.target.value })) });

  return (
    <div className="modal open" onClick={e => e.target === e.currentTarget && onClose()} style={{ padding: '1rem' }}>
      <div className="modal-content" ref={modalContentRef} style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className={form.icon || 'fa-solid fa-file-shield'} style={{ color: 'var(--primary-color)', fontSize: '1rem' }}></i>
            </div>
            {isEdit ? `Edit Service: ${editService.name}` : 'Add New Service'}
          </h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body" style={{ padding: '1.25rem' }}>
          <form onSubmit={handleSave} id="service-form">
            {/* Basic Info */}
            <div className="form-grid-2">
              <div className="form-group">
                <label>Service Name (English) <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="text" placeholder="e.g. PAN Card Apply" required {...field('name')} />
              </div>
              <div className="form-group">
                <label>Hindi Title (हिंदी शीर्षक)</label>
                <input type="text" placeholder="उदा. पैन कार्ड (नया एवं संशोधन)" {...field('hindi_title')} />
              </div>
            </div>

            <div className="form-group">
              <label>Description (सेवा विवरण)</label>
              <textarea
                rows="2"
                placeholder="उदा. नए पैन कार्ड के लिए आवेदन करें अथवा पुराने पैन कार्ड में नाम, जन्मतिथि आदि संशोधन करवाएं।"
                {...field('description')}
              />
            </div>

            {/* Icon Picker & Display Order */}
            <div className="form-grid-2">
              <div className="form-group">
                <label>FontAwesome Icon Class</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <div style={{ width: 38, height: 38, borderRadius: '6px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className={form.icon || 'fa-solid fa-file'} style={{ color: 'var(--primary-color)' }}></i>
                  </div>
                  <input type="text" placeholder="fa-solid fa-address-card" {...field('icon')} style={{ flex: 1 }} />
                </div>
              </div>
              <div className="form-group">
                <label>Display Order (प्रदर्शन क्रम)</label>
                <input
                  type="number"
                  min="0"
                  value={form.display_order}
                  onChange={e => setForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>

            {/* Quick Icon Chips */}
            <div className="form-group" style={{ marginTop: '-0.25rem' }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                Quick Icon Suggestions (क्लिक करके चुनें):
              </label>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {ICON_PRESETS.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, icon: p.icon }))}
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '6px',
                      background: form.icon === p.icon ? 'rgba(245,158,11,0.2)' : 'var(--bg-tertiary)',
                      color: form.icon === p.icon ? 'var(--primary-color)' : 'var(--text-color)',
                      border: `1px solid ${form.icon === p.icon ? 'var(--primary-color)' : 'var(--border-color)'}`,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <i className={p.icon}></i> {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Service Status and Email ID Requirement in 2 columns */}
            <div className="form-grid-2">
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-secondary)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <input
                  type="checkbox"
                  id="service-active-toggle"
                  checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  style={{ width: 'auto', accentColor: 'var(--primary-color)', transform: 'scale(1.3)', cursor: 'pointer' }}
                />
                <label htmlFor="service-active-toggle" style={{ margin: 0, cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' }}>
                  Active Service (पोर्टल एवं बॉट में दिखाएं)
                </label>
              </div>

              <div className="form-group" style={{ background: 'var(--bg-secondary)', padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', margin: 0 }}>
                <label style={{ margin: '0 0 4px 0', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <i className="fa-solid fa-envelope" style={{ color: 'var(--primary-color)' }}></i>
                  Customer Email ID Requirement:
                </label>
                <select
                  value={form.email_requirement || 'optional'}
                  onChange={e => setForm(f => ({ ...f, email_requirement: e.target.value }))}
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', padding: '0.35rem 0.5rem', width: '100%', fontSize: '0.82rem', fontWeight: 600 }}
                >
                  <option value="optional">○ Optional Email (वैकल्पिक)</option>
                  <option value="required">★ Mandatory Email (अनिवार्य)</option>
                  <option value="none">❌ Don't Ask Email (न मांगें)</option>
                </select>
              </div>
            </div>

            <div className="divider" style={{ margin: '1.25rem 0' }}></div>

            {/* ─── Documents Management Section ─── */}
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                <label style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="fa-solid fa-file-lines" style={{ color: 'var(--primary-color)' }}></i>
                  आवश्यक दस्तावेज़ / Required &amp; Optional Documents
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Total: {documents.length} Docs
                </span>
              </div>

              {/* Documents List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.85rem' }}>
                {documents.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.2rem', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px dashed var(--border-color)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No documents configured yet. Add documents using the box below.
                  </div>
                ) : (
                  documents.map((doc, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 0.75rem',
                        background: 'var(--bg-tertiary)',
                        borderRadius: '8px',
                        border: `1px solid ${doc.is_required !== false ? 'rgba(245,158,11,0.3)' : 'var(--border-color)'}`,
                        flexWrap: 'wrap'
                      }}
                    >
                      {/* Reorder Arrows */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveDoc(idx, -1)}
                          style={{ background: 'none', border: 'none', color: idx === 0 ? 'var(--text-muted)' : 'var(--text-color)', cursor: idx === 0 ? 'not-allowed' : 'pointer', fontSize: '0.7rem', padding: 0, opacity: idx === 0 ? 0.3 : 0.8 }}
                          title="Move Up"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          disabled={idx === documents.length - 1}
                          onClick={() => moveDoc(idx, 1)}
                          style={{ background: 'none', border: 'none', color: idx === documents.length - 1 ? 'var(--text-muted)' : 'var(--text-color)', cursor: idx === documents.length - 1 ? 'not-allowed' : 'pointer', fontSize: '0.7rem', padding: 0, opacity: idx === documents.length - 1 ? 0.3 : 0.8 }}
                          title="Move Down"
                        >
                          ▼
                        </button>
                      </div>

                      {/* Document Name Inline Input */}
                      <input
                        type="text"
                        value={doc.document_name || ''}
                        onChange={e => updateDocName(idx, e.target.value)}
                        placeholder="Document Name (e.g. Aadhar Card)"
                        style={{
                          flex: 1,
                          minWidth: '160px',
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          padding: '0.4rem 0.6rem',
                          fontSize: '0.85rem'
                        }}
                      />

                      {/* Required / Optional Toggle Badge Button */}
                      <button
                        type="button"
                        onClick={() => toggleDocRequired(idx)}
                        style={{
                          background: doc.is_required !== false ? 'rgba(245,158,11,0.2)' : 'rgba(148,163,184,0.15)',
                          color: doc.is_required !== false ? 'var(--primary-color)' : 'var(--text-muted)',
                          border: `1px solid ${doc.is_required !== false ? 'var(--primary-color)' : 'var(--border-color)'}`,
                          padding: '0.35rem 0.65rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                        title="Click to toggle Required / Optional"
                      >
                        <i className={`fa-solid fa-${doc.is_required !== false ? 'star' : 'circle-notch'}`}></i>
                        {doc.is_required !== false ? '★ Mandatory' : '○ Optional'}
                      </button>

                      {/* Delete Document Button */}
                      <button
                        type="button"
                        onClick={() => removeDoc(idx)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.3rem', fontSize: '1rem', display: 'flex', alignItems: 'center' }}
                        title="Remove Document"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add New Document Input Bar */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '8px', border: '1px dashed var(--primary-color)' }}>
                <input
                  type="text"
                  placeholder="Type document or text field name (उदा. Email ID / 10th Result / Bank Passbook)..."
                  value={newDoc}
                  onChange={e => setNewDoc(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addDoc())}
                  style={{ flex: 1, minWidth: '180px', fontSize: '0.85rem' }}
                />
                <select
                  value={newDocRequired ? 'required' : 'optional'}
                  onChange={e => setNewDocRequired(e.target.value === 'required')}
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', padding: '0.5rem', fontSize: '0.82rem', fontWeight: 600 }}
                >
                  <option value="required">★ Mandatory (अनिवार्य)</option>
                  <option value="optional">○ Optional (वैकल्पिक)</option>
                </select>
                <button type="button" className="btn btn-primary" onClick={addDoc} style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem' }}>
                  <i className="fa-solid fa-plus"></i> Add
                </button>
              </div>

              {/* Quick Preset Suggestion Chips */}
              <div style={{ marginTop: '0.6rem' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  💡 Quick Suggestions (क्लिक करके सीधे जोड़ें):
                </div>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {[
                    { name: 'Email ID (ईमेल आईडी)', isField: true, icon: '✉️' },
                    { name: 'आधार कार्ड (Front + Back)', icon: '🪪' },
                    { name: 'पासपोर्ट साइज फोटो', icon: '🖼️' },
                    { name: '10th Result / Marksheet', icon: '🎓' },
                    { name: 'बैंक पासबुक (Bank Passbook)', icon: '🏦' },
                    { name: 'Old Passport Number', isField: true, icon: '✈️' },
                    { name: 'Old PAN Card Number', isField: true, icon: '🔢' },
                    { name: 'राशन कार्ड (Ration Card)', icon: '🌾' },
                    { name: 'बिजली बिल / Gas Bill', icon: '⚡' },
                    { name: 'पिता / पति का नाम', isField: true, icon: '👨' },
                  ].map((preset, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => {
                        setDocuments(prev => [...prev, { document_name: preset.name, is_required: true, display_order: prev.length, _new: true }]);
                        if (preset.name.toLowerCase().includes('email')) {
                          setForm(f => ({ ...f, email_requirement: 'required' }));
                        }
                      }}
                      style={{
                        fontSize: '0.72rem',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '4px',
                        background: preset.isField ? 'rgba(59,130,246,0.12)' : 'var(--bg-tertiary)',
                        color: preset.isField ? '#60a5fa' : 'var(--text-primary)',
                        border: `1px solid ${preset.isField ? 'rgba(59,130,246,0.3)' : 'var(--border-color)'}`,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <span>{preset.icon}</span> {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="modal-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', padding: '1rem 1.25rem' }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="service-form" className="btn btn-primary" disabled={saving} style={{ minWidth: '150px' }}>
            {saving ? (
              <><span className="spinner"></span> Saving...</>
            ) : (
              <><i className="fa-solid fa-floppy-disk"></i> {isEdit ? 'Save Changes' : 'Create Service'}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard({ adminToken, login, logout, showToast, isLoggedIn, onRefreshSettings }) {
  const [activeSubTab, setActiveSubTab] = useState('submissions-list');
  const [submissions, setSubmissions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadData = async () => {
    if (!adminToken) return;
    try {
      const res = await fetch('/api/submissions', { headers: { 'Authorization': 'Bearer ' + adminToken } });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          // Only logout if the server explicitly says the token is expired/invalid
          // Do NOT logout on transient network errors or server hiccups
          const errData = await res.json().catch(() => ({}));
          if (errData?.tokenExpired === true || res.status === 403) {
            logout();
            showToast('Session expired. Please log in again.', 'error');
            return;
          }
          // Token invalid but not expired — also logout
          if (errData?.tokenExpired === false) {
            logout();
            showToast('Authentication failed. Please log in again.', 'error');
            return;
          }
        }
        // For other errors (500, network issues) — don't logout, just show warning
        console.warn('[Dashboard] Data load failed, keeping session alive:', res.status);
        return;
      }
      const data = await res.json();
      setSubmissions(data || []);
    } catch (err) {
      // Network error (no internet, server down) — DON'T logout, just silently fail
      console.warn('[Dashboard] Network error during data sync, session preserved:', err.message);
    }
  };


  useEffect(() => {
    if (isLoggedIn) loadData();
  }, [isLoggedIn]);

  // FUTURE-PROOF: Auto-refresh every 60s — admin sees new submissions without manual reload
  useEffect(() => {
    if (!isLoggedIn) return;
    const interval = setInterval(() => {
      loadData();
    }, 60000);
    return () => clearInterval(interval);
  }, [isLoggedIn, adminToken]);

  const filtered = submissions.filter(s => {
    const q = searchQuery.toLowerCase();
    const matchQ = !q || s.clientName?.toLowerCase().includes(q) || s.clientPhone?.toLowerCase().includes(q) || s.serviceName?.toLowerCase().includes(q);
    const sStatus = (s.status || 'pending').toString().toLowerCase().replace(/_/g, '-');
    const fStatus = (statusFilter || 'all').toString().toLowerCase().replace(/_/g, '-');
    const matchS = fStatus === 'all' || sStatus === fStatus;
    return matchQ && matchS;
  });

  if (!isLoggedIn) {
    return <section className="tab-content active"><LoginCard onLogin={login} /></section>;
  }

  const tabs = [
    ['submissions-list', 'fa-solid fa-list-check', 'Submissions'],
    ['whatsapp-bot', 'fa-brands fa-whatsapp', 'WhatsApp Live Bot'],
    ['service-management', 'fa-solid fa-briefcase', 'Service Management'],
    ['shop-settings', 'fa-solid fa-gears', 'Shop Settings'],
    ['n8n-setup', 'fa-solid fa-network-wired', 'n8n & Meta Guide'],
  ];

  return (
    <section className="tab-content active">
      <div className="admin-panel">
        <div className="admin-header-bar">
          <div>
            <h2><i className="fa-solid fa-gauge-high"></i> Cafe Admin Dashboard</h2>
            <p>Manage customer document uploads, applications, services, and shop settings.</p>
          </div>
          <div className="admin-actions">
            <button className="btn btn-outline" onClick={logout}><i className="fa-solid fa-right-from-bracket"></i> Logout</button>
          </div>
        </div>
        <StatsRow submissions={submissions} />
        <div className="admin-tab-nav">
          {tabs.map(([id, icon, label]) => (
            <button key={id} className={`admin-tab-btn ${activeSubTab === id ? 'active' : ''}`} onClick={() => setActiveSubTab(id)}>
              <i className={icon}></i> {label}
            </button>
          ))}
        </div>

        {/* Submissions List */}
        <div className={`admin-subcontent ${activeSubTab === 'submissions-list' ? 'active' : ''}`}>
          <div className="subcontent-header">
            <h3>Customer Submissions</h3>
            <div className="filter-controls">
              <input type="text" className="search-input" placeholder="Filter by name, phone, or service..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              <select className="status-select-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                {/* BUG-011 FIX: Added missing Rejected option */}
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
          <div className="table-responsive">
            <table className="admin-table">
              <thead><tr><th>Date &amp; Time</th><th>Customer Info</th><th>Service Applied</th><th>Uploaded Files</th><th>Status</th><th>Admin Remarks</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.length === 0
                  ? <tr><td colSpan="7" className="loading-cell">No submissions found.</td></tr>
                  : <SubmissionsTable submissions={filtered} onUpdate={loadData} adminToken={adminToken} showToast={showToast} />
                }
              </tbody>
            </table>
          </div>
        </div>

        {/* WhatsApp Live Bot */}
        <div className={`admin-subcontent ${activeSubTab === 'whatsapp-bot' ? 'active' : ''}`}>
          <div className="subcontent-header">
            <h3>WhatsApp Live Bot &amp; QR Scanner</h3>
            <p>Connect your WhatsApp number directly to enable 24x7 automated customer replies, services menu, and instant document uploads.</p>
          </div>
          <WhatsAppLiveBotManager adminToken={adminToken} showToast={showToast} />
        </div>

        {/* Service Management */}
        <div className={`admin-subcontent ${activeSubTab === 'service-management' ? 'active' : ''}`}>
          <div className="subcontent-header">
            <h3>Service Management</h3>
            <p>Add, edit, activate or deactivate services. The WhatsApp bot menu is built dynamically from these active services.</p>
          </div>
          <ServiceManagement adminToken={adminToken} showToast={showToast} />
        </div>

        {/* Shop Settings */}
        <div className={`admin-subcontent ${activeSubTab === 'shop-settings' ? 'active' : ''}`}>
          <div className="subcontent-header">
            <h3>Manage Shop &amp; Portal Details</h3>
            <p>Update details shown on the website and returned by the WhatsApp chatbot.</p>
          </div>
          <ShopSettingsForm adminToken={adminToken} showToast={showToast} onRefreshSettings={onRefreshSettings} />
        </div>

        {/* n8n Setup */}
        <div className={`admin-subcontent ${activeSubTab === 'n8n-setup' ? 'active' : ''}`}>
          <div className="subcontent-header">
            <h3>Production WhatsApp &amp; n8n Setup Guide</h3>
            <p>Deploy this solution for real clients by combining the Meta Cloud API and a self-hosted n8n workflow.</p>
          </div>
          <N8nSetupGuide adminToken={adminToken} />
        </div>
      </div>
    </section>
  );
}
