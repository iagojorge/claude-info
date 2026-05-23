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
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '3600');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const body = parseBody(req.body);

    if (req.method === 'POST') {
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
          qr_code_base64: payment.point_of_interaction?.qr_code?.qr_code_base64 || null
        });
      } catch (err) {
        console.error('PIX Error:', err.message);
        return res.status(500).json({ error: 'PIX Error: ' + err.message });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Handler Error:', err);
    return res.status(500).json({ error: 'Server error', msg: err.message });
  }
}
