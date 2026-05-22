const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const { MercadoPagoConfig, Payment } = require('mercadopago');

// ──────────────── CONFIGURAÇÃO ────────────────
const app = express();
const PORT = process.env.PORT || 3002;

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

// CORS
app.use(cors({
  origin: function (origin, callback) {
    const frontendUrl = process.env.FRONTEND_URL || '';
    const backendUrl = process.env.BACKEND_URL || '';
    const allowed = [frontendUrl, backendUrl, 'http://187.127.24.38'].filter(Boolean);
    // Permitir sem origin (chamadas internas/curl/webhook)
    if (!origin) return callback(null, true);
    if (allowed.includes(origin)) return callback(null, true);
    // Em dev (localhost), libera qualquer origin
    if (frontendUrl.includes('localhost') || frontendUrl.includes('127.0.0.1')) {
      return callback(null, true);
    }
    return callback(new Error('CORS: origem não permitida'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.options('*', cors());

// ──────────────── HEALTH CHECK ────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

// ──────────────── ROTA: CRIAR PIX ────────────────
app.post('/api/payment/pix', async (req, res) => {
  const { name, email, cpf } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Nome e e-mail são obrigatórios.' });
  }

  // CPF é obrigatório para PIX no Mercado Pago
  const cpfDigits = (cpf || '').replace(/\D/g, '');
  if (!isValidCPF(cpfDigits)) {
    return res.status(400).json({ error: 'CPF inválido. Verifique o número digitado.' });
  }

  // Só envia notification_url se o backend for acessível publicamente
  const isLocalhost = (process.env.BACKEND_URL || '').includes('localhost');

  try {
    const body = {
      transaction_amount: parseFloat(process.env.PRODUCT_PRICE || '19.90'),
      description: process.env.PRODUCT_NAME || 'Tráfego Pago - Curso',
      payment_method_id: 'pix',
      payer: {
        email,
        first_name: name.split(' ')[0],
        last_name: name.split(' ').slice(1).join(' ') || '-',
        identification: { type: 'CPF', number: cpfDigits }
      }
    };

    if (!isLocalhost) {
      body.notification_url = `${process.env.BACKEND_URL}/api/webhook`;
    }

    console.log('Criando PIX | id:', cpfDigits.substring(0, 3) + '***');
    const payment = await paymentClient.create({ body });
    console.log('MP PIX status:', payment.status, '| id:', payment.id);

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
    console.error('Erro ao criar PIX:', mpMsg, err);
    return res.status(500).json({ error: `Erro MP: ${mpMsg}` });
  }
});

// ──────────────── ROTA: PAGAMENTO CARTÃO ────────────────
app.post('/api/payment/card', async (req, res) => {
  const {
    name, email, cpf,
    token,          // gerado pelo MP.js no frontend (cardToken)
    installments,
    payment_method_id,
    issuer_id
  } = req.body;

  if (!name || !email || !token) {
    return res.status(400).json({ error: 'Dados incompletos para pagamento com cartão.' });
  }

  try {
    const isLocalhost = (process.env.BACKEND_URL || '').includes('localhost');

    const body = {
      transaction_amount: parseFloat(process.env.PRODUCT_PRICE || '19.90'),
      description: process.env.PRODUCT_NAME || 'Tráfego Pago - Curso',
      token,
      installments: installments || 1,
      payment_method_id,
      issuer_id,
      payer: {
        email,
        first_name: name.split(' ')[0],
        last_name: name.split(' ').slice(1).join(' ') || '-',
        identification: cpf
          ? { type: 'CPF', number: cpf.replace(/\D/g, '') }
          : undefined
      }
    };

    if (!isLocalhost) {
      body.notification_url = `${process.env.BACKEND_URL}/api/webhook`;
    }

    const payment = await paymentClient.create({ body });

    if (payment.status === 'approved') {
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
  // Responde 200 imediatamente pro MP não reenviar
  res.sendStatus(200);

  const { type, data } = req.body;

  if (type !== 'payment' || !data?.id) return;

  try {
    const payment = await paymentClient.get({ id: data.id });

    if (payment.status === 'approved') {
      const payerEmail = payment.payer?.email;
      const payerName = payment.payer?.first_name + ' ' + payment.payer?.last_name;

      console.log(`✅ Pagamento aprovado! ID: ${payment.id}`);

      // Aqui você pode disparar o envio de e-mail via EmailJS REST API
      // ou chamar qualquer outro serviço (ex: Node Mailer, SendGrid, etc.)
      await notifyCustomer({ name: payerName, email: payerEmail, paymentId: payment.id });
    }
  } catch (err) {
    console.error('Erro ao processar webhook:', err);
  }
});

// ──────────────── ENVIO DE EMAIL (via EmailJS REST) ────────────────
async function notifyCustomer({ name, email, paymentId }) {
  const serviceId  = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID;
  const publicKey  = process.env.EMAILJS_PUBLIC_KEY;
  const pdfUrl     = process.env.PDF_URL;

  if (!serviceId || !templateId || !publicKey) {
    console.warn('⚠️ Chaves EmailJS não configuradas no .env. E-mail não enviado.');
    return;
  }

  const body = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    template_params: {
      to_name: name,
      to_email: email,
      order_amount: `R$ ${parseFloat(process.env.PRODUCT_PRICE || '19.90').toFixed(2)}`,
      order_date: new Date().toLocaleDateString('pt-BR'),
      payment_method: 'Mercado Pago',
      pdf_link: pdfUrl || '',
      payment_id: String(paymentId)
    }
  };

  try {
    const resp = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (resp.ok) {
      console.log(`📧 E-mail enviado (payment: ${paymentId})`);
    } else {
      console.error('❌ Falha ao enviar e-mail:', await resp.text());
    }
  } catch (err) {
    console.error('❌ Erro ao chamar EmailJS:', err);
  }
}

// ──────────────── START ────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server rodando na porta ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
});
