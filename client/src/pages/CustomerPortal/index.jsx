import { useState, useRef, useEffect } from 'react';
import { SERVICES } from '../../constants/services';

function ServiceCard({ service, onApply }) {
  return (
    <div className="service-card" onClick={() => onApply(service.id)}>
      <div className="service-header">
        <div className="service-icon"><i className={service.icon}></i></div>
        <span className="service-badge">Online Process</span>
      </div>
      <h3 className="service-title">{service.title}</h3>
      <p className="service-hindi-title" style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--primary-color)', marginTop: '-6px', marginBottom: '8px' }}>
        <i className="fa-solid fa-language"></i> {service.hindiTitle}
      </p>
      <p className="service-desc">{service.description}</p>
      <div className="service-requirements-preview">
        <h5>Required:</h5>
        <ul>
          {service.requirements.slice(0, 2).map((req, i) => (
            <li key={i}><i className="fa-solid fa-check"></i> {req}</li>
          ))}
          {service.requirements.length > 2 && (
            <li><i className="fa-solid fa-ellipsis"></i> &amp; {service.requirements.length - 2} more...</li>
          )}
        </ul>
      </div>
      <button className="btn btn-primary btn-card">
        <i className="fa-solid fa-cloud-arrow-up"></i> Apply Now
      </button>
    </div>
  );
}

