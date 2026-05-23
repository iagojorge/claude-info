import express from 'express';
import cors from 'cors';
import { MercadoPagoConfig, Payment } from 'mercadopago';

const app = express();

// ──────────────── CONFIGURAÇÃO MERCADO PAGO ────────────────
const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
  options: { timeout: 5000 }
});
const paymentClient = new Payment(mpClient);

// ──────────────── MIDDLEWARES ────────────────
app.use(express.json({ limit: '1mb' }));

// CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

// Handle OPTIONS
app.options('*', cors());

// Debug logging
app.use((req, res, next) => {
  console.log(`[DEBUG] ${req.method} ${req.path} | originalUrl: ${req.originalUrl}`);
  next();
});

// ──────────────── VALIDAÇÃO CPF ────────────────
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

// ──────────────── PIX PAYMENT ────────────────
const handlePixPayment = async (req, res) => {
  console.log('📥 PIX Request:', { email: req.body.email, name: req.body.name });
  
  const { name, email, cpf } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Nome e e-mail obrigatórios' });
  }

  const cpfDigits = (cpf || '').replace(/\D/g, '');
  if (cpf && !isValidCPF(cpfDigits)) {
    return res.status(400).json({ error: 'CPF inválido' });
  }

  try {
    const body = {
      transaction_amount: parseFloat(process.env.PRODUCT_PRICE || '19.90'),
      description: process.env.PRODUCT_NAME || 'Curso',
      payment_method_id: 'pix',
      payer: {
        email: email,
        identification: {
          type: 'CPF',
          number: cpfDigits
        }
      }
    };

    console.log('📤 Creating Mercado Pago PIX payment...');
    const payment = await paymentClient.create({ body });

    let qrCode = null;
    let qrCodeBase64 = null;

    if (payment.point_of_interaction?.qr_code?.in_store_order_id) {
      qrCode = payment.point_of_interaction.qr_code.in_store_order_id;
    } else if (payment.point_of_interaction?.qr_code?.qr_code) {
      qrCode = payment.point_of_interaction.qr_code.qr_code;
    }

    if (payment.point_of_interaction?.qr_code?.qr_code_base64) {
      qrCodeBase64 = payment.point_of_interaction.qr_code.qr_code_base64;
    } else if (payment.qr_code) {
      qrCode = payment.qr_code;
    }

    console.log('✅ PIX Payment created:', { id: payment.id, status: payment.status });
    res.json({
      payment_id: payment.id,
      status: payment.status || 'pending',
      qr_code: qrCode,
      qr_code_base64: qrCodeBase64,
      expires_at: payment.date_of_expiration
    });
  } catch (err) {
    console.error('❌ PIX Error:', err.message);
    res.status(500).json({ error: 'Erro: ' + err.message });
  }
};

// Register PIX routes
app.post('/api/payment/pix', handlePixPayment);
app.post('/payment/pix', handlePixPayment);
app.post('/pix', handlePixPayment);

// ──────────────── CARD PAYMENT ────────────────
const handleCardPayment = async (req, res) => {
  const { name, email, cpf, token, installments } = req.body;

  if (!name || !email || !token) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }

  try {
    const body = {
      transaction_amount: parseFloat(process.env.PRODUCT_PRICE || '19.90'),
      description: process.env.PRODUCT_NAME || 'Curso',
      token,
      installments: installments || 1,
      payment_method_id: 'credit_card',
      payer: {
        email: email,
        identification: {
          type: 'CPF',
          number: cpf.replace(/\D/g, '')
        }
      }
    };

    const payment = await paymentClient.create({ body });

    if (payment.status === 'approved') {
      return res.json({ payment_id: payment.id, status: 'approved' });
    } else {
      return res.status(402).json({ payment_id: payment.id, status: payment.status });
    }
  } catch (err) {
    console.error('❌ Card Error:', err.message);
    res.status(500).json({ error: 'Erro: ' + err.message });
  }
};

// Register CARD routes
app.post('/api/payment/card', handleCardPayment);
app.post('/payment/card', handleCardPayment);
app.post('/card', handleCardPayment);

// ──────────────── STATUS ────────────────
const handleStatusCheck = async (req, res) => {
  try {
    const payment = await paymentClient.get({ id: req.params.id });
    res.json({ payment_id: payment.id, status: payment.status });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao consultar' });
  }
};

// Register STATUS routes
app.get('/api/payment/:id/status', handleStatusCheck);
app.get('/payment/:id/status', handleStatusCheck);
app.get('/:id/status', handleStatusCheck);

// ──────────────── HEALTH ────────────────
const handleHealth = (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
};

// Register HEALTH routes
app.get('/api/payment', handleHealth);
app.get('/api/payment/health', handleHealth);
app.get('/api/health', handleHealth);
app.get('/health', handleHealth);
app.get('/', handleHealth);

// Catch-all para debug
app.all('*', (req, res) => {
  res.status(405).json({ 
    error: 'Method Not Allowed',
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl
  });
});

export default app;
