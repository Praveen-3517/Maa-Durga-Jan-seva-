import { useState, useEffect, useRef } from 'react';

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function LoginCard({ onLogin }) {
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await onLogin(password);
    } catch (err) {
      setError(err.message);
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
            />
            <i
              className={`fa-solid ${showPass ? 'fa-eye' : 'fa-eye-slash'}`}
              onClick={() => setShowPass(!showPass)}
            ></i>
          </div>
        </div>
        <button type="submit" className="btn btn-primary btn-block">
          <i className="fa-solid fa-right-to-bracket"></i> Access Dashboard
        </button>
        {error && <div className="login-error">{error}</div>}
      </form>
    </div>
  );
}

function StatsRow({ submissions }) {
  const total = submissions.length;
  const pending = submissions.filter(s => s.status === 'pending').length;
  const processing = submissions.filter(s => s.status === 'in-progress').length;
  const completed = submissions.filter(s => s.status === 'completed').length;
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
        <div className="stat-details"><span className="stat-value">{completed}</span><span className="stat-label">Completed Applications</span></div>
      </div>
      <div className="stat-card">
        <div className="stat-icon total"><i className="fa-solid fa-folder-open"></i></div>
        <div className="stat-details"><span className="stat-value">{total}</span><span className="stat-label">Total Submissions</span></div>
      </div>
    </div>
  );
}

