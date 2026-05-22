# 🎓 Tráfego Pago - Plataforma de Vendas

Plataforma de e-learning para o curso "Tráfego Pago: Guia Completo" com integração de pagamentos via Mercado Pago.

## 🚀 Quick Start

### **Local Development**
```bash
# Frontend
cd ads && python -m http.server 5500

# Backend (em outro terminal)
cd backend && npm install && npm run dev
```

Frontend: http://localhost:5500  
Backend: http://localhost:3002

### **Deploy na Vercel** (RECOMENDADO)
Veja [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md) para instruções completas.

---

## 📁 Estrutura do Projeto

```
.
├── ads/                 # Frontend - Landing Page
│   ├── index.html       # Página principal
│   ├── script.js        # Lógica JavaScript
│   ├── styles.css       # Estilos
│   └── config.js        # Configurações (Mercado Pago, EmailJS)
├── backend/             # Backend Express (produção VPS)
│   ├── server.js        # Servidor principal
│   └── package.json     # Dependências
├── api/                 # API Serverless (Vercel)
│   ├── server.js        # Handler serverless
│   └── package.json     # Dependências
└── vercel.json          # Configuração Vercel

```

---

## 💳 Funcionalidades

- ✅ **Landing Page Responsiva** - Design Google Ads Professional (Blue #1967d2 + Dark Gray)
- ✅ **Sistema de Pagamento** - PIX com QR Code + Cartão de Crédito
- ✅ **Curriculum** - 17 módulos com 60+ lições (3-35 min cada)
- ✅ **Validação de Formulário** - CPF, Email, Telefone
- ✅ **Entrega de PDF** - Automática via EmailJS pós-compra
- ✅ **Modal de Confirmação** - SweetAlert2 com status real-time

---

## 🔧 Tecnologias

- **Frontend**: HTML5, CSS3, Vanilla JavaScript, Lucide Icons (450+ SVG)
- **Backend**: Express.js, Node.js, Mercado Pago SDK
- **Pagamentos**: Mercado Pago (PIX + Cartão)
- **Email**: EmailJS
- **Hosting**: Vercel (Frontend + Serverless API)
- **DNS**: Cloudflare (recomendado)

---

## 📊 Variáveis de Ambiente

```env
MP_ACCESS_TOKEN=seu_access_token_mercado_pago
EMAILJS_SERVICE_ID=seu_service_id
EMAILJS_TEMPLATE_ID=seu_template_id
EMAILJS_PUBLIC_KEY=sua_chave_publica
EMAILJS_PRIVATE_KEY=sua_chave_privada
PDF_URL=link_do_seu_pdf
PRODUCT_PRICE=19.90
```

Veja `.env.example` para template completo.

---

## 🌐 Endpoints API

```
POST   /api/payment/pix       - Gerar pagamento PIX
POST   /api/payment/card      - Processar cartão de crédito
GET    /api/payment/:id/status - Verificar status do pagamento
POST   /api/webhook            - Webhook Mercado Pago
GET    /health                 - Health check
```

---

## 📈 Performance

- ⚡ HTTP/2 habilitado
- 🔒 HTTPS/TLS 1.2+ obrigatório
- 📱 100% Responsivo (Mobile-first)
- 🎨 Tema escuro otimizado para conversão
- ⏱️ Carregamento < 2s

---

## 👥 Autor

Desenvolvido para Vita Hurb - Cursos Práticos

---

## 📝 Licença

Propriedade privada - Todos os direitos reservados
