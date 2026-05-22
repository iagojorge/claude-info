import express from 'express';
import cors from 'cors';
import * as mercadopago from 'mercadopago';

const app = express();

// Middleware
app.use(cors({
  origin: [
    'https://ads.vita-hurb.com.br',
    'https://trafego-pago.vercel.app',
    'http://localhost:3000',
    'http://localhost:5500'
  ]
}));
app.use(express.json());

// Initialize Mercado Pago
mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN
});

// Helper: Validate CPF
function isValidCPF(cpf) {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11) return false;
  
  let sum = 0;
  let remainder;
  
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(9, 10))) return false;
  
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(10, 11))) return false;
  
  return true;
}

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
