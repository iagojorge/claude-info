import express from 'express';
import cors from 'cors';
import { MercadoPagoConfig, Payment } from 'mercadopago';

const app = express();

// Log de início
console.log('🚀 Server iniciando...');

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

// CORS - Libera todos os origins
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
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
// Nota: Vercel pode passar como /payment/pix ou /api/payment/pix
app.post(['/payment/pix', '/api/payment/pix'], async (req, res) => {
  console.log('📥 [PIX] Recebido:', { email: req.body.email, name: req.body.name });
  const { name, email, cpf } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Nome e e-mail são obrigatórios.' });
  }

  const cpfDigits = (cpf || '').replace(/\D/g, '');
  if (cpf && !isValidCPF(cpfDigits)) {
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
        identification: cpfDigits ? { type: 'CPF', number: cpfDigits } : undefined
      }
    };

    console.log('🔄 [PIX] Criando com MP...');
    const payment = await paymentClient.create({ body });
    console.log('✅ [PIX] Criado ID:', payment.id);

    // Extrai QR code
    let qrCode = '';
    let qrCodeBase64 = '';

    if (payment.point_of_interaction?.qr_code?.content) {
      qrCode = payment.point_of_interaction.qr_code.content;
    }
    if (payment.point_of_interaction?.transaction_data?.qr_code) {
      qrCode = payment.point_of_interaction.transaction_data.qr_code;
    }
    if (payment.point_of_interaction?.transaction_data?.qr_code_base64) {
      qrCodeBase64 = payment.point_of_interaction.transaction_data.qr_code_base64;
    }

    if (!qrCode && !qrCodeBase64) {
      console.error('❌ [PIX] Sem QR code:', JSON.stringify(payment));
      return res.status(500).json({ error: 'Erro ao gerar PIX' });
    }

    return res.json({
      payment_id: payment.id,
      status: payment.status || 'pending',
      qr_code: qrCode,
      qr_code_base64: qrCodeBase64,
      expires_at: payment.date_of_expiration
    });
  } catch (err) {
    console.error('❌ [PIX] Erro:', err.message);
    return res.status(500).json({ error: 'Erro ao processar PIX: ' + err.message });
  }
});

// ──────────────── ROTA: PAGAMENTO CARTÃO ────────────────
app.post(['/payment/card', '/api/payment/card'], async (req, res) => {
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
    console.error('❌ [CARD] Erro:', err.message);
    return res.status(500).json({ error: 'Erro ao processar cartão. Tente novamente.' });
  }
});

// ──────────────── ROTA: CONSULTAR STATUS PAGAMENTO ────────────────
app.get(['/payment/:id/status', '/api/payment/:id/status'], async (req, res) => {
  try {
    const payment = await paymentClient.get({ id: req.params.id });
    return res.json({ payment_id: payment.id, status: payment.status });
  } catch (err) {
    console.error('❌ [STATUS] Erro:', err.message);
    return res.status(500).json({ error: 'Erro ao consultar pagamento.' });
  }
});

// ──────────────── ROTA: WEBHOOK (notificações do MP) ────────────────
app.post(['/webhook', '/api/webhook'], async (req, res) => {
  res.sendStatus(200);

  const { type, data } = req.body;
  if (type !== 'payment' || !data?.id) return;

  try {
    const payment = await paymentClient.get({ id: data.id });

    if (payment.status === 'approved') {
      const payerEmail = payment.payer?.email;
      const payerName = payment.payer?.first_name;
      console.log(`✅ [WEBHOOK] Pagamento ${payment.id} aprovado!`);
      await notifyCustomer(payerEmail, payerName, payment.id);
    }
  } catch (err) {
    console.error('❌ [WEBHOOK] Erro:', err.message);
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
