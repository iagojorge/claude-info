/* ============================================
   CONFIGURAÇÕES — NÃO COMMITAR ESTE ARQUIVO
   Frontend: Bike e Moto Elétrica
   ============================================ */
const ENV = {
  // ── EmailJS ──────────────────────────────────
  EMAILJS_PUBLIC_KEY:  'y6dVefqw92jbm_aKp',
  EMAILJS_SERVICE_ID:  'service_gwkbtdo',
  EMAILJS_TEMPLATE_ID: 'template_b2q2m33',
  PDF_URL: 'https://drive.google.com/file/d/1_wiBiN9ixc73oxuhF7XC1TzC8pwkoXpu/view?usp=sharing',

  // ── Mercado Pago ─────────────────────────────
  MP_PUBLIC_KEY: 'APP_USR-2f88649b-6a83-433b-af3c-613c1f8b1d23',

  // URL do backend (detecta automáticamente)
  BACKEND_URL: (() => {
    if (typeof window === 'undefined') return 'http://localhost:3001';
    
    const { hostname, protocol } = window.location;
    
    // Localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3001';
    }
    
    // Vercel deployment - mesmo domínio
    if (hostname.includes('vercel.app') || hostname.includes('.com.br')) {
      return `${protocol}//${hostname}`;
    }
    
    return 'http://localhost:3001';
  })()
};

// Disponibiliza globalmente para scripts que carregam após config.js
if (typeof window !== 'undefined') {
  window.ENV = ENV;
}
