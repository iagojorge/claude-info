# 🚀 Deploy Vercel - CONSOLIDADO ✅

## 📦 Arquitetura Final

```
claude-info/
├── index.html              ← Frontend 1 (Bike Moto Elétrica) [RAIZ]
├── script.js
├── styles.css
├── config.js
│
├── ads/                    ← Frontend 2 (Tráfego Pago) [/ads/*]
│   ├── index.html
│   ├── script.js
│   ├── styles.css
│   └── config.js
│
├── api/
│   ├── server.js           ← Backend ÚNICO (ESM) [/api/*]
│   └── package.json
│
├── vercel.json             ← Configuração Vercel (2 fronts + 1 back)
└── package.json
```

---

## ✅ O que foi Consolidado

| Item | Antes | Depois | Status |
|------|-------|--------|--------|
| **Frontend 1** | `/index.html` | Serve em `/` | ✅ Pronto |
| **Frontend 2** | `/ads/index.html` | Serve em `/ads/*` | ✅ Pronto |
| **Backend** | 2 arquivos (CommonJS + ESM) | 1 arquivo único (`/api/server.js` ESM) | ✅ Consolidado |
| **Config Backend** | CommonJS + Old SDK | ESM + Novo SDK Mercado Pago | ✅ Atualizado |
| **URL Dinâmica** | Hardcoded | Auto-detecta (localhost vs Vercel) | ✅ Dinâmica |

---

## 🔧 Roteamento Vercel (vercel.json)

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/server.js" },
    { "source": "/ads/(.*)", "destination": "/ads/index.html" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**O Que Significa:**
- `https://seu-projeto.vercel.app/` → Mostra Frontend 1 (Raiz)
- `https://seu-projeto.vercel.app/ads/` → Mostra Frontend 2 (Ads)
- `https://seu-projeto.vercel.app/api/*` → Rota para Backend

---

## 📝 Como fazer Deploy Agora

### **Passo 1: No Vercel Dashboard**

1. Acesse: https://vercel.com/new
2. Selecione seu repositório `iagojorge/claude-info`
3. Clique **"Import"**

### **Passo 2: Configure Environment Variables**

No painel da Vercel, vá em **Settings → Environment Variables** e cole:

```
MP_ACCESS_TOKEN=APP_USR-6132691109052760-041318-267250b1ad4e37d5cfef9e1291d30267-253370854

EMAILJS_SERVICE_ID=service_gwkbtdo
EMAILJS_TEMPLATE_ID=template_b2q2m33
EMAILJS_PUBLIC_KEY=y6dVefqw92jbm_aKp
EMAILJS_PRIVATE_KEY=sua_chave_privada_emailjs

PRODUCT_PRICE=19.90
PRODUCT_NAME=Curso Trafego Pago - Guia Completo | Cursos Praticos
PDF_URL=https://drive.google.com/file/d/1_wiBiN9ixc73oxuhF7XC1TzC8pwkoXpu/view?usp=sharing

NODE_ENV=production
```

### **Passo 3: Deploy!**

Clique **"Deploy"** e aguarde 2-3 minutos ☕

---

## 🌐 URLs Após Deploy

```
https://seu-projeto.vercel.app/              ← Frontend Raiz (Bikes)
https://seu-projeto.vercel.app/ads/          ← Frontend Ads (Tráfego Pago)
https://seu-projeto.vercel.app/api/health    ← Backend Health Check
https://seu-projeto.vercel.app/api/payment/* ← Endpoints de Pagamento
```

---

## 🧪 Testar Após Deploy

### **1. Health Check**
```bash
curl https://seu-projeto.vercel.app/api/health
# Resposta: {"status":"ok","timestamp":"..."}
```

### **2. Frontend 1**
```bash
# Abra no navegador: https://seu-projeto.vercel.app
```

### **3. Frontend 2**
```bash
# Abra no navegador: https://seu-projeto.vercel.app/ads
```

---

## 🔐 CORS Automático

O backend aceita automaticamente:
- `https://seu-projeto.vercel.app` (Frontend 1)
- `https://seu-projeto.vercel.app/ads` (Frontend 2)
- `localhost:*` (desenvolvimento local)

---

## 🚀 Resumo Final

✅ **2 Frontends Independentes:**
- Frontend Raiz: `index.html` + `script.js` + `styles.css`
- Frontend Ads: `ads/index.html` + `ads/script.js` + `ads/styles.css`

✅ **1 Backend Unificado:**
- Processa pagamentos PIX + Cartão
- Envia PDF via EmailJS
- Webhooks para notificações

✅ **Auto-Detect URLs:**
- Localhost: `http://localhost:3001`
- Vercel: `https://seu-projeto.vercel.app`

✅ **Pronto para Escalar:**
- Múltiplos fronts em um único backend
- Suporta mais frontends facilmente
- Vercel auto-escala conforme demanda

---

## 📞 Dúvidas?

- Erro de build? Verifique Environment Variables
- API não conecta? Teste `/api/health` endpoint
- CORS bloqueado? Adicione domínio em `api/server.js`
