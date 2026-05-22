# Deployment - Tráfego Pago | ads.dominio.com

## ✅ Validação Local

- Frontend: http://localhost:5500
- Backend: http://localhost:3002
- Status: **PRONTO PARA PRODUÇÃO**

---

## 📋 Passos para Subir na VPS

### 1. **Transferência de Arquivos**

Via SCP ou FTP, envie a pasta `ads/` completa para:
```
/home/seu_usuario/apps/trafego-pago/
```

Estrutura esperada:
```
/home/seu_usuario/apps/trafego-pago/
├── ads/
│   ├── index.html
│   ├── script.js
│   ├── styles.css
│   ├── config.js
│   └── backend/
│       ├── server.js
│       ├── package.json
│       └── .env
```

### 2. **Atualizar Configurações**

**arquivo: `ads/config.js`**
```javascript
const ENV = {
  EMAILJS_PUBLIC_KEY:  'y6dVefqw92jbm_aKp',
  EMAILJS_SERVICE_ID:  'service_gwkbtdo',
  EMAILJS_TEMPLATE_ID: 'template_b2q2m33',
  PDF_URL: 'https://drive.google.com/file/d/1_wiBiN9ixc73oxuhF7XC1TzC8pwkoXpu/view?usp=sharing',
  MP_PUBLIC_KEY: 'APP_USR-2f88649b-6a83-433b-af3c-613c1f8b1d23',
  BACKEND_URL: 'https://ads.dominio.com.br', // ← ALTERAR PARA DOMÍNIO
};
```

**arquivo: `ads/backend/.env`**
```
MP_ACCESS_TOKEN=APP_USR-6132691109052760-041318-267250b1ad4e37d5cfef9e1291d30267-253370854
PORT=3002
FRONTEND_URL=https://ads.dominio.com.br
BACKEND_URL=https://ads.dominio.com.br
PRODUCT_PRICE=19.90
PRODUCT_NAME=Curso Trafego Pago - Guia Completo | Cursos Práticos
PDF_URL=https://drive.google.com/file/d/1_wiBiN9ixc73oxuhF7XC1TzC8pwkoXpu/view?usp=sharing
EMAILJS_PUBLIC_KEY=y6dVefqw92jbm_aKp
EMAILJS_SERVICE_ID=service_gwkbtdo
EMAILJS_TEMPLATE_ID=template_b2q2m33
```

### 3. **Instalar Dependências**

Na VPS, dentro de `/home/seu_usuario/apps/trafego-pago/ads/backend/`:
```bash
npm install
```

### 4. **Configurar Nginx**

Criar arquivo: `/etc/nginx/sites-available/ads.dominio.com`

```nginx
server {
    listen 80;
    server_name ads.dominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ads.dominio.com;

    ssl_certificate /etc/letsencrypt/live/ads.dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ads.dominio.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend (HTML, CSS, JS)
    location / {
        root /home/seu_usuario/apps/trafego-pago/ads;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3002;
    }
}
```

Ativar site:
```bash
sudo ln -s /etc/nginx/sites-available/ads.dominio.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5. **SSL (Let's Encrypt)**

```bash
sudo certbot certonly --nginx -d ads.dominio.com
```

### 6. **Configurar PM2 (Process Manager)**

Instalar PM2:
```bash
npm install -g pm2
```

Criar arquivo: `/home/seu_usuario/apps/trafego-pago/ads/backend/ecosystem.config.js`

```javascript
module.exports = {
  apps: [{
    name: 'trafego-pago-api',
    script: './server.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log'
  }]
};
```

Iniciar com PM2:
```bash
cd /home/seu_usuario/apps/trafego-pago/ads/backend
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 7. **DNS**

Apontar o subdomínio `ads` para o IP da VPS no seu provedor DNS:
```
A Record: ads.dominio.com → IP_DA_VPS
```

---

## 🚀 Comandos Úteis

### Logs do Backend
```bash
pm2 logs trafego-pago-api
```

### Verificar Status
```bash
pm2 status
pm2 monit
```

### Restart
```bash
pm2 restart trafego-pago-api
```

### Nginx
```bash
sudo systemctl status nginx
sudo systemctl restart nginx
tail -f /var/log/nginx/error.log
```

---

## 🧪 Testes Após Deploy

1. **Verificar Frontend:**
   - Abra: https://ads.dominio.com.br
   - Verifique: Hero, módulos, pricing, checkout

2. **Verificar Backend:**
   - Acesse: https://ads.dominio.com.br/health
   - Deve retornar: `{"status":"ok","timestamp":"..."}`

3. **Teste de Pagamento:**
   - Preencha o formulário de lead
   - Vá para checkout
   - Teste PIX (não precisa pagar, apenas gerar QR)
   - Verifique se o backend está recebendo requests

---

## 📝 Checklist Final

- [ ] Arquivos enviados para VPS
- [ ] `config.js` atualizado com domínio
- [ ] `.env` configurado corretamente
- [ ] `npm install` executado
- [ ] Nginx configurado e SSL ativo
- [ ] PM2 rodando backend em cluster
- [ ] DNS apontando para VPS
- [ ] Frontend carrega sem erros
- [ ] Backend responde em `/health`
- [ ] Checkout funciona
- [ ] Emails são enviados

---

## 🎯 URLs Finais

- **Frontend:** https://ads.dominio.com.br
- **Backend:** https://ads.dominio.com.br/api (via proxy)
- **Health:** https://ads.dominio.com.br/health

---

**Data**: 23/04/2026  
**Versão**: 1.0 - Produção  
**Status**: ✅ Pronto para Deploy
