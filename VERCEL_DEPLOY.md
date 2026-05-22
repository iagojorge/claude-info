# 🚀 Deploy Vercel - Guia Rápido

## ✅ Já Feito:
- ✅ Estrutura do projeto pronta
- ✅ `vercel.json` configurado
- ✅ API serverless em `/api/server.js`
- ✅ Git inicializado e primeiro commit feito

## 📝 Próximos Passos (3 minutos):

### **1. Criar Repositório no GitHub**

1. Acesse: https://github.com/new
2. Preencha:
   - **Repository name**: `trafego-pago` (ou outro nome)
   - **Description**: "Plataforma de vendas - Curso Tráfego Pago"
   - **Public** ✅ (para Vercel funcionar melhor)
3. Clique **"Create repository"**

### **2. Fazer Push do Código (copie e execute)**

```powershell
cd "c:\Users\iagob\OneDrive\Documentos\Projetos\Moises"

git branch -M main

git remote add origin https://github.com/SEU_USUARIO/trafego-pago.git

git push -u origin main
```

> **Substitua `SEU_USUARIO` pelo seu nome de usuário do GitHub!**

### **3. Deploy na Vercel**

1. Acesse: https://vercel.com/new
2. Clique em **"Import Git Repository"**
3. Selecione seu repositório `trafego-pago`
4. Clique **"Import"**

### **4. Configurar Variáveis de Ambiente**

No painel da Vercel, vá em **"Environment Variables"** e adicione:

```
MP_ACCESS_TOKEN = APP_USR-6132691109052760-041318-267250b1ad4e37d5cfef9e1291d30267-253370854
FRONTEND_URL = https://seu-projeto.vercel.app
BACKEND_URL = https://seu-projeto.vercel.app
PRODUCT_PRICE = 19.90
PRODUCT_NAME = Curso Trafego Pago - Guia Completo | Cursos Praticos
PDF_URL = https://drive.google.com/file/d/1_wiBiN9ixc73oxuhF7XC1TzC8pwkoXpu/view?usp=sharing
EMAILJS_SERVICE_ID = service_gwkbtdo
EMAILJS_TEMPLATE_ID = template_b2q2m33
EMAILJS_PUBLIC_KEY = y6dVefqw92jbm_aKp
EMAILJS_PRIVATE_KEY = seu_private_key_aqui
```

### **5. Deploy!**

Clique **"Deploy"** e aguarde ~2-3 minutos

---

## 🎉 Pronto!

Seu site estará em: `https://seu-projeto.vercel.app`

### URLs:
- **Frontend**: `https://seu-projeto.vercel.app`
- **API**: `https://seu-projeto.vercel.app/api/payment/pix` etc

---

## 📞 Dúvidas?
- Erro de build? Verifique Environment Variables
- API não funciona? Certifique-se MP_ACCESS_TOKEN está correto
- Precisa de domínio customizado? Vercel oferece gratuitamente via CNAME