function SubmissionsTable({ submissions, onUpdate, adminToken, showToast }) {
  const [rows, setRows] = useState({});

  useEffect(() => {
    const init = {};
    submissions.forEach(s => { init[s.id] = { status: s.status, remarks: s.remarks || '' }; });
    setRows(init);
  }, [submissions]);

  const saveRow = async (id) => {
    const { status, remarks } = rows[id] || {};
    try {
      const res = await fetch(`/api/submissions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken },
        body: JSON.stringify({ status, remarks }),
      });
      if (!res.ok) throw new Error('Failed to save');
      showToast('Changes saved successfully!');
      onUpdate();
    } catch (err) { showToast('Failed to save changes.', 'error'); }
  };

  const deleteRow = async (id) => {
    if (!window.confirm('Are you sure you want to delete this submission? All uploaded files will be permanently deleted.')) return;
    try {
      const res = await fetch(`/api/submissions/${id}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + adminToken } });
      if (!res.ok) throw new Error('Failed to delete');
      showToast('Submission deleted successfully!');
      onUpdate();
    } catch (err) { showToast('Deletion failed.', 'error'); }
  };

  if (submissions.length === 0) {
    return <tr><td colSpan="7" className="loading-cell">No submissions found.</td></tr>;
  }

  return submissions.map(sub => {
    const dateStr = new Date(sub.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    return (
      <tr key={sub.id} data-status={rows[sub.id]?.status || sub.status}>
        <td>{dateStr}</td>
        <td>
          <div className="cust-name">{escapeHtml(sub.clientName)}</div>
          <div className="cust-phone"><i className="fa-brands fa-whatsapp"></i> <a href={`https://wa.me/${sub.clientPhone}`} target="_blank" rel="noreferrer">{escapeHtml(sub.clientPhone)}</a></div>
        </td>
        <td><span className="service-type-badge">{escapeHtml(sub.serviceName)}</span></td>
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
            <button className="btn btn-save-row btn-icon" title="Save" onClick={() => saveRow(sub.id)}><i className="fa-solid fa-floppy-disk"></i></button>
            <a href={`/api/submissions/${encodeURIComponent(sub.id)}/receipt`} target="_blank" rel="noreferrer" className="btn btn-outline btn-icon" title="View Receipt"><i className="fa-solid fa-file-pdf"></i></a>
            <a href={`/api/admin/submissions/${encodeURIComponent(sub.id)}/download`} target="_blank" rel="noreferrer" className="btn btn-outline btn-icon" title="Download ZIP"><i className="fa-solid fa-file-zipper"></i></a>
            <button className="btn btn-delete-row btn-icon" title="Delete" onClick={() => deleteRow(sub.id)}><i className="fa-solid fa-trash-can"></i></button>
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
      const res = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Failed to update settings');
      showToast('Shop settings saved successfully!');
      setForm(f => ({ ...f, adminPassword: '' }));
      if (onRefreshSettings) onRefreshSettings();
    } catch (err) { showToast('Failed to save settings.', 'error'); }
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

function N8nSetupGuide() {
  return (
    <div className="n8n-setup-box">
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
          { num: 2, title: 'Step 2: Get WhatsApp Credentials', body: 'In the WhatsApp Setup Panel, configure a phone number. Meta will provide a Temporary Access Token, a Phone Number ID, and a WhatsApp Business Account ID.', hindi: 'WhatsApp settings me phone verify karein. Wahan se Phone Number ID copy karein aur System User me ja kar ek Permanent Access Token generate karein.' },
          { num: 3, title: 'Step 3: Setup n8n & Import Workflow', body: 'Deploy n8n (e.g. self-host on a VPS). Create a new workflow, and click Import from File. Upload the downloaded n8n_whatsapp_workflow.json.', hindi: 'n8n console open karein, Settings menu se Import from File select karein, aur download kiya hua JSON upload karein.' },
          { num: 4, title: 'Step 4: Update Workflow Credentials', body: 'Double-click the HTTP Request nodes and update the Phone Number ID, Access Token, and website URLs.', hindi: 'n8n workflow me jo HTTP nodes hain, unme YOUR_PHONE_NUMBER_ID aur Access Token daal kar update karein.' },
          { num: 5, title: 'Step 5: Setup Webhooks in Meta Developer Dashboard', body: 'In n8n, activate the workflow. Copy the Production Webhook URL from the Webhook node. In your Meta App Dashboard, paste this URL and subscribe to messages.', hindi: 'n8n Webhook Node ka live URL copy karke Meta Developer Portal ke Webhooks Configuration me paste karein. messages event subscribe kar lein. Chatbot live ho jayega!' },
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

export default function AdminDashboard({ adminToken, login, logout, showToast, isLoggedIn, onRefreshSettings }) {
  const [activeSubTab, setActiveSubTab] = useState('submissions-list');
  const [submissions, setSubmissions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadData = async () => {
    if (!adminToken) return;
    try {
      const res = await fetch('/api/submissions', { headers: { 'Authorization': 'Bearer ' + adminToken } });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to load');
      setSubmissions(data || []);
    } catch (err) {
      showToast('Dashboard sync failed. Please check login.', 'error');
    }
  };

  useEffect(() => {
    if (isLoggedIn) loadData();
  }, [isLoggedIn]);

  const filtered = submissions.filter(s => {
    const q = searchQuery.toLowerCase();
    const matchQ = !q || s.clientName?.toLowerCase().includes(q) || s.clientPhone?.toLowerCase().includes(q) || s.serviceName?.toLowerCase().includes(q);
    const matchS = statusFilter === 'all' || s.status === statusFilter;
    return matchQ && matchS;
  });

  if (!isLoggedIn) {
    return <section className="tab-content active"><LoginCard onLogin={login} /></section>;
  }

  return (
    <section className="tab-content active">
      <div className="admin-panel">
        <div className="admin-header-bar">
          <div>
            <h2><i className="fa-solid fa-gauge-high"></i> Cafe Admin Dashboard</h2>
            <p>Manage customer document uploads, applications, and shop settings.</p>
          </div>
          <div className="admin-actions">
            <button className="btn btn-outline" onClick={logout}><i className="fa-solid fa-right-from-bracket"></i> Logout</button>
          </div>
        </div>
        <StatsRow submissions={submissions} />
        <div className="admin-tab-nav">
          {[['submissions-list', 'fa-solid fa-list-check', 'Submissions'], ['shop-settings', 'fa-solid fa-gears', 'Shop Settings'], ['n8n-setup', 'fa-solid fa-network-wired', 'n8n & WhatsApp Setup']].map(([id, icon, label]) => (
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
          <N8nSetupGuide />
        </div>
      </div>
    </section>
  );
}
