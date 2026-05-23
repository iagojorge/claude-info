import { MercadoPagoConfig, Payment } from 'mercadopago';

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN || 'test',
  options: { timeout: 5000 }
});
const paymentClient = new Payment(mpClient);

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '3600');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { id } = req.query;

    if (req.method === 'GET') {
      if (!id || !/^\d+$/.test(id)) {
        return res.status(400).json({ error: 'Invalid payment ID' });
      }

      try {
        const payment = await paymentClient.get({ id });
        return res.status(200).json({
          payment_id: payment.id,
          status: payment.status
        });
      } catch (err) {
        console.error('STATUS Error:', err.message);
        return res.status(404).json({ error: 'Payment not found', id });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Handler Error:', err);
    return res.status(500).json({ error: 'Server error', msg: err.message });
  }
}
