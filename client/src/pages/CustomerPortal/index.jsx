import { useState, useRef, useEffect, useCallback } from 'react';
import { SERVICES, CERTIFICATE_TYPES, PAN_TYPES, OBC_SUBCASTES, GHAZIPUR_THANAS } from '../../constants/services';

const API_BASE = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
  ? 'http://localhost:3000'
  : '';

const getApiUrl = (path) => `${API_BASE}${path}`;

const isNetworkError = (err) => {
  if (!err || !err.message) return false;
  const lower = err.message.toLowerCase();
  return lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    lower.includes('load failed') ||
    lower.includes('aborted');
};

const isLocalDev = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const getSubmitErrorMessage = (err) => {
  if (!err || !err.message) return 'Server error occurred. Please try again.';
  if (isNetworkError(err)) {
    return isLocalDev
      ? 'Server unavailable. Please start the backend (npm run dev).'
      : 'Network error. Please check your internet connection and try again.';
  }
  return err.message;
};

/**
 * fetchWithWakeUp — Smart fetch that auto-retries for up to 60s on network errors.
 * Used for submissions when Render server might be cold-starting.
 * @param {string} url
 * @param {RequestInit} options
 * @param {(secondsLeft: number) => void} onRetrying - called every second during retry countdown
 */
const fetchWithWakeUp = async (url, options, onRetrying) => {
  const MAX_WAIT = 60000; // 60 seconds total retry window
  const RETRY_INTERVAL = 6000; // retry every 6 seconds
  const startTime = Date.now();

  while (true) {
    try {
      const response = await fetch(url, options);
      return response; // success
    } catch (err) {
      if (!isNetworkError(err)) throw err; // non-network error, don't retry
      if (isLocalDev) throw err; // don't auto-retry in dev

      const elapsed = Date.now() - startTime;
      if (elapsed >= MAX_WAIT) throw err; // gave up

      // Show countdown to user
      const remaining = Math.ceil((MAX_WAIT - elapsed) / 1000);
      if (onRetrying) onRetrying(remaining);

      // Wait before retry
      await new Promise(r => setTimeout(r, RETRY_INTERVAL));
    }
  }
};


/* ─── Small helper ─── */
function ServiceCard({ service, onApply }) {
  const isMerged = service.isMerged;
  const isPan = service.id === 'srv_pancard' || service.slug === 'srv_pancard' || (service.title || '').toLowerCase().includes('pan');
  const subTypes = isPan ? PAN_TYPES : CERTIFICATE_TYPES;

  return (
    <div
      className="service-card"
      role="button"
      onClick={() => onApply(service.id)}
      style={{ cursor: 'pointer' }}
    >
      <div className="service-header">
        <div className="service-icon">
          <i className={service.icon}></i>
        </div>

        <span className="service-badge">
          {isMerged ? (isPan ? '2-in-1 Service' : '3-in-1 Service') : 'Online Process'}
        </span>
      </div>

      <h3 className="service-title">
        {service.title}
      </h3>

      <p
        className="service-hindi-title"
        style={{
          fontSize: '0.95rem',
          fontWeight: 600,
          color: 'var(--primary-color)',
          marginTop: '-6px',
          marginBottom: '8px'
        }}
      >
        <i className="fa-solid fa-language"></i> {service.hindiTitle}
      </p>

      {isMerged && (
        <div
          style={{
            display: 'flex',
            gap: '0.4rem',
            flexWrap: 'wrap',
            marginBottom: '8px'
          }}
        >
          {Object.values(subTypes).map(ct => (
            <span
              key={ct.id}
              style={{
                background: ct.color + '22',
                color: ct.color,
                border: `1px solid ${ct.color}55`,
                borderRadius: '20px',
                padding: '2px 10px',
                fontSize: '0.78rem',
                fontWeight: 600
              }}
            >
              <i
                className={ct.icon}
                style={{ marginRight: 4 }}
              ></i>
              {ct.label}
            </span>
          ))}
        </div>
      )}

      <p className="service-desc">
        {service.description}
      </p>

      <div className="service-requirements-preview">
        <h5>Required:</h5>

        <ul>
          {service.requirements.slice(0, 2).map((req, i) => (
            <li key={i}>
              <i className="fa-solid fa-check"></i> {req}
            </li>
          ))}

          {service.requirements.length > 2 && (
            <li>
              <i className="fa-solid fa-ellipsis"></i>
              &amp; {service.requirements.length - 2} more...
            </li>
          )}
        </ul>
      </div>

      <button className="btn btn-primary btn-card">
        <i className="fa-solid fa-cloud-arrow-up"></i>
        Apply Now
      </button>
    </div>
  );
}

/* ─── Sub-Service Picker ─── */
function CertificatePickerModal({
  service,
  onSelect,
  onClose,
  pageView = false
}) {
  const isPan = service?.id === 'srv_pancard' || service?.slug === 'srv_pancard' || (service?.title || '').toLowerCase().includes('pan');
  const subTypes = isPan ? PAN_TYPES : CERTIFICATE_TYPES;
  const modalTitle = isPan ? 'पैन कार्ड सेवा चुनें / Choose PAN Card Option' : 'प्रमाण पत्र चुनें / Choose Certificate';
  const modalSub = isPan
    ? 'आप किस पैन कार्ड सेवा के लिए आवेदन करना चाहते हैं? / Which PAN card service do you want to apply for?'
    : 'आप किस प्रमाण पत्र के लिए आवेदन करना चाहते हैं? / Which certificate do you want to apply for?';
  const modalIcon = isPan ? 'fa-solid fa-address-card' : 'fa-solid fa-file-shield';

  return (
    <div
      className={
        pageView
          ? 'page-view page-view-open application-page-view'
          : 'modal open'
      }
      onClick={
        pageView
          ? undefined
          : e => e.target === e.currentTarget && onClose()
      }
      style={
        pageView
          ? {
            width: '100%',
            margin: 0,
            padding: 0
          }
          : undefined
      }
    >
      <div
        className="modal-content"
        style={{
          maxWidth: pageView ? 'none' : 520,
          width: '100%',
          margin: pageView ? '0 auto' : '1rem auto',
          maxHeight: pageView
            ? 'none'
            : 'calc(100vh - 2rem)',
          overflow: 'auto'
        }}
      >
        <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem' }}>
          <h3 style={{ margin: 0 }}>
            <i className={modalIcon} style={{ marginRight: 8, color: 'var(--primary-color)' }}></i>
            {modalTitle}
          </h3>

          <button
            type="button"
            className="btn btn-outline"
            onClick={onClose}
            style={{
              fontSize: '0.82rem',
              padding: '0.4rem 0.85rem',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              borderColor: 'var(--primary-color)',
              color: 'var(--primary-color)',
              margin: 0
            }}
          >
            <i className="fa-solid fa-arrow-left"></i>
            Back to Services
          </button>
        </div>

        <div className="modal-body">
          <p
            style={{
              marginBottom: '1.2rem',
              color: 'var(--text-muted)',
              fontSize: '0.92rem'
            }}
          >
            {modalSub}
          </p>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem'
            }}
          >
            {Object.values(subTypes).map(ct => (
              <button
                key={ct.id}
                onClick={() => onSelect(ct)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  background: `linear-gradient(135deg, ${ct.color}18, ${ct.color}08)`,
                  border: `1.5px solid ${ct.color}44`,
                  borderRadius: '12px',
                  padding: '1rem 1.2rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left',
                  color: 'var(--text-color)'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.border =
                    `1.5px solid ${ct.color}cc`;

                  e.currentTarget.style.transform =
                    'translateX(4px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.border =
                    `1.5px solid ${ct.color}44`;

                  e.currentTarget.style.transform =
                    'translateX(0)';
                }}
              >
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: '50%',
                    background: ct.color + '22',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <i
                    className={ct.icon}
                    style={{
                      color: ct.color,
                      fontSize: '1.2rem'
                    }}
                  ></i>
                </div>

                <div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '1.05rem',
                      color: ct.color
                    }}
                  >
                    {ct.label}
                  </div>

                  <div
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--text-muted)',
                      marginTop: '2px'
                    }}
                  >
                    {ct.sublabel}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 4,
                      marginTop: 6
                    }}
                  >
                    {ct.documents.slice(0, 2).map((d, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: '0.72rem',
                          background: 'rgba(255,255,255,0.08)',
                          borderRadius: '4px',
                          padding: '1px 6px',
                          color: 'var(--text-muted)'
                        }}
                      >
                        {d}
                      </span>
                    ))}

                    {ct.documents.length > 2 && (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--text-muted)'
                        }}
                      >
                        +{ct.documents.length - 2} more
                      </span>
                    )}
                  </div>
                </div>

                <i
                  className="fa-solid fa-chevron-right"
                  style={{
                    marginLeft: 'auto',
                    color: ct.color,
                    opacity: 0.7
                  }}
                ></i>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Certificate Form Modal ─── */
