import React, { useState } from 'react';

export default function MaintenanceBanner({ shopSettings, onGoToSettings }) {
  const [dismissed, setDismissed] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // If maintenanceNotice is not enabled, do not render
  if (!shopSettings?.maintenanceNotice || dismissed) {
    return null;
  }

  const defaultMsg = "Cloud server & automated service infrastructure renewal is pending. Document processing and bot services are temporarily on hold.";
  const displayMsg = shopSettings.maintenanceMessage || defaultMsg;

  return (
    <>
      {/* Admin Floating Alert Banner */}
      <div 
        style={{
          background: 'linear-gradient(90deg, #92400e 0%, #b45309 50%, #92400e 100%)',
          color: '#ffffff',
          padding: '0.85rem 1.25rem',
          fontSize: '0.86rem',
          fontWeight: '500',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.35)',
          border: '1px solid rgba(245, 158, 11, 0.45)',
          borderRadius: '12px',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          zIndex: 9990,
          position: 'relative'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1, minWidth: '280px' }}>
          <span 
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '0.28rem 0.6rem',
              borderRadius: '6px',
              fontSize: '0.76rem',
              fontWeight: '700',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              border: '1px solid rgba(254, 240, 138, 0.3)'
            }}
          >
            <i className="fa-solid fa-triangle-exclamation" style={{ color: '#fef08a' }}></i>
            ADMIN ALERT
          </span>
          <span style={{ lineHeight: '1.4' }}>
            {displayMsg}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            style={{
              background: '#ffffff',
              color: '#92400e',
              border: 'none',
              padding: '0.35rem 0.85rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
            }}
          >
            <i className="fa-solid fa-circle-info"></i> View Details
          </button>

          {onGoToSettings && (
            <button
              type="button"
              onClick={onGoToSettings}
              style={{
                background: 'rgba(0,0,0,0.25)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.25)',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <i className="fa-solid fa-gears"></i> Settings
            </button>
          )}
          
          <button
            type="button"
            onClick={() => setDismissed(true)}
            title="Minimize Notice"
            style={{
              background: 'rgba(0,0,0,0.25)',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.95rem'
            }}
          >
            &times;
          </button>
        </div>
      </div>

      {/* Detailed Maintenance Popup Modal */}
      {showModal && (
        <div 
          className="modal open" 
          onClick={() => setShowModal(false)}
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 99999 }}
        >
          <div 
            className="modal-content" 
            onClick={e => e.stopPropagation()} 
            style={{ 
              maxWidth: '560px', 
              width: '92%', 
              background: '#111827', 
              border: '1px solid #f59e0b', 
              borderRadius: '16px', 
              overflow: 'hidden',
              boxShadow: '0 10px 40px rgba(245, 158, 11, 0.25)' 
            }}
          >
            <div 
              className="modal-header" 
              style={{ 
                borderBottom: '1px solid rgba(245, 158, 11, 0.25)', 
                background: 'rgba(245, 158, 11, 0.12)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '1.1rem 1.25rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <i className="fa-solid fa-server" style={{ color: '#f59e0b', fontSize: '1.3rem' }}></i>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f9fafb' }}>System Infrastructure Notice</h3>
                  <span style={{ fontSize: '0.78rem', color: '#fbbf24' }}>
                    Scheduled Cloud Server &amp; Security Renewal
                  </span>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>

            <div className="modal-body" style={{ padding: '1.5rem', color: '#e5e7eb', fontSize: '0.9rem', lineHeight: '1.6' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div style={{ width: 44, height: 44, borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="fa-solid fa-screwdriver-wrench" style={{ color: '#f87171', fontSize: '1.2rem' }}></i>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 0.35rem', color: '#ffffff', fontSize: '1rem' }}>Services Temporarily On Hold</h4>
                  <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.85rem' }}>
                    The website cloud database, WhatsApp Cloud API tokens, and document submission pipeline are currently undergoing scheduled maintenance renewal.
                  </p>
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.04)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ fontWeight: 600, color: '#f59e0b', marginBottom: '0.4rem', fontSize: '0.88rem' }}>
                  <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '0.4rem' }}></i>
                  Administrator Action Required
                </div>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#d1d5db' }}>
                  To restore 24/7 automated document processing and WhatsApp services, please complete the pending infrastructure &amp; server maintenance renewal.
                </p>
              </div>

              <div style={{ textAlign: 'center', fontSize: '0.82rem', color: '#9ca3af' }}>
                Portal: <strong>{shopSettings?.shopName || 'Maa Durga Online Center'}</strong> • Status: <span style={{ color: '#f87171', fontWeight: 600 }}>Renewal Pending</span>
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'flex-end', background: 'rgba(0, 0, 0, 0.4)', padding: '0.9rem 1.25rem' }}>
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => setShowModal(false)}
                style={{ fontSize: '0.85rem' }}
              >
                Close Notice
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
