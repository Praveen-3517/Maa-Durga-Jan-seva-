import { useEffect, useRef, useState, useCallback } from 'react';
import { SERVICES } from '../../constants/services';

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function timeStr() {
  return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// Convert DB service format to simulator-compatible format
function normalizeService(svc) {
  return {
    id: svc.id || svc.slug,
    title: svc.name || svc.title,
    name: svc.name || svc.title,
    icon: svc.icon || 'fa-solid fa-file',
    hindiTitle: svc.hindi_title || svc.hindiTitle || '',
    description: svc.description || '',
    requirements: svc.requirements || (svc.documents || []).filter(d => d.is_required).map(d => d.document_name),
    slug: svc.slug || '',
  };
}

export default function BotSimulator({ shopSettings, onGoToAdmin }) {
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [payloadNode, setPayloadNode] = useState('Waiting...');
  const [payloadCode, setPayloadCode] = useState('// Send a message to see the WhatsApp Graph API JSON payloads in real-time.');
  const [menuOpen, setMenuOpen] = useState(false);
  const [dynamicServices, setDynamicServices] = useState([]);
  const chatRef = useRef();

  const shopName = shopSettings?.shopName || 'Maa Durga Online Center';
  const origin = window.location.origin;

  // Fetch services from API (same source as real WhatsApp bot)
  const fetchBotServices = useCallback(() => {
    fetch('/api/services')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data && data.data.length > 0) {
          const hardcodedSlugs = [
            'srv_certificates', 'srv_pancard', 'srv_voterid',
            'certificates', 'pancard', 'voterid', 'pan', 'voter',
            'aay', 'jaati', 'niwas', 'all', 'income', 'caste', 'domicile'
          ];
          const hardcodedTitles = Object.values(SERVICES).map(s => (s.title || '').toLowerCase().trim());

          const customDyn = data.data
            .map(normalizeService)
            .filter(svc => {
              const svcSlug = (svc.slug || svc.id || '').toLowerCase().trim();
              const svcTitle = (svc.title || '').toLowerCase().trim();

              if (hardcodedSlugs.includes(svcSlug)) return false;
              if (hardcodedTitles.some(ht => ht === svcTitle || svcTitle.includes(ht) || ht.includes(svcTitle))) return false;
              if (svcTitle.includes('income') || svcTitle.includes('caste') || svcTitle.includes('domicile') ||
                  svcTitle.includes('आय') || svcTitle.includes('जाति') || svcTitle.includes('निवास') ||
                  svcTitle.includes('pan') || svcTitle.includes('voter') || svcTitle.includes('पैन') || svcTitle.includes('वोटर')) {
                return false;
              }
              return true;
            });

          setDynamicServices([...Object.values(SERVICES), ...customDyn]);
        } else {
          setDynamicServices(Object.values(SERVICES));
        }
      })
      .catch(() => {
        setDynamicServices(Object.values(SERVICES));
      });
  }, []);

  useEffect(() => {
    fetchBotServices();

    const interval = setInterval(fetchBotServices, 5000);
    const handleServicesUpdated = () => fetchBotServices();
    window.addEventListener('services_updated', handleServicesUpdated);

    let bc;
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel('services_channel');
      bc.onmessage = () => fetchBotServices();
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('services_updated', handleServicesUpdated);
      if (bc) bc.close();
    };
  }, [fetchBotServices]);

  // Use dynamic or fallback services
  const activeServices = dynamicServices.length > 0 ? dynamicServices : Object.values(SERVICES);

  const addMsg = (type, html) => {
    setMessages(prev => [...prev, { type, html, time: timeStr() }]);
  };

  const updatePayload = (node, payload) => {
    setPayloadNode(node);
    setPayloadCode(JSON.stringify(payload, null, 2));
  };

  const addBotWelcomeMenu = () => {
    setMessages(prev => [...prev, { type: 'menu', time: timeStr() }]);
    updatePayload('n8n: HTTP Request (Welcome Menu)', {
      messaging_product: 'whatsapp', recipient_type: 'individual', to: 'CUSTOMER_PHONE_NUMBER', type: 'interactive',
      interactive: {
        type: 'list',
        header: { type: 'text', text: 'Cyber Cafe Online Services' },
        body: { text: `Hello! 🙏 ${shopName} me aapka swagat hai. Service select karein:` },
        footer: { text: 'Chunein aur aage badhein' },
        action: {
          button: 'Services Menu 👇',
          sections: [{ title: 'Available Services', rows: activeServices.map((s, i) => ({ id: s.id, title: s.title || s.name, description: s.hindiTitle || s.description?.substring(0, 60) || '' })) }]
        }
      }
    });
  };

  const processBotMenuChoice = (svc) => {
    const requirements = (svc.requirements || []).map((r, i) => `${i + 1}️⃣ ${r}`).join('\n');
    const simToken = 'sim-demo-' + Math.random().toString(36).substring(2, 10);
    const uploadLink = `${origin}/?upload=${simToken}`;

    setMessages(prev => [...prev, { 
      type: 'service_reply', 
      html: `📄 *${svc.title || svc.name}*${svc.hindiTitle ? `\n(${svc.hindiTitle})` : ''}\n\n` +
            `Required Documents:\n${requirements}\n\n` +
            `Please upload your documents here:\n🔗 ${uploadLink}\n\n` +
            `_[Simulated link — expires in 60 min in production]_`,
      time: timeStr() 
    }]);

    updatePayload('n8n: HTTP Request (Service Info + Upload Link)', {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: 'CUSTOMER_PHONE_NUMBER',
      type: 'text',
      text: {
        body: `📄 ${svc.title || svc.name}\n\nRequired Documents:\n${(svc.requirements || []).join(', ')}\n\nUpload link: ${uploadLink}`
      },
      _meta: {
        service_id: svc.id,
        upload_token: simToken,
        upload_url: uploadLink,
        source: 'n8n_via_express_api'
      }
    });
  };

  const processMessage = (text) => {
    const t = text.toLowerCase().trim();
    updatePayload('n8n Webhook (Text Message)', { messages: [{ from: 'CUSTOMER_PHONE', type: 'text', text: { body: text } }] });

    // Shop info queries
    if (t.includes('shop') || t.includes('timing') || t.includes('address') || t.includes('location')) {
      addMsg('bot', `📍 *Shop Details:*\n🏠 ${shopSettings?.shopAddress || ''}\n⏰ ${shopSettings?.shopTimings || '24/7'}`);
      return;
    }
    if (t.includes('website') || t.includes('link') || t.includes('upload')) {
      addMsg('bot', `🌐 *Hamari Website:*\n👉 ${origin}/#portal`);
      return;
    }

    // Greeting detection — same logic as real WhatsApp bot
    const greetings = ['hi', 'hello', 'helo', 'hey', 'namaste', 'namaskar', 'jai', 'start', 'menu', 'help'];
    const isGreeting = greetings.some(g => t.includes(g)) || t.length <= 3;
    if (isGreeting) {
      addBotWelcomeMenu();
      return;
    }

    // Try keyword match first
    const keywords = { pan: 'pan', voter: 'voter', income: 'income', aay: 'income', caste: 'caste', jati: 'caste' };
    for (const [kw, slug] of Object.entries(keywords)) {
      if (t.includes(kw)) {
        const found = activeServices.find(s => (s.slug || s.id || '').includes(slug) || (s.title || s.name || '').toLowerCase().includes(kw));
        if (found) { processBotMenuChoice(found); return; }
      }
    }

    // Try number selection
    const num = parseInt(t, 10);
    if (!isNaN(num) && num > 0 && num <= activeServices.length) {
      processBotMenuChoice(activeServices[num - 1]);
      return;
    }

    addMsg('bot', 'Main aapka message samajh nahi paya. Kripya menu se option select karein:');
    setTimeout(addBotWelcomeMenu, 500);
  };

  const sendMessage = () => {
    const text = inputVal.trim();
    if (!text) return;
    addMsg('user', escapeHtml(text));
    setInputVal('');
    setTimeout(() => processMessage(text), 1000);
  };

  useEffect(() => {
    if (activeServices.length === 0) return;
    setTimeout(() => {
      addMsg('bot', `Hi! ${shopName} me aapka swagat hai. Main aapki kya madad kar sakta hoon?`);
      setTimeout(addBotWelcomeMenu, 600);
    }, 1000);
  }, [activeServices.length]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  const selectRow = (svc) => {
    setMenuOpen(false);
    addMsg('user', svc.title || svc.name);
    updatePayload('n8n Webhook (List Reply Input)', {
      messages: [{ type: 'interactive', interactive: { type: 'list_reply', list_reply: { id: svc.id, title: svc.title || svc.name } } }]
    });
    setTimeout(() => processBotMenuChoice(svc), 1000);
  };

  return (
    <section className="tab-content active">
      <div className="simulator-layout">
        {/* Phone Frame */}
        <div className="phone-wrapper">
          <div className="phone-frame">
            <div className="phone-camera"></div>
            <div className="whatsapp-container">
              <div className="wa-header">
                <div className="wa-back-btn"><i className="fa-solid fa-arrow-left"></i></div>
                <div className="wa-avatar"><i className="fa-solid fa-laptop-house"></i></div>
                <div className="wa-contact-info">
                  <div className="wa-contact-name">{shopName}</div>
                  <div className="wa-contact-status">online</div>
                </div>
                <div className="wa-header-icons">
                  <i className="fa-solid fa-video"></i>
                  <i className="fa-solid fa-phone"></i>
                  <i className="fa-solid fa-ellipsis-vertical"></i>
                </div>
              </div>
              <div className="wa-chat-window" ref={chatRef}>
                <div className="wa-chat-date">TODAY</div>
                {messages.map((m, i) => {
                  if (m.type === 'menu') return (
                    <div key={i} className="wa-interactive-card">
                      <div className="wa-interactive-header">{shopName}</div>
                      <div className="wa-interactive-body">Hello! 🙏 Hamare Online Center me aapka swagat hai. Service select karein:</div>
                      <div className="wa-interactive-footer">Chunein aur aage badhein</div>
                      <div className="wa-interactive-action-btn" onClick={() => setMenuOpen(true)}>
                        <i className="fa-solid fa-list-ul"></i> Services Menu 👇
                      </div>
                    </div>
                  );
                  if (m.type === 'service_reply') return (
                    <div key={i} className="wa-interactive-card">
                      <div className="wa-interactive-body" dangerouslySetInnerHTML={{ __html: m.html.replace(/\n/g, '<br>') }} />
                      <div className="wa-interactive-action-btn" onClick={() => setMenuOpen(true)}>
                        <i className="fa-solid fa-bars"></i> Main Menu
                      </div>
                    </div>
                  );
                  return (
                    <div key={i} className={`wa-msg ${m.type === 'user' ? 'out' : 'in'}`}>
                      <span dangerouslySetInnerHTML={{ __html: m.html.replace(/\n/g, '<br>') }} />
                      <span className="wa-time">
                        {m.time}
                        {m.type === 'user' && <i className="fa-solid fa-check-double"></i>}
                      </span>
                    </div>
                  );
                })}

                {/* Dynamic service menu modal inside phone */}
                {menuOpen && (
                  <div className="wa-mock-menu-modal open">
                    <div className="wa-mock-menu-header">
                      <h4>Choose Service</h4>
                      <button className="wa-mock-menu-close" onClick={() => setMenuOpen(false)}>&times;</button>
                    </div>
                    <div className="wa-mock-menu-body">
                      <div className="wa-mock-menu-section-title">Available Services ({activeServices.length})</div>
                      {activeServices.map((svc, idx) => (
                        <div key={svc.id || idx} className="wa-mock-menu-row" onClick={() => selectRow(svc)}>
                          <div className="wa-mock-menu-row-title">
                            {idx + 1}. {svc.title || svc.name}
                          </div>
                          <div className="wa-mock-menu-row-desc">{svc.hindiTitle || svc.description?.substring(0, 50) || ''}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="wa-input-area">
                <div className="wa-input-wrapper">
                  <i className="fa-regular fa-face-smile"></i>
                  <input
                    type="text" placeholder="Type a message..." value={inputVal}
                    onChange={e => setInputVal(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  />
                  <i className="fa-solid fa-paperclip"></i>
                  <i className="fa-solid fa-camera"></i>
                </div>
                <button className="wa-send-btn" onClick={sendMessage}>
                  <i className="fa-solid fa-paper-plane"></i>
                </button>
              </div>
            </div>
          </div>
          <div className="simulator-hint">
            <i className="fa-solid fa-circle-info"></i> Type <strong className="glow-text">"Hi"</strong> or <strong className="glow-text">"shop"</strong> to test!
            {dynamicServices.length > 0 && <span style={{ marginLeft: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>• {dynamicServices.length} services loaded from database</span>}
          </div>
        </div>

        {/* Right panel */}
        <div className="sim-details-panel">
          <h2><i className="fa-brands fa-whatsapp"></i> WhatsApp Cloud API &amp; n8n</h2>
          <p>This simulator displays exactly how the self-hosted n8n workflow processes messages sent to the Meta WhatsApp Cloud API. <strong>Services are loaded dynamically from the database</strong> — the same source the real bot uses.</p>
          <div className="n8n-features-list">
            <div className="feature-item">
              <div className="feature-icon"><i className="fa-solid fa-network-wired"></i></div>
              <div className="feature-body"><h3>Webhook Node (Trigger)</h3><p>Receives the incoming messages from Meta and forwards them to n8n.</p></div>
            </div>
            <div className="feature-item">
              <div className="feature-icon"><i className="fa-solid fa-code-branch"></i></div>
              <div className="feature-body"><h3>Switch Node (Logic)</h3><p>Analyzes user input, routing to the correct reply node.</p></div>
            </div>
            <div className="feature-item">
              <div className="feature-icon"><i className="fa-solid fa-database"></i></div>
              <div className="feature-body"><h3>Dynamic Service Lookup</h3><p>Bot fetches services from the backend API — admin can add/remove services without touching the n8n workflow.</p></div>
            </div>
            <div className="feature-item">
              <div className="feature-icon"><i className="fa-solid fa-paper-plane"></i></div>
              <div className="feature-body"><h3>HTTP Request Node (Action)</h3><p>Sends custom messages back to the user via Meta's HTTP endpoint.</p></div>
            </div>
          </div>
          <div className="payload-viewer">
            <div className="payload-header">
              <span><i className="fa-solid fa-code"></i> Live Meta API Payload JSON</span>
              <span className="payload-badge">{payloadNode}</span>
            </div>
            <pre className="payload-code-box"><code>{payloadCode}</code></pre>
          </div>
          <div className="n8n-download-promo">
            <div className="promo-text">
              <h4>Ready to build this for real?</h4>
              <p>Download the full pre-configured n8n workflow file and follow the step-by-step setup guides.</p>
            </div>
            <button className="btn btn-primary" onClick={onGoToAdmin}>
              <i className="fa-solid fa-download"></i> Get n8n Workflow
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
