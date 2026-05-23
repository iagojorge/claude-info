import { MercadoPagoConfig, Payment } from 'mercadopago';

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN || 'test',
  options: { timeout: 5000 }
});
const paymentClient = new Payment(mpClient);

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
      const { name, email, token, installments, cpf } = body;
      if (!name || !email || !token) return res.status(400).json({ error: 'Dados incompletos' });

      try {
        const payment = await paymentClient.create({
          body: {
            transaction_amount: parseFloat(process.env.PRODUCT_PRICE || '19.90'),
            description: process.env.PRODUCT_NAME || 'Curso',
            token,
            installments: installments || 1,
            payment_method_id: 'credit_card',
            payer: { email, identification: { type: 'CPF', number: (cpf || '').replace(/\D/g, '') } }
          }
        });

        return res.status(payment.status === 'approved' ? 200 : 402).json({
          payment_id: payment.id,
          status: payment.status
        });
      } catch (err) {
        console.error('CARD Error:', err.message);
        return res.status(500).json({ error: 'CARD Error: ' + err.message });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Handler Error:', err);
    return res.status(500).json({ error: 'Server error', msg: err.message });
  }
}
