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
  const normalizeStatus = s => (s?.status || 'pending').toString().toLowerCase().replace(/_/g, '-');
  const pending = submissions.filter(s => normalizeStatus(s) === 'pending').length;
  const processing = submissions.filter(s => ['in-progress', 'processing'].includes(normalizeStatus(s))).length;
  const completed = submissions.filter(s => normalizeStatus(s) === 'completed').length;
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
      
      // Dispatch real-time events across all tabs & windows
      window.dispatchEvent(new Event('shop_settings_updated'));
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('shop_settings_channel');
        bc.postMessage('updated');
        bc.close();
      }

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
function ServiceManagement({ adminToken, showToast }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editService, setEditService] = useState(null);

  const loadServices = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/services');
      const data = await res.json();
      if (data.success) {
        setServices(data.data || []);
      } else {
        showToast('Failed to load services from database. Please run the Supabase migration SQL first.', 'error');
        setServices([]);
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
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken },
        body: JSON.stringify({ is_active: !svc.is_active })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showToast(`Service ${!svc.is_active ? 'activated' : 'deactivated'} successfully!`);
      loadServices();
      notifyServicesChanged();
    } catch (err) { showToast('Failed to update service: ' + err.message, 'error'); }
  };

  const handleDelete = async (svc) => {
    if (!window.confirm(`Delete "${svc.name}"? This will remove it from the WhatsApp bot menu.`)) return;
    try {
      const res = await fetch(`/api/admin/services/${svc.id}`, {
        method: 'DELETE', headers: { 'Authorization': 'Bearer ' + adminToken }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showToast('Service deleted.');
      loadServices();
      notifyServicesChanged();
    } catch (err) { showToast('Failed to delete service: ' + err.message, 'error'); }
  };

  const openAdd = () => { setEditService(null); setShowModal(true); };
  const openEdit = (svc) => { setEditService(svc); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditService(null); };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            These services are shown in the WhatsApp bot menu and on the customer portal. Changes take effect immediately.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAdd} id="btn-add-service">
          <i className="fa-solid fa-plus"></i> Add New Service
        </button>
      </div>

      {loading ? (
        <div className="loading-cell" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          <i className="fa-solid fa-spinner fa-spin"></i> Loading services...
        </div>
      ) : services.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
          <i className="fa-solid fa-database" style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.4 }}></i>
          <p style={{ marginBottom: '0.5rem', fontWeight: 600 }}>No services found in database.</p>
          <p style={{ fontSize: '0.85rem' }}>Run the SQL migration script in <code>data/supabase_migration.sql</code> in your Supabase SQL Editor to seed the initial services.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Service Name</th>
                <th>Hindi Title</th>
                <th>Required Docs</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.map(svc => (
                <tr key={svc.id} data-status={svc.is_active ? 'completed' : 'rejected'}>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--primary-color)' }}>{svc.display_order}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <i className={svc.icon || 'fa-solid fa-file'} style={{ color: 'var(--primary-color)', fontSize: '1.1rem', minWidth: '1.2rem' }}></i>
                      <div>
                        <div style={{ fontWeight: 600 }}>{svc.name}</div>
                        {svc.description && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{svc.description.substring(0, 60)}{svc.description.length > 60 ? '...' : ''}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{svc.hindi_title || '—'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ background: 'var(--bg-tertiary)', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 600 }}>
                      {(svc.documents || []).length} docs
                    </span>
                  </td>
                  <td>
                    <span style={{
                      padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700,
                      background: svc.is_active ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                      color: svc.is_active ? '#4ade80' : '#f87171',
                      border: `1px solid ${svc.is_active ? '#22c55e40' : '#ef444440'}`
                    }}>
                      {svc.is_active ? '● Active' : '○ Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn btn-outline btn-icon" title="Edit Service" onClick={() => openEdit(svc)}>
                        <i className="fa-solid fa-pen-to-square"></i>
                      </button>
                      <button
                        className={`btn btn-icon ${svc.is_active ? 'btn-delete-row' : 'btn-save-row'}`}
                        title={svc.is_active ? 'Deactivate' : 'Activate'}
                        onClick={() => handleToggleActive(svc)}
                      >
                        <i className={`fa-solid ${svc.is_active ? 'fa-toggle-on' : 'fa-toggle-off'}`}></i>
                      </button>
                      <button className="btn btn-delete-row btn-icon" title="Delete Service" onClick={() => handleDelete(svc)}>
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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

function ServiceModal({ editService, adminToken, showToast, onClose, onSaved }) {
  const isEdit = !!editService;
  const [form, setForm] = useState({
    name: editService?.name || '',
    hindi_title: editService?.hindi_title || '',
    description: editService?.description || '',
    icon: editService?.icon || 'fa-solid fa-file',
    display_order: editService?.display_order ?? 0,
    is_active: editService?.is_active !== false,
  });
  const [documents, setDocuments] = useState(editService?.documents || []);
  const [newDoc, setNewDoc] = useState('');
  const [newDocRequired, setNewDocRequired] = useState(true);
  const [saving, setSaving] = useState(false);

  const addDoc = () => {
    const trimmed = newDoc.trim();
    if (!trimmed) return;
    setDocuments(prev => [...prev, { document_name: trimmed, is_required: newDocRequired, display_order: prev.length, _new: true }]);
    setNewDoc('');
    setNewDocRequired(true);
  };

  const removeDoc = async (doc, idx) => {
    if (isEdit && doc.id && !doc._new) {
      // Delete from DB immediately
      try {
        await fetch(`/api/admin/services/${editService.id}/documents/${doc.id}`, {
          method: 'DELETE', headers: { 'Authorization': 'Bearer ' + adminToken }
        });
      } catch (_) {}
    }
    setDocuments(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { showToast('Service name is required.', 'error'); return; }
    setSaving(true);
    try {
      let serviceId = editService?.id;

      if (isEdit) {
        // Update service fields
        const res = await fetch(`/api/admin/services/${serviceId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken },
          body: JSON.stringify(form)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
      } else {
        // Create service
        const newDocs = documents.map((d, i) => ({ document_name: d.document_name, is_required: d.is_required, display_order: i }));
        const res = await fetch('/api/admin/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken },
          body: JSON.stringify({ ...form, documents: newDocs })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        serviceId = data.data?.id;
      }

      // For edit mode, add any new documents
      if (isEdit) {
        const newDocs = documents.filter(d => d._new);
        for (const doc of newDocs) {
          await fetch(`/api/admin/services/${serviceId}/documents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken },
            body: JSON.stringify({ document_name: doc.document_name, is_required: doc.is_required, display_order: doc.display_order })
          });
        }
      }

      showToast(isEdit ? 'Service updated successfully!' : 'Service created successfully!');
      window.dispatchEvent(new Event('services_updated'));
      if (typeof BroadcastChannel !== 'undefined') {
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

  const field = (key) => ({ value: form[key], onChange: e => setForm(f => ({ ...f, [key]: e.target.value })) });

  return (
    <div className="modal open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h3><i className={form.icon || 'fa-solid fa-file'}></i> {isEdit ? `Edit: ${editService.name}` : 'Add New Service'}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSave} id="service-form">
            <div className="form-grid-2">
              <div className="form-group">
                <label>Service Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="text" placeholder="e.g. PAN Card Apply" required {...field('name')} />
              </div>
              <div className="form-group">
                <label>Hindi Title</label>
                <input type="text" placeholder="पैन कार्ड" {...field('hindi_title')} />
              </div>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea rows="2" placeholder="Brief description of this service..." {...field('description')} />
            </div>
            <div className="form-grid-2">
              <div className="form-group">
                <label>FontAwesome Icon Class</label>
                <input type="text" placeholder="fa-solid fa-address-card" {...field('icon')} />
              </div>
              <div className="form-group">
                <label>Display Order</label>
                <input type="number" min="0" {...field('display_order')} onChange={e => setForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <label style={{ margin: 0 }}>Active (show in WhatsApp bot & portal)</label>
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} style={{ width: 'auto', accentColor: 'var(--primary-color)', transform: 'scale(1.4)' }} />
            </div>

            <div className="divider"></div>
            <div className="form-group">
              <label>Required Documents</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {documents.map((doc, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <i className={`fa-solid fa-${doc.is_required ? 'star' : 'circle'}`} style={{ color: doc.is_required ? 'var(--primary-color)' : 'var(--text-muted)', fontSize: '0.75rem' }}></i>
                    <span style={{ flex: 1, fontSize: '0.88rem' }}>{doc.document_name}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{doc.is_required ? 'Required' : 'Optional'}</span>
                    <button type="button" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 0.25rem' }} onClick={() => removeDoc(doc, idx)}>×</button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Document name (e.g. Aadhar Card)"
                  value={newDoc}
                  onChange={e => setNewDoc(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addDoc())}
                  style={{ flex: 1, minWidth: '180px' }}
                />
                <select
                  value={newDocRequired ? 'required' : 'optional'}
                  onChange={e => setNewDocRequired(e.target.value === 'required')}
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', padding: '0.5rem', fontSize: '0.85rem' }}
                >
                  <option value="required">Required</option>
                  <option value="optional">Optional</option>
                </select>
                <button type="button" className="btn btn-outline" onClick={addDoc}>
                  <i className="fa-solid fa-plus"></i> Add
                </button>
              </div>
            </div>
          </form>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" form="service-form" className="btn btn-primary" disabled={saving}>
            {saving ? <span className="spinner"></span> : <><i className="fa-solid fa-floppy-disk"></i> {isEdit ? 'Save Changes' : 'Create Service'}</>}
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
          logout();
          showToast('Session expired. Please log in again.', 'error');
          return;
        }
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.message || 'Failed to load');
      }
      const data = await res.json();
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
    ['service-management', 'fa-solid fa-briefcase', 'Service Management'],
    ['shop-settings', 'fa-solid fa-gears', 'Shop Settings'],
    ['n8n-setup', 'fa-solid fa-network-wired', 'n8n & WhatsApp Setup'],
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
