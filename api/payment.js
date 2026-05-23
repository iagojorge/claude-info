import { MercadoPagoConfig, Payment } from 'mercadopago';

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN || 'test',
  options: { timeout: 5000 }
});
const paymentClient = new Payment(mpClient);

function isValidCPF(cpf) {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  for (let t = 9; t < 11; t++) {
    let sum = 0;
    for (let i = 0; i < t; i++) sum += parseInt(digits[i]) * (t + 1 - i);
    let check = ((10 * sum) % 11) % 10;
    if (parseInt(digits[t]) !== check) return false;
  }
  return true;
}

const parseBody = (body) => {
  try {
    return typeof body === 'string' ? JSON.parse(body) : body;
  } catch {
    return {};
  }
};

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const body = parseBody(req.body);
    const path = (req.url || '/').split('?')[0];
    
    // Detect payment method from path or body
    let paymentMethod = body.payment_method || '';
    if (path.includes('pix')) paymentMethod = 'pix';
    if (path.includes('card')) paymentMethod = 'card';

    // PIX Payment - both /pix and root with payment_method=pix
    if ((path === '/' && body.payment_method === 'pix') || path.includes('pix')) {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      
      const { name, email, cpf } = body;
      if (!name || !email) return res.status(400).json({ error: 'Nome e e-mail obrigatórios' });
      if (cpf && !isValidCPF(cpf)) return res.status(400).json({ error: 'CPF inválido' });

      try {
        const payment = await paymentClient.create({
          body: {
            transaction_amount: parseFloat(process.env.PRODUCT_PRICE || '19.90'),
            description: process.env.PRODUCT_NAME || 'Curso',
            payment_method_id: 'pix',
            payer: { email, identification: { type: 'CPF', number: (cpf || '').replace(/\D/g, '') } }
          }
        });

        return res.status(200).json({
          payment_id: payment.id,
          status: payment.status || 'pending',
          qr_code: payment.point_of_interaction?.qr_code?.in_store_order_id || payment.point_of_interaction?.qr_code?.qr_code || payment.qr_code,
          qr_code_base64: payment.point_of_interaction?.qr_code?.qr_code_base64
        });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }

    // CARD Payment - both /card and root with payment_method=card
    if ((path === '/' && body.payment_method === 'card') || path.includes('card')) {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      
      const { name, email, token, installments } = body;
      if (!name || !email || !token) return res.status(400).json({ error: 'Dados incompletos' });

      try {
        const payment = await paymentClient.create({
          body: {
            transaction_amount: parseFloat(process.env.PRODUCT_PRICE || '19.90'),
            description: process.env.PRODUCT_NAME || 'Curso',
            token,
            installments: installments || 1,
            payment_method_id: 'credit_card',
            payer: { email, identification: { type: 'CPF', number: (body.cpf || '').replace(/\D/g, '') } }
          }
        });

        return res.status(payment.status === 'approved' ? 200 : 402).json({ payment_id: payment.id, status: payment.status });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }

    // STATUS endpoint
    if (req.method === 'GET') {
      if (path === '/') {
        return res.status(200).json({ status: 'ok' });
      }
      // /api/payment/12345 or /api/payment/12345/status
      const segments = path.split('/').filter(Boolean);
      const id = segments[0];
      
      if (id && id !== 'status' && id !== 'health') {
        try {
          const payment = await paymentClient.get({ id });
          return res.status(200).json({ payment_id: payment.id, status: payment.status });
        } catch (err) {
          return res.status(500).json({ error: 'Erro ao consultar' });
        }
      }
      
      // /health
      return res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
    }

    return res.status(404).json({ error: 'Not found', path, method: req.method });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error', msg: err.message });
  }
}
