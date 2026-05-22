import express from 'express';
import cors from 'cors';
import { MercadoPagoConfig, Payment } from 'mercadopago';

const app = express();

// ──────────────── CONFIGURAÇÃO ────────────────
const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
  options: { timeout: 5000 }
});

const paymentClient = new Payment(mpClient);

// ──────────────── MIDDLEWARES ────────────────
app.use(express.json({ limit: '1mb' }));

// Headers de segurança
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.removeHeader('X-Powered-By');
  next();
});

// CORS - Permite ambos os frontends
app.use(cors({
  origin: function (origin, callback) {
    const allowed = [
      'https://moises.vercel.app',
      'https://claude-info.vercel.app',
      'http://localhost:3000',
      'http://localhost:5500',
      'http://localhost:8000',
      'http://127.0.0.1:5500'
    ];
    if (!origin || allowed.includes(origin)) return callback(null, true);
    // Em dev, libera qualquer origin
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    return callback(new Error('CORS: origem não permitida'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.options('*', cors());

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

// ──────────────── HEALTH CHECK ────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ──────────────── ROTA: CRIAR PIX ────────────────
app.post('/api/payment/pix', async (req, res) => {
  const { name, email, cpf } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Nome e e-mail são obrigatórios.' });
  }

  const cpfDigits = (cpf || '').replace(/\D/g, '');
  if (!isValidCPF(cpfDigits)) {
    return res.status(400).json({ error: 'CPF inválido. Verifique o número digitado.' });
  }

  try {
    const body = {
      transaction_amount: parseFloat(process.env.PRODUCT_PRICE || '19.90'),
      description: process.env.PRODUCT_NAME || 'Curso',
      payment_method_id: 'pix',
      payer: {
        email,
        first_name: name.split(' ')[0],
        last_name: name.split(' ').slice(1).join(' ') || '-',
        identification: { type: 'CPF', number: cpfDigits }
      }
    };

    console.log('Criando PIX:', cpfDigits.substring(0, 3) + '***');
    const payment = await paymentClient.create({ body });
    console.log('MP PIX status:', payment.status);

    const pix = payment.point_of_interaction?.transaction_data;

    return res.json({
      payment_id: payment.id,
      status: payment.status,
      qr_code: pix?.qr_code,
      qr_code_base64: pix?.qr_code_base64,
      expires_at: pix?.ticket_url
    });
  } catch (err) {
    const mpMsg = err?.cause?.[0]?.description || err?.message || 'desconhecido';
    console.error('Erro ao criar PIX:', mpMsg);
    return res.status(500).json({ error: `Erro MP: ${mpMsg}` });
  }
});

// ──────────────── ROTA: PAGAMENTO CARTÃO ────────────────
app.post('/api/payment/card', async (req, res) => {
  const { name, email, cpf, token, installments, payment_method_id, issuer_id } = req.body;

  if (!name || !email || !token) {
    return res.status(400).json({ error: 'Dados incompletos para pagamento com cartão.' });
  }

  try {
    const body = {
      transaction_amount: parseFloat(process.env.PRODUCT_PRICE || '19.90'),
      description: process.env.PRODUCT_NAME || 'Curso',
      token,
      installments: installments || 1,
      payment_method_id,
      issuer_id,
      payer: {
        email,
        first_name: name.split(' ')[0],
        last_name: name.split(' ').slice(1).join(' ') || '-',
        identification: cpf ? { type: 'CPF', number: cpf.replace(/\D/g, '') } : undefined
      }
    };

    const payment = await paymentClient.create({ body });

    if (payment.status === 'approved') {
      await notifyCustomer(payment.payer.email, payment.payer.first_name, payment.id);
      return res.json({ payment_id: payment.id, status: 'approved' });
    } else {
      return res.status(402).json({
        payment_id: payment.id,
        status: payment.status,
        detail: payment.status_detail
      });
    }
  } catch (err) {
    console.error('Erro no pagamento com cartão:', err);
    return res.status(500).json({ error: 'Erro ao processar cartão. Tente novamente.' });
  }
});

// ──────────────── ROTA: CONSULTAR STATUS PAGAMENTO ────────────────
app.get('/api/payment/:id/status', async (req, res) => {
  try {
    const payment = await paymentClient.get({ id: req.params.id });
    return res.json({ payment_id: payment.id, status: payment.status });
  } catch (err) {
    console.error('Erro ao consultar pagamento:', err);
    return res.status(500).json({ error: 'Erro ao consultar pagamento.' });
  }
});

// ──────────────── ROTA: WEBHOOK (notificações do MP) ────────────────
app.post('/api/webhook', async (req, res) => {
  res.sendStatus(200);

  const { type, data } = req.body;
  if (type !== 'payment' || !data?.id) return;

  try {
    const payment = await paymentClient.get({ id: data.id });

    if (payment.status === 'approved') {
      const payerEmail = payment.payer?.email;
      const payerName = payment.payer?.first_name;
      console.log(`✅ Pagamento aprovado! ID: ${payment.id}`);
      await notifyCustomer(payerEmail, payerName, payment.id);
    }
  } catch (err) {
    console.error('Erro ao processar webhook:', err);
  }
});

// ──────────────── ENVIO DE EMAIL (via EmailJS REST) ────────────────
async function notifyCustomer(email, name, paymentId) {
  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const pdfUrl = process.env.PDF_URL;

  if (!serviceId || !templateId || !publicKey) {
    console.warn('⚠️ EmailJS não configurado');
    return;
  }

  try {
    const resp = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: {
          to_name: name,
          to_email: email,
          order_amount: `R$ ${parseFloat(process.env.PRODUCT_PRICE || '19.90').toFixed(2)}`,
          order_date: new Date().toLocaleDateString('pt-BR'),
          pdf_link: pdfUrl || ''
        }
      })
    });

    if (resp.ok) {
      console.log(`📧 E-mail enviado para ${email}`);
    } else {
      console.error('❌ Falha ao enviar e-mail');
    }
  } catch (err) {
    console.error('❌ Erro EmailJS:', err);
  }
}

// ──────────────── EXPORTAR PARA VERCEL ────────────────
export default app;


// Helper: Send email via EmailJS
async function notifyCustomer(email, name, pdfUrl) {
  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        service_id: process.env.EMAILJS_SERVICE_ID,
        template_id: process.env.EMAILJS_TEMPLATE_ID,
        user_id: process.env.EMAILJS_PUBLIC_KEY,
        template_params: {
          to_email: email,
          to_name: name,
          pdf_url: pdfUrl,
          course_name: process.env.PRODUCT_NAME || 'Curso Tráfego Pago'
        }
      })
    });
    return response.ok;
  } catch (error) {
    console.error('Email error:', error);
    return false;
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// PIX Payment
app.post('/api/payment/pix', async (req, res) => {
  try {
    const { email, name, cpf, phone } = req.body;

    if (!isValidCPF(cpf)) {
      return res.status(400).json({ error: 'CPF inválido' });
    }

    const payment = await mercadopago.payment.create({
      transaction_amount: parseFloat(process.env.PRODUCT_PRICE || '19.90'),
      description: process.env.PRODUCT_NAME,
      payment_method_id: 'pix',
      payer: {
        email,
        first_name: name.split(' ')[0],
        last_name: name.split(' ').slice(1).join(' '),
        identification: {
          type: 'CPF',
          number: cpf.replace(/\D/g, '')
        }
      }
    });

    res.json({
      id: payment.body.id,
      qr_code: payment.body.point_of_interaction?.qr_code?.in_store_order_id || '',
      status: payment.body.status
    });
  } catch (error) {
    console.error('PIX Error:', error);
    res.status(500).json({ error: 'Erro ao processar pagamento PIX' });
  }
});

// Card Payment
app.post('/api/payment/card', async (req, res) => {
  try {
    const { email, name, cpf, token, installments } = req.body;

    const payment = await mercadopago.payment.create({
      transaction_amount: parseFloat(process.env.PRODUCT_PRICE || '19.90'),
      token,
      description: process.env.PRODUCT_NAME,
      installments: parseInt(installments) || 1,
      payment_method_id: 'credit_card',
      payer: {
        email,
        first_name: name.split(' ')[0],
        last_name: name.split(' ').slice(1).join(' '),
        identification: {
          type: 'CPF',
          number: cpf.replace(/\D/g, '')
        }
      }
    });

    res.json({
      id: payment.body.id,
      status: payment.body.status,
      status_detail: payment.body.status_detail
    });
  } catch (error) {
    console.error('Card Error:', error);
    res.status(500).json({ error: 'Erro ao processar cartão' });
  }
});

// Check payment status
app.get('/api/payment/:id/status', async (req, res) => {
  try {
    const payment = await mercadopago.payment.findById(req.params.id);
    res.json({
      id: payment.body.id,
      status: payment.body.status,
      status_detail: payment.body.status_detail
    });
  } catch (error) {
    console.error('Status Error:', error);
    res.status(500).json({ error: 'Erro ao consultar pagamento.' });
  }
});

// Webhook
app.post('/api/webhook', async (req, res) => {
  try {
    const { data, type } = req.body;

    if (type === 'payment' && data?.id) {
      const payment = await mercadopago.payment.findById(data.id);

      if (payment.body.status === 'approved') {
        const { email, first_name } = payment.body.payer;
        await notifyCustomer(email, first_name, process.env.PDF_URL);
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(500).json({ error: 'Erro ao processar webhook' });
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

export default app;