function UploadModal({ service, onClose, showToast, adminToken, onSubmitSuccess, prefilledName, prefilledPhone, uploadToken }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef();
  const nameRef = useRef();
  const phoneRef = useRef();
  const notesRef = useRef();

  if (!service) return null;

  const handleFiles = (files) => {
    const valid = Array.from(files).filter(f => f.type.startsWith('image/') || f.type === 'application/pdf');
    if (valid.length < files.length) showToast('Some files skipped. Only Images & PDFs supported.', 'error');
    setSelectedFiles(prev => [...prev, ...valid].slice(0, 10));
  };

  const removeFile = (idx) => setSelectedFiles(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) { showToast('Please upload at least one document.', 'error'); return; }
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('clientName', nameRef.current.value);
    formData.append('clientPhone', phoneRef.current.value);
    formData.append('serviceType', service.id || service.slug || service.name);
    formData.append('serviceName', service.title || service.name);
    formData.append('notes', notesRef.current.value);
    if (uploadToken) formData.append('upload_token', uploadToken);
    selectedFiles.forEach(f => formData.append('documents', f));
    try {
      const res = await fetch('/api/submissions', { method: 'POST', body: formData });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(data?.message || 'Failed to submit application');
      showToast('Application submitted successfully! Opening your official receipt...');
      onClose();
      if (data?.id) window.open(`/api/submissions/${encodeURIComponent(data.id)}/receipt`, '_blank');
      if (onSubmitSuccess) onSubmitSuccess();
    } catch (err) {
      showToast(err.message || 'Server error occurred.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine the requirements list (works for both old SERVICES format and new DB format)
  const requirementsList = service.requirements || (service.documents || []).map(d => d.document_name);

  return (
    <div className="modal open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="modal-header">
          <h3><i className={service.icon || 'fa-solid fa-file'}></i> Apply for {service.title || service.name}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {uploadToken && (
            <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem', color: '#4ade80' }}>
              <i className="fa-brands fa-whatsapp" style={{ fontSize: '1.1rem' }}></i>
              <span>This form was pre-loaded from your <strong>WhatsApp conversation</strong>. Your service is already selected!</span>
            </div>
          )}
          <div className="requirements-box">
            <h4><i className="fa-solid fa-circle-info"></i> Required Documents:</h4>
            <ul>{requirementsList.map((r, i) => <li key={i}>{r}</li>)}</ul>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Your Full Name (English)</label>
                <input type="text" ref={nameRef} placeholder="Enter your full name" required defaultValue={prefilledName || ''} />
              </div>
              <div className="form-group">
                <label>Your Mobile Number (WhatsApp Number)</label>
                <input type="tel" ref={phoneRef} placeholder="Enter your WhatsApp number" required defaultValue={prefilledPhone || ''} />
              </div>
            </div>
            <div className="form-group">
              <label>Additional Instructions / Details (Notes)</label>
              <textarea ref={notesRef} rows="2" placeholder="Example: Need correction in Father's Name, etc. (Optional)"></textarea>
            </div>
            <div className="form-group">
              <label>Select &amp; Upload Documents (Max 10 files, any image size allowed - auto compressed)</label>
              <div
                className={`file-drop-area ${isDragOver ? 'drag-over' : ''}`}
                onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={e => { e.preventDefault(); setIsDragOver(false); handleFiles(e.dataTransfer.files); }}
                onClick={() => fileInputRef.current?.click()}
              >
                <i className="fa-solid fa-cloud-arrow-up file-icon"></i>
                <p>Drag &amp; drop files here, or <span className="file-browse">browse files</span></p>
                <input type="file" ref={fileInputRef} multiple accept="image/*,application/pdf"
                  style={{ display: 'none' }}
                  onChange={e => handleFiles(e.target.files)} />
              </div>
              <div className="file-list-preview">
                {selectedFiles.map((f, i) => (
                  <div key={i} className="file-preview-item">
                    <span className="file-preview-name">
                      <i className={f.type === 'application/pdf' ? 'fa-solid fa-file-pdf' : 'fa-solid fa-file-image'}></i>
                      {f.name} ({(f.size / 1024).toFixed(1)} KB)
                    </span>
                    <button type="button" className="file-preview-remove" onClick={() => removeFile(i)}>&times;</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting
                  ? <span className="spinner"></span>
                  : <><i className="fa-solid fa-paper-plane"></i> Submit Application</>
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function CustomerPortal({ shopSettings, showToast, adminToken, onSubmitSuccess }) {
  const [modalService, setModalService] = useState(null);
  const [uploadToken, setUploadToken] = useState(null);
  const [prefilledName, setPrefilledName] = useState('');
  const [prefilledPhone, setPrefilledPhone] = useState('');
  const cleanPhone = String(shopSettings?.shopPhone || '918707845206').replace(/[^0-9]/g, '');

  // Check for ?upload=TOKEN in URL (WhatsApp-generated secure link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('upload');
    if (!token) return;

    setUploadToken(token);

    fetch(`/api/upload-session/${token}`)
      .then(r => r.json())
      .then(data => {
        if (!data.success) {
          showToast(data.message || 'This upload link is invalid or has expired.', 'error');
          return;
        }
        const session = data.data;
        const svc = session.service;
        if (!svc) return;

        // Build a service object compatible with UploadModal
        const builtService = {
          id: svc.id,
          slug: svc.slug,
          title: svc.name,
          name: svc.name,
          icon: svc.icon || 'fa-solid fa-file',
          hindiTitle: svc.hindi_title || '',
          description: svc.description || '',
          requirements: (svc.documents || []).filter(d => d.is_required).map(d => d.document_name),
          documents: svc.documents || [],
        };

        setPrefilledName(session.customer_name || '');
        setPrefilledPhone(session.whatsapp_number || '');
        setModalService(builtService);

        // Clean URL without reload
        const cleanUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, '', cleanUrl);
      })
      .catch(err => {
        console.error('[Upload Token] Error:', err);
        showToast('Failed to load your pre-filled application. Please select a service manually.', 'error');
      });
  }, []);

  const handleApply = (serviceId) => {
    setUploadToken(null);
    setPrefilledName('');
    setPrefilledPhone('');
    setModalService(SERVICES[serviceId]);
  };

  return (
    <section className="tab-content active">
      {/* Hero */}
      <div className="hero-section">
        <div className="hero-badge">
          <span className="pulse-dot"></span>
          <span>Portal Active &amp; Online</span>
        </div>
        <h1>Welcome to <span className="shop-title-text">{shopSettings?.shopName || 'Maa Durga Online Center'}</span></h1>
        <p className="hero-subtitle">CSC &amp; Online Digital Services Portal. Upload your documents directly, and we will process your applications instantly!</p>
        <div className="quick-contact-bar">
          <span><i className="fa-solid fa-location-dot"></i> <span style={{ color: 'white' }}>{shopSettings?.shopAddress || 'Bindwaliya Ghazipur, UP'}</span></span>
          <div className="contact-divider"></div>
          <span><i className="fa-solid fa-phone"></i> <a href={`https://wa.me/${cleanPhone}`}>+{cleanPhone}</a></span>
          <div className="contact-divider"></div>
          <span><i className="fa-solid fa-clock"></i> <span style={{ color: 'white' }}>{shopSettings?.shopTimings || '24/7'}</span></span>
        </div>
        <div className="hero-trust-row">
          <div className="trust-badge"><i className="fa-solid fa-shield-halved"></i> Secure Upload</div>
          <div className="trust-badge"><i className="fa-solid fa-bolt"></i> Fast Processing</div>
          <div className="trust-badge"><i className="fa-solid fa-headset"></i> 24/7 Support</div>
          <div className="trust-badge"><i className="fa-solid fa-cloud"></i> Cloud Storage</div>
        </div>
      </div>

      {/* Services */}
      <div className="services-container">
        <div className="section-header">
          <h2 className="section-title"><i className="fa-solid fa-briefcase"></i> Our Digital Services</h2>
          <p className="section-subtitle">Select a service below to view required documents and submit them online.</p>
        </div>
        <div className="services-grid">
          {Object.values(SERVICES).map(service => (
            <ServiceCard key={service.id} service={service} onApply={handleApply} />
          ))}
        </div>
      </div>

      {modalService && (
        <UploadModal
          service={modalService}
          onClose={() => { setModalService(null); setUploadToken(null); }}
          showToast={showToast}
          adminToken={adminToken}
          onSubmitSuccess={onSubmitSuccess}
          prefilledName={prefilledName}
          prefilledPhone={prefilledPhone}
          uploadToken={uploadToken}
        />
      )}
    </section>
  );
}