function CertificateFormModal({
  certType,
  service,
  onClose,
  showToast,
  onSubmitSuccess,
  prefilledName,
  prefilledPhone,
  uploadToken,
  pageView = false
}) {
  const [formValues, setFormValues] = useState(() => {
    const init = {};

    certType.fields.forEach(f => {
      init[f.name] = f.fixed
        ? f.value
        : (
          f.name === 'applicantName'
            ? (prefilledName || '')
            : ''
        );
    });

    if (prefilledPhone) {
      init['mobile'] = prefilledPhone;
    }

    return init;
  });

  const [aadharFile, setAadharFile] = useState(null);
  const [aadharBackFile, setAadharBackFile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [salarySlipFile, setSalarySlipFile] = useState(null);
  const [ageProofFile, setAgeProofFile] = useState(null);
  const [oldPanFile, setOldPanFile] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Server wake-up retry state
  const [wakeRetrying, setWakeRetrying] = useState(false);
  const [wakeSecondsLeft, setWakeSecondsLeft] = useState(0);

  const fileInputRef = useRef();
  const cameraInputRef = useRef();
  const aadharFileRef = useRef();
  const aadharCameraRef = useRef();
  const aadharBackFileRef = useRef();
  const aadharBackCameraRef = useRef();
  const photoFileRef = useRef();
  const photoCameraRef = useRef();
  const salarySlipFileRef = useRef();
  const salarySlipCameraRef = useRef();
  const ageProofFileRef = useRef();
  const ageProofCameraRef = useRef();
  const oldPanFileRef = useRef();
  const oldPanCameraRef = useRef();

  const handleChange = (name, value) => {
    setFormValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFiles = (files) => {
    const valid = Array.from(files).filter(
      f =>
        f.type.startsWith('image/') ||
        f.type === 'application/pdf'
    );

    if (valid.length < files.length) {
      showToast(
        'Some files skipped. Only Images & PDFs supported.',
        'error'
      );
    }

    setSelectedFiles(prev =>
      [...prev, ...valid].slice(0, 10)
    );
  };

  const removeFile = (idx) => {
    setSelectedFiles(prev =>
      prev.filter((_, i) => i !== idx)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!aadharFile) {
      showToast(
        'कृपया आधार कार्ड Front side अपलोड करें। / Please upload Aadhar Card Front.',
        'error'
      );
      return;
    }

    if (!aadharBackFile) {
      showToast(
        'कृपया आधार कार्ड Back side अपलोड करें। / Please upload Aadhar Card Back.',
        'error'
      );
      return;
    }

    if (!photoFile) {
      showToast(
        'कृपया पासपोर्ट साइज फोटो अपलोड करें। / Please upload Passport Photo.',
        'error'
      );
      return;
    }

    // If Occupation is नौकरी, salary slip is mandatory
    if (formValues.vyavsay === 'नौकरी' && !salarySlipFile) {
      showToast(
        'नौकरी चुनने पर सैलरी स्लिप अनिवार्य है। / Salary Slip is mandatory for Occupation: नौकरी.',
        'error'
      );
      return;
    }

    // If New PAN Card or PAN Correction, Age Proof (Voter ID / Birth Certificate / 10th Result) is mandatory
    if ((certType.id === 'new_pan' || certType.id === 'pan_correction' || certType.mandatoryDocType === 'age_proof' || certType.mandatoryDocType === 'marksheet') && !ageProofFile) {
      showToast(
        'कृपया उम्र प्रमाण पत्र (Voter ID / Birth Certificate / 10th Result) अपलोड करें। / Please upload Age Proof.',
        'error'
      );
      return;
    }

    // If PAN Correction, Old PAN Card is mandatory
    if ((certType.id === 'pan_correction' || certType.mandatoryDocType === 'old_pan') && !oldPanFile) {
      showToast(
        'कृपया पुराना पैन कार्ड अपलोड करें। / Please upload Old PAN Card.',
        'error'
      );
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData();

    formData.append(
      'clientName',
      formValues.applicantName || ''
    );

    formData.append(
      'clientPhone',
      formValues.mobile || ''
    );

    formData.append(
      'serviceType',
      `${service.id}_${certType.id}`
    );

    formData.append(
      'serviceName',
      `${certType.label} (${certType.sublabel})`
    );

    const notesArr = certType.fields
      .filter(f => !f.fixed)
      .map(
        f =>
          `${f.label}: ${formValues[f.name] || '-'}`
      )
      .join('\n');

    formData.append('notes', notesArr);

    if (uploadToken) {
      formData.append('upload_token', uploadToken);
    }

    if (aadharFile) {
      formData.append('documents', aadharFile);
    }

    if (aadharBackFile) {
      formData.append('documents', aadharBackFile);
    }

    if (photoFile) {
      formData.append('documents', photoFile);
    }

    // Attach salary slip if Occupation = नौकरी
    if (salarySlipFile) {
      formData.append('documents', salarySlipFile);
    }

    // Attach Age Proof if New PAN
    if (ageProofFile) {
      formData.append('documents', ageProofFile);
    }

    // Attach Old PAN if Correction
    if (oldPanFile) {
      formData.append('documents', oldPanFile);
    }

    selectedFiles.forEach(f => {
      formData.append('documents', f);
    });

    try {
      // Use fetchWithWakeUp: auto-retries for up to 60s if server is cold-starting
      const res = await fetchWithWakeUp(
        getApiUrl('/api/submissions'),
        { method: 'POST', body: formData },
        (secondsLeft) => {
          // Called each retry cycle — shows countdown inside button
          setWakeRetrying(true);
          setWakeSecondsLeft(secondsLeft);
        }
      );

      setWakeRetrying(false);

      const text = await res.text();

      const data = text
        ? JSON.parse(text)
        : {};

      if (!res.ok) {
        throw new Error(
          data?.message ||
          'Failed to submit application'
        );
      }

      showToast(
        'आवेदन सफलतापूर्वक जमा हो गया! / Application submitted successfully!'
      );

      onClose();

      if (data?.id) {
        window.open(
          getApiUrl(
            `/api/submissions/${encodeURIComponent(data.id)}/receipt`
          ),
          '_blank'
        );
      }

      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    } catch (err) {
      setWakeRetrying(false);
      showToast(
        getSubmitErrorMessage(err),
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={
        pageView
          ? 'page-view application-page-view'
          : 'modal open'
      }
      onClick={
        pageView
          ? undefined
          : e =>
            e.target === e.currentTarget &&
            onClose()
      }
      style={
        pageView
          ? {
            width: '100%',
            margin: 0,
            padding: 0
          }
          : undefined
      }
    >
      <div
        className="modal-content"
        style={{
          maxWidth: pageView ? 'none' : 700,
          width: '100%',
          margin: pageView
            ? '0 auto'
            : '1rem auto',
          maxHeight: pageView
            ? 'none'
            : 'calc(100vh - 2rem)',
          overflow: 'auto'
        }}
      >
        <div
          className="modal-header"
          style={{
            borderBottom:
              `3px solid ${certType.color}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.6rem'
          }}
        >
          <h3
            style={{
              color: certType.color,
              margin: 0
            }}
          >
            <i className={certType.icon} style={{ marginRight: 8 }}></i>
            {certType.label}

            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 400,
                color: 'var(--text-muted)',
                marginLeft: 8
              }}
            >
              {certType.sublabel}
            </span>
          </h3>

          <button
            type="button"
            className="btn btn-outline"
            onClick={onClose}
            style={{
              fontSize: '0.82rem',
              padding: '0.4rem 0.85rem',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              borderColor: certType.color,
              color: certType.color,
              margin: 0
            }}
          >
            <i className="fa-solid fa-arrow-left"></i>
            Back to Services
          </button>
        </div>

        <div className="modal-body">
          {uploadToken && (
            <div
              style={{
                background:
                  'rgba(34,197,94,0.08)',
                border:
                  '1px solid rgba(34,197,94,0.3)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                fontSize: '0.88rem',
                color: '#4ade80'
              }}
            >
              <i
                className="fa-brands fa-whatsapp"
                style={{
                  fontSize: '1.1rem'
                }}
              ></i>

              <span>
                This form was pre-loaded from your
                <strong> WhatsApp conversation</strong>.
              </span>
            </div>
          )}

          <div
            className="requirements-box"
            style={{
              borderLeft:
                `4px solid ${certType.color}`
            }}
          >
            <h4>
              <i className="fa-solid fa-circle-info"></i>
              आवश्यक दस्तावेज़ / Required Documents:
            </h4>

            <ul>
              {certType.documents.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid-2">
              {certType.fields.map(field => (
                <div
                  className="form-group"
                  key={field.name}
                  style={
                    field.name === 'thana' ||
                      field.name === 'jaati' ||
                      field.name === 'upjaati'
                      ? {}
                      : {}
                  }
                >
                  <label>
                    {field.label}

                    {field.required && (
                      <span
                        style={{
                          color: certType.color,
                          marginLeft: 3
                        }}
                      >
                        *
                      </span>
                    )}

                    {field.fixed && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          marginLeft: 6,
                          color: 'var(--text-muted)',
                          fontStyle: 'italic'
                        }}
                      >
                        (fixed)
                      </span>
                    )}
                  </label>

                  {field.type === 'select' ? (
                    <select
                      value={
                        formValues[field.name] || ''
                      }
                      onChange={e =>
                        handleChange(
                          field.name,
                          e.target.value
                        )
                      }
                      required={field.required}
                      style={{
                        padding: '0.8rem',
                        borderRadius: '8px',
                        border:
                          '1px solid var(--border-color)',
                        background:
                          'var(--bg-secondary)',
                        color:
                          'var(--text-color)',
                        width: '100%'
                      }}
                    >
                      <option
                        value=""
                        disabled
                      >
                        Select{' '}
                        {field.label
                          .split('/')[0]
                          .trim()}
                      </option>

                      {field.options.map(opt => (
                        <option
                          key={opt}
                          value={opt}
                        >
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <>
                      <input
                        type={
                          field.type || 'text'
                        }
                        list={
                          formValues.category ===
                            'OBC' &&
                            (
                              field.name ===
                              'upjaati' ||
                              field.name ===
                              'jaati'
                            )
                            ? 'obc-subcastes-datalist'
                            : undefined
                        }
                        value={
                          formValues[field.name] || ''
                        }
                        onChange={e =>
                          !field.fixed &&
                          handleChange(
                            field.name,
                            e.target.value
                          )
                        }
                        placeholder={
                          formValues.category ===
                            'OBC' &&
                            (
                              field.name ===
                              'upjaati' ||
                              field.name ===
                              'jaati'
                            )
                            ? 'सूची से चुनें या टाइप करें...'
                            : (
                              field.fixed
                                ? field.value
                                : field.placeholder
                            )
                        }
                        required={
                          field.required &&
                          !field.fixed
                        }
                        readOnly={field.fixed}
                        style={
                          field.fixed
                            ? {
                              background:
                                'var(--bg-tertiary)',
                              color:
                                'var(--text-muted)',
                              cursor:
                                'not-allowed'
                            }
                            : {}
                        }
                        maxLength={
                          field.type === 'tel'
                            ? 10
                            : undefined
                        }
                      />

                      {formValues.category ===
                        'OBC' &&
                        (
                          field.name ===
                          'upjaati' ||
                          field.name ===
                          'jaati'
                        ) && (
                          <>
                            <datalist
                              id="obc-subcastes-datalist"
                            >
                              {OBC_SUBCASTES.map(
                                (sc, idx) => (
                                  <option
                                    key={idx}
                                    value={sc}
                                  />
                                )
                              )}
                            </datalist>

                            <span
                              style={{
                                fontSize: '0.75rem',
                                color:
                                  'var(--primary-color)',
                                marginTop: '4px',
                                display: 'block'
                              }}
                            >
                              <i
                                className="fa-solid fa-lightbulb"
                                style={{
                                  marginRight: 4
                                }}
                              ></i>

                              OBC सूची में से चुनें या
                              अपनी उपजाति टाइप करें
                            </span>
                          </>
                        )}
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Mandatory Files Uploads */}
            <div
              className="form-group"
              style={{
                marginTop: '1rem'
              }}
            >
              <label>
                अनिवार्य दस्तावेज़ / Mandatory Documents
                <span
                  style={{
                    color: certType.color
                  }}
                >
                  *
                </span>
              </label>

              <div
                style={{
                  display: 'flex',
                  gap: '1rem',
                  flexDirection: 'column',
                  marginTop: '0.5rem'
                }}
              >
                {/* Aadhaar Card FRONT */}
                <div
                  style={{
                    background: 'var(--bg-tertiary)',
                    padding: '0.8rem',
                    borderRadius: '8px',
                    border: `1px solid ${aadharFile ? certType.color : 'var(--border-color)'}`,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      <i className="fa-solid fa-address-card" style={{ marginRight: 6 }}></i>
                      आधार कार्ड Front / Aadhar Front
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Required — Front Side (Image or PDF)</div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input type="file" ref={aadharFileRef} accept="image/*,application/pdf" onChange={e => setAadharFile(e.target.files[0])} style={{ display: 'none' }} />
                    <input type="file" ref={aadharCameraRef} accept="image/*" capture="environment" onChange={e => setAadharFile(e.target.files[0])} style={{ display: 'none' }} />

                    {aadharFile ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(34,197,94,0.12)', border: '1px solid #22c55e', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.82rem', color: '#4ade80' }}>
                        <i className="fa-solid fa-circle-check"></i>
                        <span>{aadharFile.name.length > 18 ? aadharFile.name.substring(0, 15) + '...' : aadharFile.name}</span>
                        <button type="button" onClick={() => setAadharFile(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', marginLeft: 4 }}>&times;</button>
                      </div>
                    ) : (
                      <>
                        <button type="button" className="btn btn-outline" onClick={() => aadharFileRef.current?.click()} style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}>
                          <i className="fa-solid fa-folder-open" style={{ marginRight: 4 }}></i>File / PDF
                        </button>
                        <button type="button" className="btn btn-outline" onClick={() => aadharCameraRef.current?.click()} style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem', background: 'rgba(245, 158, 11, 0.15)', borderColor: 'var(--primary-color)', color: 'var(--primary-color)' }}>
                          <i className="fa-solid fa-camera" style={{ marginRight: 4 }}></i>Take Photo
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Aadhaar Card BACK */}
                <div
                  style={{
                    background: 'var(--bg-tertiary)',
                    padding: '0.8rem',
                    borderRadius: '8px',
                    border: `1px solid ${aadharBackFile ? certType.color : 'var(--border-color)'}`,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      <i className="fa-solid fa-address-card" style={{ marginRight: 6 }}></i>
                      आधार कार्ड Back / Aadhar Back
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Required — Back Side (Image or PDF)</div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input type="file" ref={aadharBackFileRef} accept="image/*,application/pdf" onChange={e => setAadharBackFile(e.target.files[0])} style={{ display: 'none' }} />
                    <input type="file" ref={aadharBackCameraRef} accept="image/*" capture="environment" onChange={e => setAadharBackFile(e.target.files[0])} style={{ display: 'none' }} />

                    {aadharBackFile ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(34,197,94,0.12)', border: '1px solid #22c55e', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.82rem', color: '#4ade80' }}>
                        <i className="fa-solid fa-circle-check"></i>
                        <span>{aadharBackFile.name.length > 18 ? aadharBackFile.name.substring(0, 15) + '...' : aadharBackFile.name}</span>
                        <button type="button" onClick={() => setAadharBackFile(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', marginLeft: 4 }}>&times;</button>
                      </div>
                    ) : (
                      <>
                        <button type="button" className="btn btn-outline" onClick={() => aadharBackFileRef.current?.click()} style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}>
                          <i className="fa-solid fa-folder-open" style={{ marginRight: 4 }}></i>File / PDF
                        </button>
                        <button type="button" className="btn btn-outline" onClick={() => aadharBackCameraRef.current?.click()} style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem', background: 'rgba(245, 158, 11, 0.15)', borderColor: 'var(--primary-color)', color: 'var(--primary-color)' }}>
                          <i className="fa-solid fa-camera" style={{ marginRight: 4 }}></i>Take Photo
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    background:
                      'var(--bg-tertiary)',
                    padding: '0.8rem',
                    borderRadius: '8px',
                    border:
                      `1px solid ${photoFile
                        ? certType.color
                        : 'var(--border-color)'
                      }`,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    alignItems: 'center',
                    justifyContent:
                      'space-between'
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: '0.9rem'
                      }}
                    >
                      <i
                        className="fa-solid fa-camera"
                        style={{
                          marginRight: 6
                        }}
                      ></i>

                      पासपोर्ट साइज फोटो /
                      Passport Photo
                    </div>

                    <div
                      style={{
                        fontSize: '0.75rem',
                        color:
                          'var(--text-muted)'
                      }}
                    >
                      Required (Image Only)
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                      type="file"
                      ref={photoFileRef}
                      accept="image/*"
                      onChange={e => setPhotoFile(e.target.files[0])}
                      style={{ display: 'none' }}
                    />
                    <input
                      type="file"
                      ref={photoCameraRef}
                      accept="image/*"
                      capture="environment"
                      onChange={e => setPhotoFile(e.target.files[0])}
                      style={{ display: 'none' }}
                    />

                    {photoFile ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(34,197,94,0.12)', border: '1px solid #22c55e', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.82rem', color: '#4ade80' }}>
                        <i className="fa-solid fa-circle-check"></i>
                        <span>{photoFile.name.length > 18 ? photoFile.name.substring(0, 15) + '...' : photoFile.name}</span>
                        <button type="button" onClick={() => setPhotoFile(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', marginLeft: 4 }}>&times;</button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => photoFileRef.current?.click()}
                          style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
                        >
                          <i className="fa-solid fa-image" style={{ marginRight: 4 }}></i>
                          Choose Image
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => photoCameraRef.current?.click()}
                          style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem', background: 'rgba(245, 158, 11, 0.15)', borderColor: 'var(--primary-color)', color: 'var(--primary-color)' }}
                        >
                          <i className="fa-solid fa-camera" style={{ marginRight: 4 }}></i>
                          Take Photo
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* ─── Conditional: Salary Slip (only when Occupation = नौकरी) ─── */}
              {formValues.vyavsay === 'नौकरी' && (
                <div
                  style={{
                    marginTop: '0.75rem',
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.10), rgba(245,158,11,0.04))',
                    border: `1px solid ${salarySlipFile ? certType.color : 'rgba(245,158,11,0.5)'}`,
                    borderRadius: '10px',
                    padding: '0.9rem 1rem',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    animation: 'fadeInDown 0.3s ease'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: certType.color, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className="fa-solid fa-file-invoice-dollar"></i>
                      सैलरी स्लिप / Salary Slip
                      <span style={{ fontSize: '0.72rem', background: 'rgba(245,158,11,0.2)', color: certType.color, borderRadius: '4px', padding: '1px 6px', marginLeft: 4 }}>नौकरी के लिए अनिवार्य</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      Required for Occupation: नौकरी (Image or PDF)
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input type="file" ref={salarySlipFileRef} accept="image/*,application/pdf" onChange={e => setSalarySlipFile(e.target.files[0])} style={{ display: 'none' }} />
                    <input type="file" ref={salarySlipCameraRef} accept="image/*" capture="environment" onChange={e => setSalarySlipFile(e.target.files[0])} style={{ display: 'none' }} />

                    {salarySlipFile ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(34,197,94,0.12)', border: '1px solid #22c55e', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.82rem', color: '#4ade80' }}>
                        <i className="fa-solid fa-circle-check"></i>
                        <span>{salarySlipFile.name.length > 18 ? salarySlipFile.name.substring(0, 15) + '...' : salarySlipFile.name}</span>
                        <button type="button" onClick={() => setSalarySlipFile(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', marginLeft: 4 }}>&times;</button>
                      </div>
                    ) : (
                      <>
                        <button type="button" className="btn btn-outline" onClick={() => salarySlipFileRef.current?.click()} style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}>
                          <i className="fa-solid fa-folder-open" style={{ marginRight: 4 }}></i>File / PDF
                        </button>
                        <button type="button" className="btn btn-outline" onClick={() => salarySlipCameraRef.current?.click()} style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem', background: 'rgba(245, 158, 11, 0.15)', borderColor: 'var(--primary-color)', color: 'var(--primary-color)' }}>
                          <i className="fa-solid fa-camera" style={{ marginRight: 4 }}></i>Take Photo
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ─── Mandatory: Age Proof (Voter ID / Birth Certificate / 10th Result) for PAN Card (New / Correction) ─── */}
              {(certType.id === 'new_pan' || certType.id === 'pan_correction' || certType.mandatoryDocType === 'age_proof' || certType.mandatoryDocType === 'marksheet') && (
                <div
                  style={{
                    background: 'var(--bg-tertiary)',
                    padding: '0.8rem',
                    borderRadius: '8px',
                    border: `1px solid ${ageProofFile ? certType.color : 'var(--border-color)'}`,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '0.5rem'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      <i className="fa-solid fa-cake-candles" style={{ marginRight: 6 }}></i>
                      उम्र प्रमाण पत्र / Age Proof
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Voter ID / Birth Certificate / 10th Result (Image or PDF)</div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input type="file" ref={ageProofFileRef} accept="image/*,application/pdf" onChange={e => setAgeProofFile(e.target.files[0])} style={{ display: 'none' }} />
                    <input type="file" ref={ageProofCameraRef} accept="image/*" capture="environment" onChange={e => setAgeProofFile(e.target.files[0])} style={{ display: 'none' }} />

                    {ageProofFile ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(34,197,94,0.12)', border: '1px solid #22c55e', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.82rem', color: '#4ade80' }}>
                        <i className="fa-solid fa-circle-check"></i>
                        <span>{ageProofFile.name.length > 18 ? ageProofFile.name.substring(0, 15) + '...' : ageProofFile.name}</span>
                        <button type="button" onClick={() => setAgeProofFile(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', marginLeft: 4 }}>&times;</button>
                      </div>
                    ) : (
                      <>
                        <button type="button" className="btn btn-outline" onClick={() => ageProofFileRef.current?.click()} style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}>
                          <i className="fa-solid fa-folder-open" style={{ marginRight: 4 }}></i>File / PDF
                        </button>
                        <button type="button" className="btn btn-outline" onClick={() => ageProofCameraRef.current?.click()} style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem', background: 'rgba(245, 158, 11, 0.15)', borderColor: 'var(--primary-color)', color: 'var(--primary-color)' }}>
                          <i className="fa-solid fa-camera" style={{ marginRight: 4 }}></i>Take Photo
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ─── Mandatory: Old PAN Card (for PAN Card Correction) ─── */}
              {(certType.id === 'pan_correction' || certType.mandatoryDocType === 'old_pan') && (
                <div
                  style={{
                    background: 'var(--bg-tertiary)',
                    padding: '0.8rem',
                    borderRadius: '8px',
                    border: `1px solid ${oldPanFile ? certType.color : 'var(--border-color)'}`,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '0.5rem'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      <i className="fa-solid fa-address-card" style={{ marginRight: 6 }}></i>
                      पुराना पैन कार्ड / Old PAN Card
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Required for PAN Correction (Image or PDF)</div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input type="file" ref={oldPanFileRef} accept="image/*,application/pdf" onChange={e => setOldPanFile(e.target.files[0])} style={{ display: 'none' }} />
                    <input type="file" ref={oldPanCameraRef} accept="image/*" capture="environment" onChange={e => setOldPanFile(e.target.files[0])} style={{ display: 'none' }} />

                    {oldPanFile ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(34,197,94,0.12)', border: '1px solid #22c55e', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.82rem', color: '#4ade80' }}>
                        <i className="fa-solid fa-circle-check"></i>
                        <span>{oldPanFile.name.length > 18 ? oldPanFile.name.substring(0, 15) + '...' : oldPanFile.name}</span>
                        <button type="button" onClick={() => setOldPanFile(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', marginLeft: 4 }}>&times;</button>
                      </div>
                    ) : (
                      <>
                        <button type="button" className="btn btn-outline" onClick={() => oldPanFileRef.current?.click()} style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}>
                          <i className="fa-solid fa-folder-open" style={{ marginRight: 4 }}></i>File / PDF
                        </button>
                        <button type="button" className="btn btn-outline" onClick={() => oldPanCameraRef.current?.click()} style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem', background: 'rgba(245, 158, 11, 0.15)', borderColor: 'var(--primary-color)', color: 'var(--primary-color)' }}>
                          <i className="fa-solid fa-camera" style={{ marginRight: 4 }}></i>Take Photo
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Other File Uploads */}
            <div
              className="form-group"
              style={{
                marginTop: '1rem'
              }}
            >
              <label>
                अन्य सहायक दस्तावेज़ /
                Other Supporting Documents

                <span
                  style={{
                    fontSize: '0.78rem',
                    color:
                      'var(--text-muted)',
                    marginLeft: 6
                  }}
                >
                  (Max 10 files)
                </span>
              </label>

              <div
                className={`file-drop-area ${isDragOver
                  ? 'drag-over'
                  : ''
                  }`}
                onDragOver={e => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() =>
                  setIsDragOver(false)
                }
                onDrop={e => {
                  e.preventDefault();
                  setIsDragOver(false);
                  handleFiles(
                    e.dataTransfer.files
                  );
                }}
                onClick={() =>
                  fileInputRef.current?.click()
                }
              >
                <i className="fa-solid fa-cloud-arrow-up file-icon"></i>

                <p>
                  Drag &amp; drop files here, or choose an option:
                </p>

                <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', marginTop: '0.75rem', flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}
                  >
                    <i className="fa-solid fa-folder-open" style={{ marginRight: 4 }}></i>
                    Browse Files / PDF
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => cameraInputRef.current?.click()}
                    style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem', background: 'rgba(245, 158, 11, 0.15)', borderColor: 'var(--primary-color)', color: 'var(--primary-color)' }}
                  >
                    <i className="fa-solid fa-camera" style={{ marginRight: 4 }}></i>
                    Take Camera Photo
                  </button>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  accept="image/*,application/pdf"
                  style={{
                    display: 'none'
                  }}
                  onChange={e =>
                    handleFiles(
                      e.target.files
                    )
                  }
                />
                <input
                  type="file"
                  ref={cameraInputRef}
                  accept="image/*"
                  capture="environment"
                  style={{
                    display: 'none'
                  }}
                  onChange={e =>
                    handleFiles(
                      e.target.files
                    )
                  }
                />
              </div>

              <div className="file-list-preview">
                {selectedFiles.map((f, i) => (
                  <div
                    key={i}
                    className="file-preview-item"
                  >
                    <span className="file-preview-name">
                      <i
                        className={
                          f.type ===
                            'application/pdf'
                            ? 'fa-solid fa-file-pdf'
                            : 'fa-solid fa-file-image'
                        }
                      ></i>

                      {f.name} (
                      {(f.size / 1024).toFixed(1)}
                      KB)
                    </span>

                    <button
                      type="button"
                      className="file-preview-remove"
                      onClick={() =>
                        removeFile(i)
                      }
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={onClose}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
                style={{
                  background:
                    certType.color,
                  borderColor:
                    certType.color,
                  minWidth: '160px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {wakeRetrying ? (
                  <>
                    <i className="fa-solid fa-satellite-dish" style={{ animation: 'pulse-wake 1s infinite' }}></i>
                    {' '}Server jag raha hai... {wakeSecondsLeft}s
                  </>
                ) : isSubmitting ? (
                  <span className="spinner"></span>
                ) : (
                  <>
                    <i className="fa-solid fa-paper-plane"></i>
                    Submit Application
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ─── Original Upload Modal ─── */
function UploadModal({
  service,
  onClose,
  showToast,
  adminToken,
  onSubmitSuccess,
  prefilledName,
  prefilledPhone,
  uploadToken,
  pageView = false
}) {
  const isEmailDoc = (name) => {
    const l = (name || '').toLowerCase().trim();
    return l.includes('email') || l.includes('ईमेल');
  };

  const isThanaDoc = (name) => {
    const l = (name || '').toLowerCase().trim();
    return l.includes('thana') || l.includes('थाना') || l.includes('police station');
  };

  const isEmailRequired = service.email_requirement === 'required' ||
    (service.documents || []).some(d => isEmailDoc(d.document_name) && d.is_required !== false) ||
    (service.requirements || []).some(r => isEmailDoc(typeof r === 'string' ? r : ''));

  const hasEmailInDocs = (service.documents || []).some(d => isEmailDoc(d.document_name)) ||
    (service.requirements || []).some(r => isEmailDoc(typeof r === 'string' ? r : ''));

  const showEmailField = hasEmailInDocs || service.email_requirement === 'required' || service.email_requirement === 'optional' || !service.email_requirement;

  const isThanaRequired = service.hasThana ||
    service.id === 'srv_police_verification' ||
    (service.slug || '').includes('police') ||
    (service.slug || '').includes('verification') ||
    (service.name || '').toLowerCase().includes('police') ||
    (service.name || '').toLowerCase().includes('चरित्र') ||
    (service.title || '').toLowerCase().includes('police') ||
    (service.documents || []).some(d => isThanaDoc(d.document_name)) ||
    (service.requirements || []).some(r => isThanaDoc(typeof r === 'string' ? r : ''));

  const customTextFields = (service.documents || [])
    .filter(d => {
      const name = (d.document_name || '').toLowerCase().trim();
      if (isEmailDoc(name) || isThanaDoc(name)) return false;
      return (
        name.includes('number') ||
        name.includes('नंबर') ||
        name.includes(' no.') ||
        name.includes(' no ') ||
        name.endsWith(' no') ||
        name.includes('संख्या') ||
        name.includes('uan')
      );
    })
    .map(d => ({
      name: d.document_name,
      isRequired: d.is_required !== false,
    }));

  const [customFieldValues, setCustomFieldValues] = useState({});
  const [selectedFiles, setSelectedFiles] =
    useState([]);

  const [isDragOver, setIsDragOver] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [aadharFile, setAadharFile] = useState(null);
  const [aadharBackFile, setAadharBackFile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);

  const [wakeRetrying, setWakeRetrying] = useState(false);
  const [wakeSecondsLeft, setWakeSecondsLeft] = useState(0);

  const fileInputRef = useRef();
  const cameraInputRef = useRef();
  const aadharFileRef = useRef();
  const aadharCameraRef = useRef();
  const aadharBackFileRef = useRef();
  const aadharBackCameraRef = useRef();
  const photoFileRef = useRef();
  const photoCameraRef = useRef();
  const nameRef = useRef();
  const phoneRef = useRef();
  const emailRef = useRef();
  const thanaRef = useRef();
  const notesRef = useRef();

  if (!service) return null;

  const handleFiles = (files) => {
    const valid = Array.from(files).filter(
      f =>
        f.type.startsWith('image/') ||
        f.type === 'application/pdf'
    );

    if (valid.length < files.length) {
      showToast(
        'Some files skipped. Only Images & PDFs supported.',
        'error'
      );
    }

    setSelectedFiles(prev =>
      [...prev, ...valid].slice(0, 10)
    );
  };

  const removeFile = (idx) => {
    setSelectedFiles(prev =>
      prev.filter((_, i) => i !== idx)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const emailVal = emailRef.current ? emailRef.current.value.trim() : '';
    const thanaVal = thanaRef.current ? thanaRef.current.value.trim() : '';

    if (isEmailRequired && !emailVal) {
      showToast(
        'कृपया अपनी ईमेल आईडी दर्ज करें। / Please enter your Email ID.',
        'error'
      );
      return;
    }

    if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      showToast(
        'कृपया मान्य ईमेल आईडी दर्ज करें (उदा. yourname@gmail.com)। / Please enter a valid Email ID.',
        'error'
      );
      return;
    }

    if (isThanaRequired && !thanaVal) {
      showToast(
        'कृपया अपने संबंधित थाने (Police Station) का नाम चुनें या दर्ज करें।',
        'error'
      );
      return;
    }

    // Validate any required custom text fields
    for (const f of customTextFields) {
      if (f.isRequired && (!customFieldValues[f.name] || !customFieldValues[f.name].trim())) {
        showToast(`कृपया ${f.name} दर्ज करें। / Please enter ${f.name}.`, 'error');
        return;
      }
    }

    if (!aadharFile) {
      showToast(
        'कृपया आधार कार्ड Front Side अपलोड करें। / Please upload Aadhar Card Front.',
        'error'
      );
      return;
    }

    if (!aadharBackFile) {
      showToast(
        'कृपया आधार कार्ड Back Side अपलोड करें। / Please upload Aadhar Card Back.',
        'error'
      );
      return;
    }

    if (!photoFile) {
      showToast(
        'कृपया पासपोर्ट साइज फोटो अपलोड करें। / Please upload Passport Photo.',
        'error'
      );
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData();

    formData.append(
      'clientName',
      nameRef.current.value
    );

    formData.append(
      'clientPhone',
      phoneRef.current.value
    );

    if (emailVal) {
      formData.append('clientEmail', emailVal);
      formData.append('email', emailVal);
    }

    formData.append(
      'serviceType',
      service.id ||
      service.slug ||
      service.name
    );

    formData.append(
      'serviceName',
      service.title ||
      service.name
    );

    // Combine email, thana, custom fields, and user notes
    const notesParts = [];
    if (emailVal) notesParts.push(`[Email: ${emailVal}]`);
    if (thanaVal) notesParts.push(`[थाना / Police Station: ${thanaVal}]`);
    Object.entries(customFieldValues).forEach(([k, v]) => {
      if (v && v.trim()) notesParts.push(`[${k}: ${v.trim()}]`);
    });
    const userNotes = notesRef.current?.value ? notesRef.current.value.trim() : '';
    if (userNotes) notesParts.push(userNotes);

    const combinedNotes = notesParts.join(' ');
    formData.append('notes', combinedNotes);

    if (uploadToken) {
      formData.append(
        'upload_token',
        uploadToken
      );
    }

    formData.append('documents', aadharFile);
    formData.append('documents', aadharBackFile);
    formData.append('documents', photoFile);

    selectedFiles.forEach(f =>
      formData.append(
        'documents',
        f
      )
    );

    try {
      const res = await fetchWithWakeUp(
        getApiUrl('/api/submissions'),
        { method: 'POST', body: formData },
        (secondsLeft) => {
          setWakeRetrying(true);
          setWakeSecondsLeft(secondsLeft);
        }
      );

      setWakeRetrying(false);

      const responseText = await res.text();
      let data = {};
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseErr) {
        console.error('Failed to parse response JSON:', parseErr);
      }

      if (!res.ok) {
        throw new Error(data?.message || 'Failed to submit application');
      }

      showToast(
        'Application submitted successfully! Opening your official receipt...',
      );

      onClose();

      if (data?.id) {
        window.open(
          getApiUrl(`/api/submissions/${encodeURIComponent(data.id)}/receipt`),
          '_blank'
        );
      }

      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    } catch (err) {
      setWakeRetrying(false);
      showToast(
        getSubmitErrorMessage(err),
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const customFieldNamesSet = new Set(customTextFields.map(f => f.name));
  const rawList = service.documents && service.documents.length > 0
    ? service.documents.map(d => d.document_name)
    : (service.requirements || []);

  const fileRequirementsList = rawList.filter(r => !isEmailDoc(r) && !isThanaDoc(r) && !customFieldNamesSet.has(r));

  return (
    <div
      className={
        pageView
          ? 'page-view application-page-view'
          : 'modal open'
      }
      onClick={
        pageView
          ? undefined
          : e =>
            e.target === e.currentTarget &&
            onClose()
      }
      style={
        pageView
          ? {
            width: '100%',
            margin: 0,
            padding: 0
          }
          : undefined
      }
    >
      <div
        className="modal-content"
        style={{
          maxWidth: pageView ? 'none' : 680,
          width: '100%',
          margin: pageView
            ? '0 auto'
            : '1rem auto',
          maxHeight: pageView
            ? 'none'
            : 'calc(100vh - 2rem)',
          overflow: 'auto'
        }}
      >
        <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem' }}>
          <h3 style={{ margin: 0 }}>
            <i
              className={
                service.icon ||
                'fa-solid fa-file'
              }
              style={{ marginRight: 8, color: 'var(--primary-color)' }}
            ></i>

            Apply for{' '}
            {service.title ||
              service.name}
          </h3>

          <button
            type="button"
            className="btn btn-outline"
            onClick={onClose}
            style={{
              fontSize: '0.82rem',
              padding: '0.4rem 0.85rem',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              borderColor: 'var(--primary-color)',
              color: 'var(--primary-color)',
              margin: 0
            }}
          >
            <i className="fa-solid fa-arrow-left"></i>
            Back to Services
          </button>
        </div>

        <div className="modal-body">
          {uploadToken && (
            <div
              style={{
                background:
                  'rgba(34,197,94,0.08)',
                border:
                  '1px solid rgba(34,197,94,0.3)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                fontSize: '0.88rem',
                color: '#4ade80'
              }}
            >
              <i
                className="fa-brands fa-whatsapp"
                style={{
                  fontSize: '1.1rem'
                }}
              ></i>

              <span>
                This form was pre-loaded from your
                <strong>
                  {' '}WhatsApp conversation
                </strong>
                . Your service is already selected!
              </span>
            </div>
          )}

          {fileRequirementsList.length > 0 && (
            <div className="requirements-box">
              <h4>
                <i className="fa-solid fa-circle-info"></i>
                Required Documents (आवश्यक दस्तावेज़):
              </h4>

              <ul>
                {fileRequirementsList.map(
                  (r, i) => (
                    <li key={i}>{r}</li>
                  )
                )}
              </ul>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-grid-2">
              <div className="form-group">
                <label>
                  Your Full Name (English) <span style={{ color: 'var(--primary-color)' }}>*</span>
                </label>

                <input
                  type="text"
                  ref={nameRef}
                  placeholder="Enter your full name"
                  required
                  defaultValue={
                    prefilledName || ''
                  }
                />
              </div>

              <div className="form-group">
                <label>
                  Your Mobile Number (WhatsApp Number) <span style={{ color: 'var(--primary-color)' }}>*</span>
                </label>

                <input
                  type="tel"
                  ref={phoneRef}
                  placeholder="Enter your WhatsApp number"
                  required
                  defaultValue={
                    prefilledPhone || ''
                  }
                />
              </div>
            </div>

            {/* Email ID Field */}
            {showEmailField && (
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <i className="fa-solid fa-envelope" style={{ color: 'var(--primary-color)' }}></i>
                  Email ID (ईमेल आईडी)
                  {isEmailRequired ? (
                    <span style={{ color: '#ef4444', marginLeft: 4, fontWeight: 700 }}>* (अनिवार्य / Mandatory)</span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginLeft: 4 }}>(वैकल्पिक / Optional)</span>
                  )}
                </label>
                <input
                  type="email"
                  ref={emailRef}
                  placeholder="yourname@gmail.com"
                  required={isEmailRequired}
                />
              </div>
            )}

            {/* Thana / Police Station Field */}
            {isThanaRequired && (
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <i className="fa-solid fa-building-shield" style={{ color: 'var(--primary-color)' }}></i>
                  थाना / Police Station (Thana)
                  <span style={{ color: '#ef4444', marginLeft: 4, fontWeight: 700 }}>* (अनिवार्य / Mandatory)</span>
                </label>
                <input
                  type="text"
                  ref={thanaRef}
                  placeholder="अपने थाने का नाम लिखें (उदा. कोतवाली, जमानिया, मोहम्मदाबाद, सैदपुर...)"
                  required
                />
              </div>
            )}

            {/* Dynamic Custom Text Input Fields */}
            {customTextFields.map((f, fIdx) => (
              <div className="form-group" key={fIdx}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <i className="fa-solid fa-pen-to-square" style={{ color: 'var(--primary-color)' }}></i>
                  {f.name}
                  {f.isRequired ? (
                    <span style={{ color: '#ef4444', marginLeft: 4, fontWeight: 700 }}>* (अनिवार्य / Mandatory)</span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginLeft: 4 }}>(वैकल्पिक / Optional)</span>
                  )}
                </label>
                <input
                  type="text"
                  placeholder={`Enter ${f.name}`}
                  value={customFieldValues[f.name] || ''}
                  onChange={e => setCustomFieldValues(prev => ({ ...prev, [f.name]: e.target.value }))}
                  required={f.isRequired}
                />
              </div>
            ))}

            <div className="form-group">
              <label>
                Additional Instructions / Details (Notes)
              </label>

              <textarea
                ref={notesRef}
                rows="2"
                placeholder="Example: Need correction in Father's Name, etc. (Optional)"
              ></textarea>
            </div>

            {/* ─── Mandatory: Aadhaar Card + Passport Photo ─── */}
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label>
                अनिवार्य दस्तावेज़ / Mandatory Documents
                <span style={{ color: 'var(--primary-color)' }}> *</span>
              </label>

              <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column', marginTop: '0.5rem' }}>
                {/* Aadhaar Card FRONT */}
                <div style={{ background: 'var(--bg-tertiary)', padding: '0.8rem', borderRadius: '8px', border: `1px solid ${aadharFile ? 'var(--primary-color)' : 'var(--border-color)'}`, display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      <i className="fa-solid fa-address-card" style={{ marginRight: 6 }}></i>
                      आधार कार्ड Front / Aadhar Front
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Required — Front Side (Image or PDF)</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input type="file" ref={aadharFileRef} accept="image/*,application/pdf" onChange={e => setAadharFile(e.target.files[0])} style={{ display: 'none' }} />
                    <input type="file" ref={aadharCameraRef} accept="image/*" capture="environment" onChange={e => setAadharFile(e.target.files[0])} style={{ display: 'none' }} />
                    {aadharFile ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(34,197,94,0.12)', border: '1px solid #22c55e', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.82rem', color: '#4ade80' }}>
                        <i className="fa-solid fa-circle-check"></i>
                        <span>{aadharFile.name.length > 18 ? aadharFile.name.substring(0, 15) + '...' : aadharFile.name}</span>
                        <button type="button" onClick={() => setAadharFile(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', marginLeft: 4 }}>&times;</button>
                      </div>
                    ) : (
                      <>
                        <button type="button" className="btn btn-outline" onClick={() => aadharFileRef.current?.click()} style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}>
                          <i className="fa-solid fa-folder-open" style={{ marginRight: 4 }}></i>File / PDF
                        </button>
                        <button type="button" className="btn btn-outline" onClick={() => aadharCameraRef.current?.click()} style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem', background: 'rgba(245, 158, 11, 0.15)', borderColor: 'var(--primary-color)', color: 'var(--primary-color)' }}>
                          <i className="fa-solid fa-camera" style={{ marginRight: 4 }}></i>Take Photo
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Aadhaar Card BACK */}
                <div style={{ background: 'var(--bg-tertiary)', padding: '0.8rem', borderRadius: '8px', border: `1px solid ${aadharBackFile ? 'var(--primary-color)' : 'var(--border-color)'}`, display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      <i className="fa-solid fa-address-card" style={{ marginRight: 6 }}></i>
                      आधार कार्ड Back / Aadhar Back
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Required — Back Side (Image or PDF)</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input type="file" ref={aadharBackFileRef} accept="image/*,application/pdf" onChange={e => setAadharBackFile(e.target.files[0])} style={{ display: 'none' }} />
                    <input type="file" ref={aadharBackCameraRef} accept="image/*" capture="environment" onChange={e => setAadharBackFile(e.target.files[0])} style={{ display: 'none' }} />
                    {aadharBackFile ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(34,197,94,0.12)', border: '1px solid #22c55e', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.82rem', color: '#4ade80' }}>
                        <i className="fa-solid fa-circle-check"></i>
                        <span>{aadharBackFile.name.length > 18 ? aadharBackFile.name.substring(0, 15) + '...' : aadharBackFile.name}</span>
                        <button type="button" onClick={() => setAadharBackFile(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', marginLeft: 4 }}>&times;</button>
                      </div>
                    ) : (
                      <>
                        <button type="button" className="btn btn-outline" onClick={() => aadharBackFileRef.current?.click()} style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}>
                          <i className="fa-solid fa-folder-open" style={{ marginRight: 4 }}></i>File / PDF
                        </button>
                        <button type="button" className="btn btn-outline" onClick={() => aadharBackCameraRef.current?.click()} style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem', background: 'rgba(245, 158, 11, 0.15)', borderColor: 'var(--primary-color)', color: 'var(--primary-color)' }}>
                          <i className="fa-solid fa-camera" style={{ marginRight: 4 }}></i>Take Photo
                        </button>
                      </>
                    )}
                  </div>
                </div>


                {/* Passport Photo */}
                <div style={{ background: 'var(--bg-tertiary)', padding: '0.8rem', borderRadius: '8px', border: `1px solid ${photoFile ? 'var(--primary-color)' : 'var(--border-color)'}`, display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      <i className="fa-solid fa-camera" style={{ marginRight: 6 }}></i>
                      पासपोर्ट साइज फोटो / Passport Photo
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Required (Image Only)</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input type="file" ref={photoFileRef} accept="image/*" onChange={e => setPhotoFile(e.target.files[0])} style={{ display: 'none' }} />
                    <input type="file" ref={photoCameraRef} accept="image/*" capture="environment" onChange={e => setPhotoFile(e.target.files[0])} style={{ display: 'none' }} />
                    {photoFile ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(34,197,94,0.12)', border: '1px solid #22c55e', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.82rem', color: '#4ade80' }}>
                        <i className="fa-solid fa-circle-check"></i>
                        <span>{photoFile.name.length > 18 ? photoFile.name.substring(0, 15) + '...' : photoFile.name}</span>
                        <button type="button" onClick={() => setPhotoFile(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', marginLeft: 4 }}>&times;</button>
                      </div>
                    ) : (
                      <>
                        <button type="button" className="btn btn-outline" onClick={() => photoFileRef.current?.click()} style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}>
                          <i className="fa-solid fa-image" style={{ marginRight: 4 }}></i>Choose Image
                        </button>
                        <button type="button" className="btn btn-outline" onClick={() => photoCameraRef.current?.click()} style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem', background: 'rgba(245, 158, 11, 0.15)', borderColor: 'var(--primary-color)', color: 'var(--primary-color)' }}>
                          <i className="fa-solid fa-camera" style={{ marginRight: 4 }}></i>Take Photo
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>
                Select &amp; Upload Documents
                (Max 10 files, any image size allowed - auto compressed)
              </label>

              <div
                className={`file-drop-area ${isDragOver
                  ? 'drag-over'
                  : ''
                  }`}
                onDragOver={e => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() =>
                  setIsDragOver(false)
                }
                onDrop={e => {
                  e.preventDefault();
                  setIsDragOver(false);
                  handleFiles(
                    e.dataTransfer.files
                  );
                }}
                onClick={() =>
                  fileInputRef.current?.click()
                }
              >
                <i className="fa-solid fa-cloud-arrow-up file-icon"></i>

                <p>
                  Drag &amp; drop files here, or choose an option:
                </p>

                <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', marginTop: '0.75rem', flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}
                  >
                    <i className="fa-solid fa-folder-open" style={{ marginRight: 4 }}></i>
                    Browse Files / PDF
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => cameraInputRef.current?.click()}
                    style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem', background: 'rgba(245, 158, 11, 0.15)', borderColor: 'var(--primary-color)', color: 'var(--primary-color)' }}
                  >
                    <i className="fa-solid fa-camera" style={{ marginRight: 4 }}></i>
                    Take Camera Photo
                  </button>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  accept="image/*,application/pdf"
                  style={{
                    display: 'none'
                  }}
                  onChange={e =>
                    handleFiles(
                      e.target.files
                    )
                  }
                />
                <input
                  type="file"
                  ref={cameraInputRef}
                  accept="image/*"
                  capture="environment"
                  style={{
                    display: 'none'
                  }}
                  onChange={e =>
                    handleFiles(
                      e.target.files
                    )
                  }
                />
              </div>

              <div className="file-list-preview">
                {selectedFiles.map(
                  (f, i) => (
                    <div
                      key={i}
                      className="file-preview-item"
                    >
                      <span className="file-preview-name">
                        <i
                          className={
                            f.type ===
                              'application/pdf'
                              ? 'fa-solid fa-file-pdf'
                              : 'fa-solid fa-file-image'
                          }
                        ></i>

                        {f.name} (
                        {(f.size / 1024).toFixed(1)}
                        KB)
                      </span>

                      <button
                        type="button"
                        className="file-preview-remove"
                        onClick={() =>
                          removeFile(i)
                        }
                      >
                        &times;
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={onClose}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
                style={{ minWidth: '160px' }}
              >
                {wakeRetrying ? (
                  <>
                    <i className="fa-solid fa-satellite-dish" style={{ animation: 'pulse-wake 1s infinite' }}></i>
                    {' '}Server jag raha hai... {wakeSecondsLeft}s
                  </>
                ) : isSubmitting ? (
                  <span className="spinner"></span>
                ) : (
                  <>
                    <i className="fa-solid fa-paper-plane"></i>
                    Submit Application
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ─── Application page layout overrides ─── */

const applicationPageStyles = `
  .application-page-view {
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  .application-page-view .modal-content {
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
    min-height: auto !important;
  }

  .application-page-view .modal-header {
    margin-top: 0 !important;
  }

  @media (max-width: 900px) {
    .application-form-wrapper {
      width: 100% !important;
    }
  }
`;

/* ─── Main CustomerPortal ─── */

export default function CustomerPortal({
  shopSettings,
  showToast,
  adminToken,
  onSubmitSuccess
}) {
  const [modalService, setModalService] =
    useState(null);

  const [uploadToken, setUploadToken] =
    useState(null);

  const [prefilledName, setPrefilledName] =
    useState('');

  const [prefilledPhone, setPrefilledPhone] =
    useState('');

  // For merged certificate flow
  const [showCertPicker, setShowCertPicker] =
    useState(false);

  const [selectedCertType, setSelectedCertType] =
    useState(null);

  const [openAsPage, setOpenAsPage] = useState(false);
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [showCertPreview, setShowCertPreview] = useState(false);

  // Combine hardcoded SERVICES with dynamic services from API
  const [activeServices, setActiveServices] = useState(Object.values(SERVICES));

  const fetchDynamicServices = useCallback(() => {
    fetch('/api/services')
      .then(r => r.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          const coreServicesMap = { ...SERVICES };
          const dynamicList = [];

          data.data.forEach(svc => {
            const svcSlug = (svc.slug || '').toLowerCase().trim();
            const svcName = (svc.name || '').toLowerCase().trim();
            const docsList = (svc.documents || []).filter(d => d.is_required !== false).map(d => d.document_name);
            const reqs = docsList.length > 0 ? docsList : (svc.requirements || []);

            // Check if matches srv_pancard
            if (svcSlug === 'srv_pancard' || svcSlug.includes('pan') || svcName.includes('pan card') || svcName.includes('पैन कार्ड')) {
              coreServicesMap.srv_pancard = {
                ...coreServicesMap.srv_pancard,
                title: svc.name || coreServicesMap.srv_pancard.title,
                hindiTitle: svc.hindi_title || coreServicesMap.srv_pancard.hindiTitle,
                description: svc.description || coreServicesMap.srv_pancard.description,
                icon: svc.icon || coreServicesMap.srv_pancard.icon,
                display_order: svc.display_order ?? coreServicesMap.srv_pancard.display_order,
                email_requirement: svc.email_requirement || coreServicesMap.srv_pancard.email_requirement,
                requirements: reqs.length > 0 ? reqs : coreServicesMap.srv_pancard.requirements,
                documents: svc.documents || []
              };
            } else if (svcSlug === 'srv_certificates' || svcSlug.includes('certificate') || svcName.includes('aay') || svcName.includes('आय') || svcName.includes('जाति')) {
              coreServicesMap.srv_certificates = {
                ...coreServicesMap.srv_certificates,
                title: svc.name || coreServicesMap.srv_certificates.title,
                hindiTitle: svc.hindi_title || coreServicesMap.srv_certificates.hindiTitle,
                description: svc.description || coreServicesMap.srv_certificates.description,
                icon: svc.icon || coreServicesMap.srv_certificates.icon,
                display_order: svc.display_order ?? coreServicesMap.srv_certificates.display_order,
                email_requirement: svc.email_requirement || coreServicesMap.srv_certificates.email_requirement,
                requirements: reqs.length > 0 ? reqs : coreServicesMap.srv_certificates.requirements,
                documents: svc.documents || []
              };
            } else if (svcSlug === 'srv_ration' || svcSlug.includes('ration') || svcName.includes('ration') || svcName.includes('राशन')) {
              coreServicesMap.srv_ration = {
                ...coreServicesMap.srv_ration,
                title: svc.name || coreServicesMap.srv_ration.title,
                hindiTitle: svc.hindi_title || coreServicesMap.srv_ration.hindiTitle,
                description: svc.description || coreServicesMap.srv_ration.description,
                icon: svc.icon || coreServicesMap.srv_ration.icon,
                display_order: svc.display_order ?? coreServicesMap.srv_ration.display_order,
                email_requirement: svc.email_requirement || coreServicesMap.srv_ration.email_requirement,
                requirements: reqs.length > 0 ? reqs : coreServicesMap.srv_ration.requirements,
                documents: svc.documents || []
              };
            } else if (svcSlug === 'srv_police_verification' || svcSlug.includes('police') || svcSlug.includes('verification') || svcName.includes('police') || svcName.includes('पुलिस') || svcName.includes('चरित्र')) {
              coreServicesMap.srv_police_verification = {
                ...(coreServicesMap.srv_police_verification || {}),
                id: 'srv_police_verification',
                title: svc.name || coreServicesMap.srv_police_verification?.title || 'Police Verification',
                hindiTitle: svc.hindi_title || coreServicesMap.srv_police_verification?.hindiTitle || 'पुलिस वेरिफिकेशन (चरित्र प्रमाण पत्र)',
                description: svc.description || coreServicesMap.srv_police_verification?.description,
                icon: svc.icon || coreServicesMap.srv_police_verification?.icon || 'fa-solid fa-building-shield',
                display_order: svc.display_order ?? coreServicesMap.srv_police_verification?.display_order ?? 4,
                hasThana: true,
                email_requirement: svc.email_requirement || 'optional',
                requirements: reqs.length > 0 ? reqs : (coreServicesMap.srv_police_verification?.requirements || []),
                documents: svc.documents || []
              };
            } else if (svcSlug === 'srv_driving' || svcSlug.includes('driving') || svcName.includes('driving') || svcName.includes('ड्राइविंग')) {
              coreServicesMap.srv_driving = {
                ...coreServicesMap.srv_driving,
                title: svc.name || coreServicesMap.srv_driving.title,
                hindiTitle: svc.hindi_title || coreServicesMap.srv_driving.hindiTitle,
                description: svc.description || coreServicesMap.srv_driving.description,
                icon: svc.icon || coreServicesMap.srv_driving.icon,
                display_order: svc.display_order ?? coreServicesMap.srv_driving.display_order,
                email_requirement: svc.email_requirement || coreServicesMap.srv_driving.email_requirement,
                requirements: reqs.length > 0 ? reqs : coreServicesMap.srv_driving.requirements,
                documents: svc.documents || []
              };
            } else if (svcSlug === 'srv_voterid' || svcSlug.includes('voter') || svcName.includes('voter') || svcName.includes('वोटर')) {
              coreServicesMap.srv_voterid = {
                ...coreServicesMap.srv_voterid,
                title: svc.name || coreServicesMap.srv_voterid.title,
                hindiTitle: svc.hindi_title || coreServicesMap.srv_voterid.hindiTitle,
                description: svc.description || coreServicesMap.srv_voterid.description,
                icon: svc.icon || coreServicesMap.srv_voterid.icon,
                display_order: svc.display_order ?? coreServicesMap.srv_voterid.display_order,
                email_requirement: svc.email_requirement || coreServicesMap.srv_voterid.email_requirement,
                requirements: reqs.length > 0 ? reqs : coreServicesMap.srv_voterid.requirements,
                documents: svc.documents || []
              };
            } else if (svcSlug === 'srv_ayushman' || svcSlug.includes('ayushman') || svcName.includes('ayushman') || svcName.includes('आयुष्मान')) {
              coreServicesMap.srv_ayushman = {
                ...coreServicesMap.srv_ayushman,
                title: svc.name || coreServicesMap.srv_ayushman.title,
                hindiTitle: svc.hindi_title || coreServicesMap.srv_ayushman.hindiTitle,
                description: svc.description || coreServicesMap.srv_ayushman.description,
                icon: svc.icon || coreServicesMap.srv_ayushman.icon,
                display_order: svc.display_order ?? coreServicesMap.srv_ayushman.display_order,
                email_requirement: svc.email_requirement || coreServicesMap.srv_ayushman.email_requirement,
                requirements: reqs.length > 0 ? reqs : coreServicesMap.srv_ayushman.requirements,
                documents: svc.documents || []
              };
            } else if (svcSlug === 'srv_passport' || svcSlug.includes('passport') || svcName.includes('passport') || svcName.includes('पासपोर्ट')) {
              coreServicesMap.srv_passport = {
                ...coreServicesMap.srv_passport,
                title: svc.name || coreServicesMap.srv_passport.title,
                hindiTitle: svc.hindi_title || coreServicesMap.srv_passport.hindiTitle,
                description: svc.description || coreServicesMap.srv_passport.description,
                icon: svc.icon || coreServicesMap.srv_passport.icon,
                display_order: svc.display_order ?? coreServicesMap.srv_passport.display_order,
                email_requirement: svc.email_requirement || coreServicesMap.srv_passport.email_requirement,
                requirements: reqs.length > 0 ? reqs : coreServicesMap.srv_passport.requirements,
                documents: svc.documents || []
              };
            } else if (svcSlug === 'srv_pf' || svcSlug.includes('pf') || svcName.includes('pf') || svcName.includes('पीएफ')) {
              coreServicesMap.srv_pf = {
                ...coreServicesMap.srv_pf,
                title: svc.name || coreServicesMap.srv_pf.title,
                hindiTitle: svc.hindi_title || coreServicesMap.srv_pf.hindiTitle,
                description: svc.description || coreServicesMap.srv_pf.description,
                icon: svc.icon || coreServicesMap.srv_pf.icon,
                display_order: svc.display_order ?? coreServicesMap.srv_pf.display_order,
                email_requirement: svc.email_requirement || coreServicesMap.srv_pf.email_requirement,
                requirements: reqs.length > 0 ? reqs : coreServicesMap.srv_pf.requirements,
                documents: svc.documents || []
              };
            } else {
              // Custom / Dynamic service from Admin
              dynamicList.push({
                id: svc.id || svc.slug,
                slug: svc.slug || `svc-${svc.id}`,
                title: svc.name || svc.title,
                name: svc.name || svc.title,
                icon: svc.icon || 'fa-solid fa-file-shield',
                hindiTitle: svc.hindi_title || svc.hindiTitle || '',
                description: svc.description || '',
                email_requirement: svc.email_requirement || 'optional',
                requirements: reqs,
                documents: svc.documents || [],
                display_order: svc.display_order ?? 99
              });
            }
          });

          const combined = [
            ...Object.values(coreServicesMap),
            ...dynamicList
          ];

          // Sort strictly by display_order
          combined.sort((a, b) => (a.display_order ?? 99) - (b.display_order ?? 99));

          setActiveServices(combined);
        }
      })
      .catch(err =>
        console.error('[CustomerPortal] Error fetching dynamic services:', err)
      );
  }, []);

  useEffect(() => {
    fetchDynamicServices();

    const handleUpdate = () => fetchDynamicServices();
    window.addEventListener('services_updated', handleUpdate);

    let bc;
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel('services_channel');
      bc.onmessage = () => fetchDynamicServices();
    }

    return () => {
      window.removeEventListener('services_updated', handleUpdate);
      if (bc) bc.close();
    };
  }, [fetchDynamicServices]);

  useEffect(() => {
    if (
      typeof document !== 'undefined' &&
      !document.getElementById(
        'application-page-layout-styles'
      )
    ) {
      const style =
        document.createElement('style');

      style.id =
        'application-page-layout-styles';

      style.textContent =
        applicationPageStyles;

      document.head.appendChild(style);
    }

    fetchDynamicServices();

    // FUTURE-PROOF: Reduced from 5s to 30s — same fix as BotSimulator
    const interval = setInterval(
      fetchDynamicServices,
      30000
    );

    const handleServicesUpdated =
      () => fetchDynamicServices();

    window.addEventListener(
      'services_updated',
      handleServicesUpdated
    );

    let bc;

    if (
      typeof BroadcastChannel !==
      'undefined'
    ) {
      bc = new BroadcastChannel(
        'services_channel'
      );

      bc.onmessage = () =>
        fetchDynamicServices();
    }

    return () => {
      clearInterval(interval);

      window.removeEventListener(
        'services_updated',
        handleServicesUpdated
      );

      if (bc) {
        bc.close();
      }
    };
  }, [fetchDynamicServices]);

  const cleanPhone = String(
    shopSettings?.shopPhone ||
    '918707845206'
  ).replace(/[^0-9]/g, '');

  // Check for ?upload=TOKEN in URL
  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const token =
      params.get('upload');

    if (!token) return;

    setUploadToken(token);

    fetch(
      `/api/upload-session/${token}`
    )
      .then(r => r.json())
      .then(data => {
        if (!data.success) {
          showToast(
            data.message ||
            'This upload link is invalid or has expired.',
            'error'
          );

          return;
        }

        const session = data.data;
        const svc = session.service;
        if (!svc) return;

        const svcNameUpper = (svc.name || '').toUpperCase();
        const svcId = (svc.id || svc.slug || '').toLowerCase();

        const isPanGroup =
          svcId === 'srv_pancard' ||
          svcId.includes('pan') ||
          svcNameUpper.includes('PAN') ||
          svcNameUpper.includes('पैन');

        const isCertGroup =
          svcId === 'srv_certificates' ||
          svcId.includes('aay') ||
          svcId.includes('jaati') ||
          svcId.includes('niwas') ||
          svcNameUpper.includes('AAY') ||
          svcNameUpper.includes('JAATI') ||
          svcNameUpper.includes('NIWAS') ||
          svcNameUpper.includes('आय') ||
          svcNameUpper.includes('जाति') ||
          svcNameUpper.includes('निवास');

        setPrefilledName(session.customer_name || '');
        setPrefilledPhone(session.whatsapp_number || '');
        setOpenAsPage(true);

        if (isCertGroup) {
          setModalService(SERVICES.srv_certificates);
          setShowCertPicker(true);
          setSelectedCertType(null);
        } else if (isPanGroup) {
          setModalService(SERVICES.srv_pancard);
          setShowCertPicker(true);
          setSelectedCertType(null);
        } else {
          const builtService = {
            id: svc.id,
            slug: svc.slug,
            title: svc.name,
            name: svc.name,
            icon: svc.icon || 'fa-solid fa-file',
            hindiTitle: svc.hindi_title || '',
            description: svc.description || '',
            requirements: (svc.documents || []).filter(d => d.is_required).map(d => d.document_name),
            documents: svc.documents || []
          };

          setModalService(builtService);
          setShowCertPicker(false);
          setSelectedCertType(null);
        }

        const cleanUrl =
          window.location.pathname +
          window.location.hash;

        window.history.replaceState(
          {},
          '',
          cleanUrl
        );
      })
      .catch(err => {
        console.error(
          '[Upload Token] Error:',
          err
        );

        showToast(
          'Failed to load your pre-filled application. Please select a service manually.',
          'error'
        );
      });
  }, []);

  const handleApply = (serviceId) => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });

    setUploadToken(null);
    setPrefilledName('');
    setPrefilledPhone('');

    const svc =
      activeServices.find(
        s => s.id === serviceId
      );

    setOpenAsPage(true);

    if (svc?.isMerged) {
      setModalService(svc);
      setShowCertPicker(true);
      setSelectedCertType(null);
    } else {
      setModalService(svc);
      setShowCertPicker(false);
      setSelectedCertType(null);
    }
  };

  const handleCertSelect = (
    certType
  ) => {
    setShowCertPicker(false);
    setSelectedCertType(certType);
  };

  const handleClose = () => {
    setModalService(null);
    setUploadToken(null);
    setShowCertPicker(false);
    setSelectedCertType(null);
    setOpenAsPage(false);
  };

  return (
    <section className="tab-content active">
      {openAsPage ? (
        <div
          className="application-page"
          style={{
            width: '100%',
            padding: '0',
            margin: 0,
            boxSizing: 'border-box'
          }}
        >
          {/* FORM WRAPPER */}

          <div
            className="application-form-wrapper"
            style={{
              /*
               * FORM WIDTH
               * 90% of screen
               */
              width: '100%',

              /*
               * Maximum width
               */
              maxWidth:
                '1550px',

              /*
               * CENTER
               */
              margin:
                '0 auto',

              padding: 0,

              boxSizing:
                'border-box',

            }}
          >
            {showCertPicker &&
              modalService?.isMerged &&
              !selectedCertType && (
                <CertificatePickerModal
                  service={modalService}
                  onSelect={
                    handleCertSelect
                  }
                  onClose={
                    handleClose
                  }
                  pageView={
                    true
                  }
                />
              )}

            {selectedCertType &&
              modalService && (
                <CertificateFormModal
                  certType={
                    selectedCertType
                  }
                  service={
                    modalService
                  }
                  onClose={
                    handleClose
                  }
                  showToast={
                    showToast
                  }
                  onSubmitSuccess={
                    onSubmitSuccess
                  }
                  prefilledName={
                    prefilledName
                  }
                  prefilledPhone={
                    prefilledPhone
                  }
                  uploadToken={
                    uploadToken
                  }
                  pageView={
                    true
                  }
                />
              )}

            {modalService &&
              !modalService.isMerged &&
              !selectedCertType && (
                <UploadModal
                  service={
                    modalService
                  }
                  onClose={
                    handleClose
                  }
                  showToast={
                    showToast
                  }
                  adminToken={
                    adminToken
                  }
                  onSubmitSuccess={
                    onSubmitSuccess
                  }
                  prefilledName={
                    prefilledName
                  }
                  prefilledPhone={
                    prefilledPhone
                  }
                  uploadToken={
                    uploadToken
                  }
                  pageView={
                    true
                  }
                />
              )}
          </div>
        </div>
      ) : (
        <>
          {/* HERO */}

          <div className="hero-section">
            <div className="hero-badge">
              <span className="pulse-dot"></span>
              <span>
                Portal Active &amp; Online
              </span>
            </div>

            <h1>
              Welcome to{' '}
              <span className="shop-title-text">
                {shopSettings?.shopName ||
                  'Maa Durga Online Center'}
              </span>
            </h1>

            <p className="hero-subtitle">
              CSC &amp; Online Digital Services
              Portal. Upload your documents
              directly, and we will process your
              applications instantly!
            </p>

            <div className="quick-contact-bar">
              <span>
                <i className="fa-solid fa-location-dot"></i>{' '}
                <a
                  href="https://maps.app.goo.gl/4x7veXD2rUK5ZsP57"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color:
                      'var(--text-primary)',
                    textDecoration:
                      'none'
                  }}
                >
                  {shopSettings?.shopAddress ||
                    'Bindwaliya Ghazipur, UP'}
                </a>
              </span>

              <div className="contact-divider"></div>

              <span>
                <i className="fa-solid fa-phone"></i>{' '}
                <a
                  href={`https://wa.me/${cleanPhone}`}
                >
                  +{cleanPhone}
                </a>
              </span>

              <div className="contact-divider"></div>

              <span>
                <i className="fa-solid fa-clock"></i>{' '}
                <span
                  style={{
                    color:
                      'var(--text-primary)'
                  }}
                >
                  {shopSettings?.shopTimings ||
                    '24/7'}
                </span>
              </span>
            </div>

            <div className="hero-trust-row">
              <div className="trust-badge">
                <i className="fa-solid fa-shield-halved"></i>
                Secure Upload
              </div>

              <div className="trust-badge">
                <i className="fa-solid fa-bolt"></i>
                Fast Processing
              </div>

              <div className="trust-badge">
                <i className="fa-solid fa-headset"></i>
                24/7 Support
              </div>

              <div className="trust-badge">
                <i className="fa-solid fa-cloud"></i>
                Cloud Storage
              </div>
            </div>
          </div>

          {/* SERVICES */}

          <div className="services-container">
            <div className="section-header">
              <h2 className="section-title">
                <i className="fa-solid fa-briefcase"></i>
                Our Digital Services
              </h2>

              <p className="section-subtitle">
                Select a service below to view required documents and submit them online.
              </p>
            </div>

            {/* LIVE SEARCH FILTER BAR */}
            <div style={{ maxWidth: '540px', margin: '1rem auto 2.2rem auto', position: 'relative' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '1.1rem', color: 'var(--primary-color)', fontSize: '1.05rem', pointerEvents: 'none' }}></i>
                <input
                  type="text"
                  placeholder="खोजें / Search Service (e.g. PAN Card, Voter ID, आय, जाति, निवास)..."
                  value={serviceSearchQuery}
                  onChange={e => setServiceSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.85rem 2.8rem 0.85rem 2.8rem',
                    borderRadius: '50px',
                    border: '2px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.92rem',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                    outline: 'none',
                    transition: 'all 0.25s ease'
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--primary-color)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
                />
                {serviceSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setServiceSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: '1rem',
                      background: 'rgba(255,255,255,0.1)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Clear Search"
                  >
                    &times;
                  </button>
                )}
              </div>
            </div>

            {(() => {
              const filteredServices = activeServices.filter(svc => {
                if (!serviceSearchQuery.trim()) return true;
                const q = serviceSearchQuery.toLowerCase().trim();
                const title = (svc.title || svc.name || '').toLowerCase();
                const hindi = (svc.hindiTitle || svc.hindi_title || '').toLowerCase();
                const desc = (svc.description || '').toLowerCase();
                const reqs = (svc.requirements || []).join(' ').toLowerCase();
                return title.includes(q) || hindi.includes(q) || desc.includes(q) || reqs.includes(q);
              });

              if (filteredServices.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px dashed var(--border-color)', margin: '1rem 0' }}>
                    <i className="fa-solid fa-magnifying-glass" style={{ fontSize: '2.5rem', color: 'var(--text-muted)', marginBottom: '1rem' }}></i>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>कोई सर्विस नहीं मिली / No Service Found</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                      "{serviceSearchQuery}" नाम की कोई सर्विस नहीं मिली। कृपया "PAN", "Voter", या "Certificate" टाइप करके खोजें।
                    </p>
                    <button className="btn btn-outline" onClick={() => setServiceSearchQuery('')}>
                      <i className="fa-solid fa-xmark" style={{ marginRight: 6 }}></i> Clear Search
                    </button>
                  </div>
                );
              }

              return (
                <div className="services-grid">
                  {filteredServices.map(service => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      onApply={handleApply}
                    />
                  ))}
                </div>
              );
            })()}
          </div>

          {/* NORMAL MODALS */}

          {showCertPicker && (
            <CertificatePickerModal
              service={modalService}
              onSelect={
                handleCertSelect
              }
              onClose={
                handleClose
              }
            />
          )}

          {selectedCertType &&
            modalService && (
              <CertificateFormModal
                certType={
                  selectedCertType
                }
                service={
                  modalService
                }
                onClose={
                  handleClose
                }
                showToast={
                  showToast
                }
                onSubmitSuccess={
                  onSubmitSuccess
                }
                prefilledName={
                  prefilledName
                }
                prefilledPhone={
                  prefilledPhone
                }
                uploadToken={
                  uploadToken
                }
              />
            )}

          {modalService &&
            !modalService.isMerged &&
            !selectedCertType && (
              <UploadModal
                service={
                  modalService
                }
                onClose={
                  handleClose
                }
                showToast={
                  showToast
                }
                adminToken={
                  adminToken
                }
                onSubmitSuccess={
                  onSubmitSuccess
                }
                prefilledName={
                  prefilledName
                }
                prefilledPhone={
                  prefilledPhone
                }
                uploadToken={
                  uploadToken
                }
              />
            )}
        </>
      )}
    </section>
  );
}