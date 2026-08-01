import { useState, useRef, useEffect, useCallback } from 'react';
import { SERVICES, CERTIFICATE_TYPES, OBC_SUBCASTES } from '../../constants/services';

const API_BASE = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
  ? 'http://localhost:3000'
  : '';

const getApiUrl = (path) => `${API_BASE}${path}`;

const getSubmitErrorMessage = (err) => {
  if (!err || !err.message) return 'Server error occurred. Please try again.';
  const lower = err.message.toLowerCase();
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('network request failed')) {
    return 'Server unavailable. Please start the backend or check your connection.';
  }
  return err.message;
};

/* ─── Small helper ─── */
function ServiceCard({ service, onApply }) {
  const isMerged = service.isMerged;

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
          {isMerged ? '3-in-1 Service' : 'Online Process'}
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
          {Object.values(CERTIFICATE_TYPES).map(ct => (
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
  onSelect,
  onClose,
  pageView = false
}) {
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
        <div className="modal-header">
          <h3>
            <i className="fa-solid fa-file-shield"></i>
            प्रमाण पत्र चुनें / Choose Certificate
          </h3>

          <button
            className="modal-close"
            onClick={onClose}
          >
            &times;
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
            आप किस प्रमाण पत्र के लिए आवेदन करना चाहते हैं?
            / Which certificate do you want to apply for?
          </p>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem'
            }}
          >
            {Object.values(CERTIFICATE_TYPES).map(ct => (
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
  const [photoFile, setPhotoFile] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef();

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
        'कृपया आधार कार्ड अपलोड करें। / Please upload Aadhar Card.',
        'error'
      );
      return;
    }

    if (!photoFile) {
      showToast(
        'कृपया फोटो अपलोड करें। / Please upload Passport Photo.',
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

    if (photoFile) {
      formData.append('documents', photoFile);
    }

    selectedFiles.forEach(f => {
      formData.append('documents', f);
    });

    try {
      const res = await fetch(
        getApiUrl('/api/submissions'),
        {
          method: 'POST',
          body: formData
        }
      );

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
              `3px solid ${certType.color}`
          }}
        >
          <h3
            style={{
              color: certType.color
            }}
          >
            <i className={certType.icon}></i>
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
            className="modal-close"
            onClick={onClose}
          >
            &times;
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
                <div
                  style={{
                    background:
                      'var(--bg-tertiary)',
                    padding: '0.8rem',
                    borderRadius: '8px',
                    border:
                      `1px solid ${aadharFile
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
                        className="fa-solid fa-address-card"
                        style={{
                          marginRight: 6
                        }}
                      ></i>

                      आधार कार्ड / Aadhar Card
                    </div>

                    <div
                      style={{
                        fontSize: '0.75rem',
                        color:
                          'var(--text-muted)'
                      }}
                    >
                      Required (Image or PDF)
                    </div>
                  </div>

                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={e =>
                      setAadharFile(
                        e.target.files[0]
                      )
                    }
                    style={{
                      maxWidth: '100%',
                      fontSize: '0.8rem'
                    }}
                  />
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

                  <input
                    type="file"
                    accept="image/*"
                    onChange={e =>
                      setPhotoFile(
                        e.target.files[0]
                      )
                    }
                    style={{
                      maxWidth: '100%',
                      fontSize: '0.8rem'
                    }}
                  />
                </div>
              </div>
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
                  Drag &amp; drop files here, or{' '}
                  <span className="file-browse">
                    browse files
                  </span>
                </p>

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
                    certType.color
                }}
              >
                {isSubmitting ? (
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
  const [selectedFiles, setSelectedFiles] =
    useState([]);

  const [isDragOver, setIsDragOver] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const fileInputRef = useRef();
  const nameRef = useRef();
  const phoneRef = useRef();
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

    if (selectedFiles.length === 0) {
      showToast(
        'Please upload at least one document.',
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

    formData.append(
      'notes',
      notesRef.current.value
    );

    if (uploadToken) {
      formData.append(
        'upload_token',
        uploadToken
      );
    }

    selectedFiles.forEach(f =>
      formData.append(
        'documents',
        f
      )
    );

    try {
      const res = await fetch(
        getApiUrl('/api/submissions'),
        {
          method: 'POST',
          body: formData
        }
      );

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
        'Application submitted successfully! Opening your official receipt...'
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
      showToast(
        getSubmitErrorMessage(err),
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const requirementsList =
    service.requirements ||
    (service.documents || []).map(
      d => d.document_name
    );

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
        <div className="modal-header">
          <h3>
            <i
              className={
                service.icon ||
                'fa-solid fa-file'
              }
            ></i>

            Apply for{' '}
            {service.title ||
              service.name}
          </h3>

          <button
            className="modal-close"
            onClick={onClose}
          >
            &times;
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

          <div className="requirements-box">
            <h4>
              <i className="fa-solid fa-circle-info"></i>
              Required Documents:
            </h4>

            <ul>
              {requirementsList.map(
                (r, i) => (
                  <li key={i}>{r}</li>
                )
              )}
            </ul>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid-2">
              <div className="form-group">
                <label>
                  Your Full Name (English)
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
                  Your Mobile Number (WhatsApp Number)
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
                  Drag &amp; drop files here, or{' '}
                  <span className="file-browse">
                    browse files
                  </span>
                </p>

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
              >
                {isSubmitting ? (
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

  const [openAsPage, setOpenAsPage] =
    useState(false);

  // Combine hardcoded SERVICES with dynamic services from API
  const [activeServices, setActiveServices] =
    useState(Object.values(SERVICES));

  const fetchDynamicServices = useCallback(() => {
    fetch('/api/services')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data) {
          const hardcodedSlugs = [
            'srv_certificates',
            'srv_pancard',
            'srv_voterid',
            'certificates',
            'pancard',
            'voterid',
            'pan',
            'voter',
            'aay',
            'jaati',
            'niwas',
            'all',
            'income',
            'caste',
            'domicile'
          ];

          const hardcodedTitles =
            Object.values(SERVICES).map(
              s =>
                (s.title || '')
                  .toLowerCase()
                  .trim()
            );

          const newDynamic =
            data.data
              .map(svc => ({
                id:
                  svc.id ||
                  svc.slug,

                title:
                  svc.name ||
                  svc.title,

                name:
                  svc.name ||
                  svc.title,

                icon:
                  svc.icon ||
                  'fa-solid fa-file',

                hindiTitle:
                  svc.hindi_title ||
                  svc.hindiTitle ||
                  '',

                description:
                  svc.description ||
                  '',

                requirements:
                  svc.requirements ||
                  (
                    svc.documents ||
                    []
                  )
                    .filter(
                      d =>
                        d.is_required
                    )
                    .map(
                      d =>
                        d.document_name
                    ),

                slug:
                  (
                    svc.slug ||
                    ''
                  )
                    .toLowerCase()
                    .trim()
              }))
              .filter(svc => {
                const svcSlug =
                  (
                    svc.slug ||
                    svc.id ||
                    ''
                  )
                    .toLowerCase()
                    .trim();

                const svcTitle =
                  (
                    svc.title ||
                    ''
                  )
                    .toLowerCase()
                    .trim();

                if (
                  hardcodedSlugs.includes(
                    svcSlug
                  )
                ) {
                  return false;
                }

                if (
                  hardcodedTitles.some(
                    ht =>
                      ht === svcTitle ||
                      svcTitle.includes(ht) ||
                      ht.includes(svcTitle)
                  )
                ) {
                  return false;
                }

                if (
                  svcTitle.includes('income') ||
                  svcTitle.includes('caste') ||
                  svcTitle.includes('domicile') ||
                  svcTitle.includes('आय') ||
                  svcTitle.includes('जाति') ||
                  svcTitle.includes('निवास') ||
                  svcTitle.includes('pan') ||
                  svcTitle.includes('voter') ||
                  svcTitle.includes('पैन') ||
                  svcTitle.includes('वोटर')
                ) {
                  return false;
                }

                return true;
              });

          const uniqueDynamic = [];
          const seen = new Set();

          for (const svc of newDynamic) {
            const key =
              (
                svc.slug ||
                svc.title
              )
                .toLowerCase()
                .trim();

            if (!seen.has(key)) {
              seen.add(key);
              uniqueDynamic.push(svc);
            }
          }

          setActiveServices([
            ...Object.values(SERVICES),
            ...uniqueDynamic
          ]);
        }
      })
      .catch(err =>
        console.error(
          '[CustomerPortal] Error fetching dynamic services:',
          err
        )
      );
  }, []);

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

    const interval = setInterval(
      fetchDynamicServices,
      5000
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

        const session =
          data.data;

        const svc =
          session.service;

        if (!svc) return;

        const builtService = {
          id: svc.id,

          slug: svc.slug,

          title: svc.name,

          name: svc.name,

          icon:
            svc.icon ||
            'fa-solid fa-file',

          hindiTitle:
            svc.hindi_title ||
            '',

          description:
            svc.description ||
            '',

          requirements:
            (
              svc.documents ||
              []
            )
              .filter(
                d => d.is_required
              )
              .map(
                d =>
                  d.document_name
              ),

          documents:
            svc.documents ||
            []
        };

        setPrefilledName(
          session.customer_name ||
          ''
        );

        setPrefilledPhone(
          session.whatsapp_number ||
          ''
        );

        setModalService(
          builtService
        );

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
            padding:
              '0.5rem 1rem 1.5rem',
            margin: 0,
            boxSizing:
              'border-box'
          }}
        >
          {/* BACK BUTTON */}

          <div
            className="back-button-row"
            style={{
              width: '100%',
              display: 'flex',
              justifyContent:
                'flex-end',

              /* GAP REDUCED */
              margin:
                '0 0 0.5rem 0',

              padding: 0,

              boxSizing:
                'border-box'
            }}
          >
            <button
              type="button"
              className="btn btn-outline"
              onClick={
                handleClose
              }
              style={{
                margin: 0,
                minWidth: 140,
                gap: '0.1rem'
              }}
            >
              <i className="fa-solid fa-arrow-left"></i>
              Back to Services
            </button>
          </div>

          {/* FORM WRAPPER */}

          <div
            className="application-form-wrapper"
            style={{
              /*
               * FORM WIDTH
               * 90% of screen
               */
              width: '90%',

              /*
               * Maximum width
               */
              maxWidth:
                '1350px',

              /*
               * CENTER
               */
              margin:
                '0 auto',

              padding: 0,

              boxSizing:
                'border-box'
            }}
          >
            {showCertPicker &&
              modalService?.isMerged &&
              !selectedCertType && (
                <CertificatePickerModal
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
                Select a service below to view
                required documents and submit
                them online.
              </p>
            </div>

            <div className="services-grid">
              {activeServices.map(
                service => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    onApply={
                      handleApply
                    }
                  />
                )
              )}
            </div>
          </div>

          {/* NORMAL MODALS */}

          {showCertPicker && (
            <CertificatePickerModal
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