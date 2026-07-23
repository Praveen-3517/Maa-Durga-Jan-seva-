import { useEffect, useRef, useState } from 'react';
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

export default function BotSimulator({ shopSettings, onGoToAdmin }) {
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [payloadNode, setPayloadNode] = useState('Waiting...');
  const [payloadCode, setPayloadCode] = useState('// Send a message to see the WhatsApp Graph API JSON payloads in real-time.');
  const [menuOpen, setMenuOpen] = useState(false);
  const chatRef = useRef();

  const shopName = shopSettings?.shopName || 'Maa Durga Jan Seva Kendra';
  const origin = window.location.origin;

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
      interactive: { type: 'list', header: { type: 'text', text: 'Cyber Cafe Online Services' }, body: { text: 'Hello! 🙏 Hamare Cyber Cafe me aapka swagat hai.' }, footer: { text: 'Chunein aur aage badhein' }, action: { button: 'Services Menu 👇' } }
    });
  };

  const processBotMenuChoice = (id) => {
    const msgs = {
      srv_pancard: `💳 *Pan Card Banane Ke Liye Zaroori Documents:*\n\n1️⃣ Aadhar Card\n2️⃣ Ek Passport Size Photo\n3️⃣ Signature (White Paper par)\n\n👇 *Document Upload Karein:*\n👉 ${origin}/#portal`,
      srv_income: `📄 *Income Certificate Ke Liye Documents:*\n\n1️⃣ Aadhar Card\n2️⃣ Passport Photo\n3️⃣ Pradhan ka Ghoshna Patra\n\n👉 ${origin}/#portal`,
      srv_voterid: `🗳️ *Voter ID Ke Liye Documents:*\n\n1️⃣ Aadhar Card / Age Proof\n2️⃣ Passport Photo\n3️⃣ Address Proof\n\n👉 ${origin}/#portal`,
      srv_caste: `👥 *Caste Certificate Ke Documents:*\n\n1️⃣ Aadhar Card\n2️⃣ Passport Photo\n3️⃣ Father ka Jati Praman Patra\n\n👉 ${origin}/#portal`,
    };
    addMsg('bot', msgs[id] || 'Kripya menu se option select karein.');
  };

  const processMessage = (text) => {
    const t = text.toLowerCase();
    updatePayload('n8n Webhook (Text Message)', { messages: [{ from: 'CUSTOMER_PHONE', type: 'text', text: { body: text } }] });
    if (t.includes('shop') || t.includes('timing') || t.includes('address') || t.includes('location')) {
      addMsg('bot', `📍 *Shop Details:*\n🏠 ${shopSettings?.shopAddress || ''}\n⏰ ${shopSettings?.shopTimings || '24/7'}`);
    } else if (t.includes('website') || t.includes('link') || t.includes('upload')) {
      addMsg('bot', `🌐 *Hamari Website:*\n👉 ${origin}/#portal`);
    } else if (t.includes('pan')) { processBotMenuChoice('srv_pancard'); }
    else if (t.includes('income') || t.includes('aay')) { processBotMenuChoice('srv_income'); }
    else if (t.includes('voter')) { processBotMenuChoice('srv_voterid'); }
    else if (t.includes('caste') || t.includes('jati')) { processBotMenuChoice('srv_caste'); }
    else {
      addMsg('bot', 'Main aapka message samajh nahi paya. Kripya menu se option select karein:');
      setTimeout(addBotWelcomeMenu, 500);
    }
  };

  const sendMessage = () => {
    const text = inputVal.trim();
    if (!text) return;
    addMsg('user', escapeHtml(text));
    setInputVal('');
    setTimeout(() => processMessage(text), 1000);
  };

  useEffect(() => {
    setTimeout(() => {
      addMsg('bot', `Hi! ${shopName} me aapka swagat hai. Main aapki kya madad kar sakta hoon?`);
      setTimeout(addBotWelcomeMenu, 600);
    }, 1000);
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  const selectRow = (id, title) => {
    setMenuOpen(false);
    addMsg('user', title);
    updatePayload('n8n Webhook (List Reply Input)', { messages: [{ type: 'interactive', interactive: { type: 'list_reply', list_reply: { id, title } } }] });
    setTimeout(() => processBotMenuChoice(id), 1000);
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
                      <div className="wa-interactive-body">Hello! 🙏 Hamare Jan Seva Kendra me aapka swagat hai. Service select karein:</div>
                      <div className="wa-interactive-footer">Chunein aur aage badhein</div>
                      <div className="wa-interactive-action-btn" onClick={() => setMenuOpen(true)}>
                        <i className="fa-solid fa-list-ul"></i> Services Menu 👇
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

                {/* Service menu modal inside phone */}
                {menuOpen && (
                  <div className="wa-mock-menu-modal open">
                    <div className="wa-mock-menu-header">
                      <h4>Choose Service</h4>
                      <button className="wa-mock-menu-close" onClick={() => setMenuOpen(false)}>&times;</button>
                    </div>
                    <div className="wa-mock-menu-body">
                      <div className="wa-mock-menu-section-title">Government ID Cards</div>
                      <div className="wa-mock-menu-row" onClick={() => selectRow('srv_pancard', 'Pan Card Apply')}>
                        <div className="wa-mock-menu-row-title">Pan Card Apply</div>
                        <div className="wa-mock-menu-row-desc">Naya Pan Card ya Correction</div>
                      </div>
                      <div className="wa-mock-menu-row" onClick={() => selectRow('srv_voterid', 'Voter ID Card')}>
                        <div className="wa-mock-menu-row-title">Voter ID Card</div>
                        <div className="wa-mock-menu-row-desc">Naya Voter ID card banayein</div>
                      </div>
                      <div className="wa-mock-menu-section-title">Certificates &amp; Others</div>
                      <div className="wa-mock-menu-row" onClick={() => selectRow('srv_income', 'Income Certificate')}>
                        <div className="wa-mock-menu-row-title">Income Certificate</div>
                        <div className="wa-mock-menu-row-desc">Aay Praman Patra (आय प्रमाण पत्र)</div>
                      </div>
                      <div className="wa-mock-menu-row" onClick={() => selectRow('srv_caste', 'Caste Certificate')}>
                        <div className="wa-mock-menu-row-title">Caste Certificate</div>
                        <div className="wa-mock-menu-row-desc">Jati Praman Patra (जाति प्रमाण पत्र)</div>
                      </div>
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
          </div>
        </div>

        {/* Right panel */}
        <div className="sim-details-panel">
          <h2><i className="fa-brands fa-whatsapp"></i> WhatsApp Cloud API &amp; n8n</h2>
          <p>This simulator displays exactly how the self-hosted n8n workflow processes messages sent to the Meta WhatsApp Cloud API.</p>
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
