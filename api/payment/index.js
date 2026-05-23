import { MercadoPagoConfig, Payment } from 'mercadopago';

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
  options: { timeout: 5000 }
});
const paymentClient = new Payment(mpClient);

// CORS headers
const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
};

// Validar CPF
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

// Parse body
const parseBody = (body) => {
  try {
    return typeof body === 'string' ? JSON.parse(body) : body;
  } catch {
    return {};
  }
};

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const body = parseBody(req.body);
    const path = new URL(req.url, 'https://example.com').pathname;
    
    console.log(`${req.method} ${path}`);

    // PIX Payment
    if ((path === '/pix' || path === '/api/payment/pix') && req.method === 'POST') {
      const { name, email, cpf } = body;

      if (!name || !email) {
        return res.status(400).json({ error: 'Nome e e-mail obrigatórios' });
      }

      if (cpf && !isValidCPF(cpf)) {
        return res.status(400).json({ error: 'CPF inválido' });
      }

      const cpfDigits = cpf ? cpf.replace(/\D/g, '') : '';
      
      try {
        const payment = await paymentClient.create({
          body: {
            transaction_amount: parseFloat(process.env.PRODUCT_PRICE || '19.90'),
            description: process.env.PRODUCT_NAME || 'Curso',
            payment_method_id: 'pix',
            payer: {
              email,
              identification: {
                type: 'CPF',
                number: cpfDigits
              }
            }
          }
        });

        let qrCode = payment.point_of_interaction?.qr_code?.in_store_order_id ||
                     payment.point_of_interaction?.qr_code?.qr_code ||
                     payment.qr_code;
        
        let qrCodeBase64 = payment.point_of_interaction?.qr_code?.qr_code_base64;

        return res.status(200).json({
          payment_id: payment.id,
          status: payment.status || 'pending',
          qr_code: qrCode,
          qr_code_base64: qrCodeBase64,
          expires_at: payment.date_of_expiration
        });
      } catch (err) {
        console.error('PIX Error:', err.message);
        return res.status(500).json({ error: 'Erro ao processar pagamento PIX' });
      }
    }

    // Card Payment
    if ((path === '/card' || path === '/api/payment/card') && req.method === 'POST') {
      const { name, email, token, installments } = body;

      if (!name || !email || !token) {
        return res.status(400).json({ error: 'Dados incompletos' });
      }

      try {
        const payment = await paymentClient.create({
          body: {
            transaction_amount: parseFloat(process.env.PRODUCT_PRICE || '19.90'),
            description: process.env.PRODUCT_NAME || 'Curso',
            token,
            installments: installments || 1,
            payment_method_id: 'credit_card',
            payer: {
              email,
              identification: {
                type: 'CPF',
                number: body.cpf ? body.cpf.replace(/\D/g, '') : ''
              }
            }
          }
        });

        if (payment.status === 'approved') {
          return res.status(200).json({ payment_id: payment.id, status: 'approved' });
        } else {
          return res.status(402).json({ payment_id: payment.id, status: payment.status });
        }
      } catch (err) {
        console.error('Card Error:', err.message);
        return res.status(500).json({ error: 'Erro ao processar cartão' });
      }
    }

    // Get Payment Status
    if ((path.startsWith('/api/payment/') || path.startsWith('/payment/')) && req.method === 'GET') {
      const paymentId = path.split('/').pop();
      
      try {
        const payment = await paymentClient.get({ id: paymentId });
        return res.status(200).json({ payment_id: payment.id, status: payment.status });
      } catch (err) {
        return res.status(500).json({ error: 'Erro ao consultar status' });
      }
    }

    // Health
    if ((path === '/' || path === '/health') && req.method === 'GET') {
      return res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
    }

    // Not Found
    return res.status(404).json({ error: 'Endpoint não encontrado', path });
  } catch (err) {
    console.error('Handler Error:', err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
