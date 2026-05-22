# 🧪 GUIA DE TESTES - Landing Page Conversão

## ✅ Antes de Começar

1. **Certifique-se de que os arquivos estão criados:**
   - [ ] `index.html`
   - [ ] `styles.css`
   - [ ] `script.js`
   - [ ] `config.js` (com suas chaves EmailJS)
   - [ ] All files in same directory

2. **Abra a página no navegador:**
   ```
   Abra arquivo index.html no seu navegador (Ctrl+O ou arrastar para o navegador)
   ```

3. **Abra Developer Tools:**
   ```
   F12 ou Ctrl+Shift+I → Aba "Console"
   ```

---

## 🔧 TESTE 1: Verificar Config.js Carregado

**O que fazer:**
1. Abra o Console (F12)
2. Digite: `window.ENV`
3. Pressione Enter

**Resultado esperado:**
```javascript
{
  EMAILJS_PUBLIC_KEY: "y6dVefqw92jbm_aKp",
  EMAILJS_SERVICE_ID: "service_gwkbtdo",
  EMAILJS_TEMPLATE_ID: "template_b2q2m33",
  PDF_URL: "https://drive.google.com/file/d/..."
}
```

**Se vazio (undefined) ou vazio:**
- ❌ Problema: config.js não carregou
- 🔍 Verificar: 
  - config.js existe no mesmo diretório?
  - Erro na sintaxe de config.js?
  - Abrir Console → Aba "Network" → refresh → procurar por config.js

---

## 🔧 TESTE 2: Verificar EmailJS Inicializado

**O que fazer:**
1. Refresh na página (F5)
2. Abra Console imediatamente
3. Procure por mensagem: `✅ EmailJS inicializado`

**Resultado esperado:**
```
✅ EmailJS inicializado com PUBLIC_KEY: y6dVefqw92jbm_a...
```

**Se NÃO aparecer:**
- ❌ Problema: EmailJS não inicializou
- 🔍 Verificar:
  - CDN do EmailJS carregou? Console → Aba Network → procurar por "script.js" do EmailJS
  - Se houver erro vermelho: ler a mensagem de erro
  - Exemplo: "❌ Erro ao inicializar EmailJS: ..."

---

## 🔧 TESTE 3: Testar Lead Form (Captura de Lead)

**O que fazer:**
1. Preencha o form no hero:
   - Nome: "João Silva"
   - Email: "seu_email@gmail.com"
2. Clique "Começar Agora"
3. Abra Console → Aba "Network"

**Resultado esperado:**
- Página scrollar para seção #checkout
- Console mostrar: dados do lead coletados
- Lead form desaparecer (ou ficar disabled)

---

## 🔧 TESTE 4: Teste Checkout Completo

### PASSO 1: Preencher Dados Pessoais

**Na seção Checkout, Step 1:**
1. Nome: "João Silva"
2. Email: "seu_email@gmail.com"
3. Telefone: "11987654321"
4. Clique "Próximo"

**Resultado esperado:**
- Validações verdes (✓)
- Step 1 → Step 2 (animação)

**Se erro:**
- Nome vazio → "Nome obrigatório"
- Email inválido → "E-mail inválido"
- Telefone < 11 dígitos → "Telefone inválido"

---

### PASSO 2: Selecionar Forma de Pagamento

**Seção Step 2:**

#### Opção A: Cartão de Crédito
1. Clique na aba "Cartão de Crédito"
2. Preencha:
   - Número: `4111111111111111` (teste Stripe)
   - Validade: `12/25`
   - CVV: `123`
3. Clique "Finalizar Pedido"

#### Opção B: PIX
1. Clique na aba "PIX"
2. Clique "Finalizar Pedido"

**Resultado esperado:**
- Validações passarem (cartão)
- Modal de sucesso aparecer com:
  - "Pedido Realizado com Sucesso! ✨"
  - Dados do pedido
  - Mensagem: "📧 Verifique seu e-mail em breve!"

---

## 📧 TESTE 5: Verificar Envio de E-mail

**O que fazer:**
1. Complete TESTE 4 (checkout completo)
2. Modal de sucesso aparecer
3. Abra Console → procure por:

**Resultado esperado:**
```
📧 Enviando e-mail com PDF para: seu_email@gmail.com
✅ E-mail enviado com sucesso!
```

**Se erro:**
```
❌ ERRO: Chaves do EmailJS não configuradas
```
→ Ir para TESTE 1

**Se timeout:**
```
❌ Erro ao enviar e-mail: {mensagem}
```
→ Verificar:
- Chaves EmailJS estão corretas em config.js?
- Template `template_b2q2m33` existe em https://emailjs.com?
- Service `service_gwkbtdo` existe?
- Variáveis de template corretas? (to_name, to_email, order_amount, etc.)

---

## 🎯 TESTE 6: Verificar E-mail Recebido

**O que fazer:**
1. Complete TESTE 4 (checkout)
2. Aguarde 30 segundos (EmailJS processa)
3. Abra seu e-mail (Gmail, Outlook, etc.)
4. Procure por e-mail da sua conta EmailJS

**Resultado esperado:**
```
De: seu_email@gmail.com (via EmailJS)
Assunto: [Template configurado]

Corpo:
- Nome: João Silva
- Valor: R$ 97.00
- Método: Cartão de Crédito
- PDF: [Link Google Drive]
```

**Se NÃO receber:**
- [ ] Checar pasta SPAM/Lixo
- [ ] Verificar e-mail digitado no checkout
- [ ] Testar enviando e-mail manualmente em emailjs.com
- [ ] Verificar limite da conta EmailJS (free = 200/mês)

---

## ⚠️ TROUBLESHOOTING

### Problema: "Public Key vazia"
```javascript
localStorage.clear(); // Limpar cache
location.reload();    // Recarregar página
```

### Problema: Form não scrolla
- Teste: `goToSection('#checkout')` no Console
- Se funcionar → problema está no botão

### Problema: Validação não funciona
- Abrir Console → Aba Network → recarregar
- Procurar erros JavaScript (vermelho)

### Problema: EmailJS não inicializa
```javascript
// No Console, digite:
console.log(window.emailjs); // deve ser objeto, não undefined
console.log(window.ENV);     // deve ter chaves
```

---

## ✨ Checklist Final

- [ ] Config.js carrega (TESTE 1)
- [ ] EmailJS inicializa (TESTE 2)
- [ ] Lead form funciona (TESTE 3)
- [ ] Checkout completa (TESTE 4)
- [ ] E-mail é enviado (TESTE 5)
- [ ] E-mail é recebido na caixa (TESTE 6)
- [ ] Nenhum erro vermelho no Console
- [ ] Página responsiva no celular (F12 → Mobile)

---

## 📝 Notas Importantes

1. **EmailJS Free Tier:**
   - 200 e-mails por mês (gratuito)
   - Após limite → comprar créditos

2. **Teste com e-mail real:**
   - Usar e-mail pessoal para receber PDFs testes
   - Exemplo: seu_email@gmail.com

3. **Próximas Etapas (opcional):**
   - [ ] Implementar backend Node.js para armazenar pedidos
   - [ ] Integrar pagamento real (Stripe, MercadoPago)
   - [ ] Deploy na produção (Netlify, Vercel)
   - [ ] Analytics/Rastreamento de conversão

---

**Última atualização:** $(date) | **Status:** ✅ Pronto para Testes
