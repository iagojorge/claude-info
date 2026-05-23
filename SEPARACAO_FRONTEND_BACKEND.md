# 🔧 Separação Frontend + Backend - Guia de Configuração

## 📦 Repositórios

### Frontend
- **Repositório**: https://github.com/iagojorge/claude-info
- **Vercel**: https://claude-info.vercel.app
- **Contém**: Frontends (Principal + Ads), configurações, assets

### Backend
- **Repositório**: https://github.com/iagojorge/claude-info-back
- **Vercel**: https://claude-info-back.vercel.app (você precisa fazer deploy)
- **Contém**: APIs serverless para pagamentos

---

## 🚀 Deploy no Vercel

### 1. Deploy Backend (claude-info-back)

**Primeiro deploy:**
```bash
# No Vercel Dashboard:
1. Ir para https://vercel.com/new
2. Selecionar repositório: claude-info-back
3. Configurar Variáveis de Ambiente:
   - MP_ACCESS_TOKEN = seu_token_mp
   - PRODUCT_PRICE = 19.90
   - PRODUCT_NAME = Curso
4. Clicar em Deploy
```

**URLs do Backend após deploy:**
- Health Check: `https://claude-info-back.vercel.app/api/health`
- PIX: `POST https://claude-info-back.vercel.app/api/payment/pix`
- Cartão: `POST https://claude-info-back.vercel.app/api/payment/card`
- Status: `GET https://claude-info-back.vercel.app/api/payment/{id}`

### 2. Frontend está Pronto
O frontend (claude-info) já está configurado para apontar para o backend separado:
```javascript
// config.js
BACKEND_URL: 'https://claude-info-back.vercel.app'
```

---

## ✅ Testes

Após fazer deploy do backend, testar:

```bash
# Health Check
curl https://claude-info-back.vercel.app/api/health

# PIX Payment
curl -X POST https://claude-info-back.vercel.app/api/payment/pix \
  -H "Content-Type: application/json" \
  -d '{"name":"Teste","email":"test@test.com"}'

# Payment Status
curl https://claude-info-back.vercel.app/api/payment/160642145512
```

---

## 📝 Estrutura Final

```
Claude Info Platform (2 repositórios)
├── Frontend (claude-info)
│   ├── / (Frontend Principal - Bikes)
│   ├── /ads/ (Frontend Anúncios - Tráfego)
│   └── config.js (aponta para backend)
│
└── Backend (claude-info-back)
    ├── /api/health
    ├── /api/payment/pix
    ├── /api/payment/card
    └── /api/payment/{id}
```

---

## 🔗 URLs de Acesso

| Componente | URL |
|-----------|-----|
| Frontend Principal | https://claude-info.vercel.app/ |
| Frontend Ads | https://claude-info.vercel.app/ads/ |
| Backend API | https://claude-info-back.vercel.app/api/* |
| Config Frontend | https://claude-info.vercel.app/config.js |

---

## ⚙️ Próximos Passos

1. ✅ Backend repository criado: `claude-info-back`
2. ✅ Frontend removido do api/backend
3. ⏳ **Você precisa**: Fazer deploy do backend no Vercel
4. ⏳ **Você precisa**: Configurar variáveis de ambiente do Mercado Pago
5. ✅ Frontend está pronto e apontando para o backend

Após fazer deploy do backend, tudo funcionará automaticamente!
