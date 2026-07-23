export default function FloatingWhatsApp({ shopSettings }) {
  const cleanPhone = String(shopSettings?.shopPhone || '918707845206').replace(/[^0-9]/g, '');
  const shopName = shopSettings?.shopName || 'Maa Durga Jan Seva';
  const waUrl = `https://wa.me/${cleanPhone}?text=Hello%20${encodeURIComponent(shopName)},%20I%20have%20an%20inquiry.`;

  return (
    <a
      id="floating-whatsapp-btn"
      href={waUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="floating-whatsapp"
      aria-label="Direct WhatsApp Chat"
    >
      <i className="fa-brands fa-whatsapp"></i>
    </a>
  );
}
