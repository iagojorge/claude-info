/* ============================================
   CURSOS PRÁTICOS — Landing Page Scripts
   ============================================ */

(function () {
  'use strict';

  // ──────────────── UTILS ────────────────
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return [...(ctx || document).querySelectorAll(sel)]; }

  // Função de scroll sem sobrescrever window.scrollTo
  window.goToSection = function (sel) {
    const el = $(sel);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ──────────────── BACKEND URL ────────────────
  function getBackendUrl() {
    // Primeiro tenta usar ENV do config.js
    if (window.ENV && window.ENV.BACKEND_URL) {
      return window.ENV.BACKEND_URL.replace(/\/$/, ''); // Remove trailing slash
    }
    
    // Se não tiver ENV, detecta automaticamente
    const h = window.location.hostname;
    const p = window.location.pathname;
    
    // Localhost: retorna porta 3001 (backend de desenvolvimento)
    if (h === 'localhost' || h === '127.0.0.1') {
      return 'http://localhost:3001';
    }
    
    // Vercel/Producción: retorna mesmo domínio (a API está em /api)
    if (h.includes('vercel.app') || h.includes('.com.br')) {
      const protocol = window.location.protocol;
      return `${protocol}//${h}`.replace(/\/$/, '');
    }
    
    // Fallback
    return '';
  }
  
  // Exponibiliza globalmente
  window.getBackendUrl = getBackendUrl;

  // ──────────────── MP INSTANCE ────────────────
  let mpInstance = null;
  const MP_KEY = 'APP_USR-2f88649b-6a83-433b-af3c-613c1f8b1d23';

  function initMP() {
    const key = (window.ENV && window.ENV.MP_PUBLIC_KEY) || MP_KEY;
    if (!key) {
      console.warn('⚠️ MP_PUBLIC_KEY não definida');
      return;
    }
    if (!window.MercadoPago) {
      console.warn('⚠️ SDK do Mercado Pago ainda não carregou');
      return;
    }
    try {
      mpInstance = new MercadoPago(key, { locale: 'pt-BR' });
      console.log('✅ Mercado Pago SDK inicializado');
    } catch (e) {
      console.error('❌ Erro ao inicializar MP:', e);
    }
  }

  // ──────────────── EMAILJS CONFIG ────────────────
  const DEFAULT_CONFIG = {
    PUBLIC_KEY: 'y6dVefqw92jbm_aKp',
    SERVICE_ID: 'service_gwkbtdo',
    TEMPLATE_ID: 'template_b2q2m33',
    PDF_URL: 'https://drive.google.com/file/d/1_wiBiN9ixc73oxuhF7XC1TzC8pwkoXpu/view?usp=sharing'
  };

  let emailConfig = DEFAULT_CONFIG;

  // Inicializa EmailJS
  function initEmailJS() {
    // Tenta usar window.ENV (se config.js carregar), senão usa DEFAULT_CONFIG
    if (window.ENV && window.ENV.EMAILJS_PUBLIC_KEY) {
      emailConfig = {
        PUBLIC_KEY: window.ENV.EMAILJS_PUBLIC_KEY,
        SERVICE_ID: window.ENV.EMAILJS_SERVICE_ID,
        TEMPLATE_ID: window.ENV.EMAILJS_TEMPLATE_ID,
        PDF_URL: window.ENV.PDF_URL
      };
      console.log('✅ Usando chaves de config.js');
    } else {
      console.log('✅ Usando chaves hardcoded (padrão)');
    }

    if (!emailConfig.PUBLIC_KEY) {
      console.error('❌ ERRO: Chaves do EmailJS não configuradas!');
      return false;
    }

    if (window.emailjs) {
      try {
        emailjs.init(emailConfig.PUBLIC_KEY);
        console.log('✅ EmailJS inicializado');
        return true;
      } catch (e) {
        console.error('❌ Erro ao inicializar EmailJS:', e);
        return false;
      }
    }
    return false;
  }

  // ──────────────── SEND EMAIL WITH PDF ────────────────
  function sendCoursePDF(order) {
    // Verifica se EmailJS está disponível
    if (!window.emailjs) {
      console.warn('❌ EmailJS SDK não carregado. E-mail não será enviado.');
      return Promise.resolve();
    }

    // Verifica se as chaves estão configuradas
    if (!emailConfig || !emailConfig.PUBLIC_KEY) {
      console.error('❌ ERRO: Chaves do EmailJS não configuradas. Verifique config.js');
      return Promise.resolve();
    }

    console.log('📧 Enviando e-mail...');

    const templateParams = {
      to_name: order.name,
      to_email: order.email,
      order_amount: 'R$ ' + order.amount.toFixed(2),
      order_date: new Date(order.timestamp).toLocaleDateString('pt-BR'),
      payment_method: order.method === 'pix' ? 'PIX' : 'Cartão de Crédito',
      pdf_link: emailConfig.PDF_URL || '',
    };

    return emailjs.send(emailConfig.SERVICE_ID, emailConfig.TEMPLATE_ID, templateParams)
      .then(function (response) {
        console.log('✅ E-mail enviado com sucesso!', response);
      })
      .catch(function (err) {
        console.error('❌ Erro ao enviar e-mail:', err);
      });
  }

  // ──────────────── COUNTDOWN TIMER ────────────────
  function initCountdown() {
    const STORAGE_KEY = 'tp_countdown_end';
    const HOURS = 2;
    let endTime = localStorage.getItem(STORAGE_KEY);

    if (!endTime || Number(endTime) < Date.now()) {
      endTime = Date.now() + HOURS * 60 * 60 * 1000;
      localStorage.setItem(STORAGE_KEY, endTime);
    } else {
      endTime = Number(endTime);
    }

    function tick() {
      const diff = Math.max(0, endTime - Date.now());
      const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
      const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
      const str = `${h}:${m}:${s}`;

      const top = $('#countdownTop');
      const final = $('#countdownFinal');
      if (top) top.textContent = str;
      if (final) final.textContent = str;

      if (diff <= 0) {
        // Reset timer
        endTime = Date.now() + HOURS * 60 * 60 * 1000;
        localStorage.setItem(STORAGE_KEY, endTime);
      }
    }

    tick();
    setInterval(tick, 1000);
  }

  // ──────────────── FLOATING CTA ────────────────
  function initFloatingCta() {
    const el = $('#floatingCta');
    if (!el) return;
    let visible = false;

    function check() {
      const shouldShow = window.scrollY > 600;
      if (shouldShow !== visible) {
        visible = shouldShow;
        el.classList.toggle('visible', visible);
      }
    }

    window.addEventListener('scroll', check, { passive: true });
    check();
  }

  // ──────────────── FAQ ACCORDION ────────────────
  window.toggleFaq = function (btn) {
    const item = btn.closest('.faq-item');
    const answer = item.querySelector('.faq-answer');
    const isOpen = btn.classList.contains('open');

    // Close all
    $$('.faq-question.open').forEach(function (b) {
      b.classList.remove('open');
      b.closest('.faq-item').querySelector('.faq-answer').style.maxHeight = '0';
    });

    if (!isOpen) {
      btn.classList.add('open');
      answer.style.maxHeight = answer.scrollHeight + 'px';
    }
  };

  // ──────────────── CURRICULUM ACCORDION ────────────────
  window.toggleModule = function (header) {
    const mod = header.closest('.curriculum-module');
    const body = mod.querySelector('.module-body');
    const isOpen = header.classList.contains('open');

    $$('.module-header.open').forEach(function (h) {
      h.classList.remove('open');
      h.closest('.curriculum-module').querySelector('.module-body').style.maxHeight = '0';
    });

    if (!isOpen) {
      header.classList.add('open');
      body.style.maxHeight = body.scrollHeight + 'px';
    }
  };

  // ──────────────── VALIDATION HELPERS ────────────────
  function validateName(value) {
    if (!value.trim()) return 'Por favor, informe seu nome.';
    if (value.trim().length < 3) return 'Nome muito curto.';
    return '';
  }

  function validateEmail(value) {
    if (!value.trim()) return 'Por favor, informe seu e-mail.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'E-mail inválido.';
    return '';
  }

  function validatePhone(value) {
    const digits = value.replace(/\D/g, '');
    if (!digits) return 'Por favor, informe seu WhatsApp.';
    if (digits.length < 10) return 'Número incompleto.';
    return '';
  }

  function showError(inputId, errorId, msg) {
    const input = $('#' + inputId);
    const err = $('#' + errorId);
    if (input) input.classList.toggle('error', !!msg);
    if (err) err.textContent = msg;
    return !msg;
  }

  // ──────────────── FORMAT PHONE ────────────────
  function formatPhone(e) {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 11) v = v.substring(0, 11);
    if (v.length > 6) {
      e.target.value = '(' + v.substring(0, 2) + ') ' + v.substring(2, 7) + '-' + v.substring(7);
    } else if (v.length > 2) {
      e.target.value = '(' + v.substring(0, 2) + ') ' + v.substring(2);
    } else if (v.length > 0) {
      e.target.value = '(' + v;
    } else {
      e.target.value = '';
    }
  }

  // ──────────────── FORMAT CARD NUMBER ────────────────
  function formatCard(e) {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 16) v = v.substring(0, 16);
    e.target.value = v.replace(/(.{4})/g, '$1 ').trim();
  }

  // ──────────────── FORMAT EXPIRY ────────────────
  function formatExpiry(e) {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 4) v = v.substring(0, 4);
    if (v.length >= 2) {
      e.target.value = v.substring(0, 2) + '/' + v.substring(2);
    } else {
      e.target.value = v;
    }
  }

  // ──────────────── FORMAT CVV ────────────────
  function formatCvv(e) {
    e.target.value = e.target.value.replace(/\D/g, '').substring(0, 4);
  }

  // ──────────────── FORMAT CPF ────────────────
  function formatCpf(e) {
    let v = e.target.value.replace(/\D/g, '').substring(0, 11);
    if (v.length > 9) {
      v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
    } else if (v.length > 6) {
      v = v.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3');
    } else if (v.length > 3) {
      v = v.replace(/(\d{3})(\d+)/, '$1.$2');
    }
    e.target.value = v;
  }

  // ──────────────── LEAD FORM ────────────────
  function initLeadForm() {
    const form = $('#leadForm');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const name = $('#leadName').value;
      const email = $('#leadEmail').value;

      const v1 = showError('leadName', 'leadNameError', validateName(name));
      const v2 = showError('leadEmail', 'leadEmailError', validateEmail(email));

      if (!v1 || !v2) return;

      // Store lead
      const lead = { name: name.trim(), email: email.trim(), timestamp: new Date().toISOString() };
      localStorage.setItem('tp_lead', JSON.stringify(lead));

      // Pre-fill checkout
      const checkName = $('#checkName');
      const checkEmail = $('#checkEmail');
      if (checkName && !checkName.value) checkName.value = lead.name;
      if (checkEmail && !checkEmail.value) checkEmail.value = lead.email;

      // Scroll to checkout
      goToSection('#checkout');

      // Visual feedback on form
      form.innerHTML = '<div style="text-align:center;padding:24px 0"><div style="font-size:3rem;margin-bottom:12px">✅</div><h3 style="color:#111827;margin-bottom:8px">Cadastro realizado!</h3><p style="color:#6b7280">Role para baixo para finalizar sua compra com desconto.</p></div>';
    });
  }

  // ──────────────── CHECKOUT FORM ────────────────
  function initCheckout() {
    const form1 = $('#checkoutForm1');
    if (!form1) return;

    // Attach formatters
    const phone = $('#checkPhone');
    const cpf   = $('#checkCpf');
    const card  = $('#cardNumber');
    const exp   = $('#expiry');
    const cvv   = $('#cvv');

    if (phone) phone.addEventListener('input', formatPhone);
    if (cpf)   cpf.addEventListener('input', formatCpf);
    if (card)  card.addEventListener('input', formatCard);
    if (exp)   exp.addEventListener('input', formatExpiry);
    if (cvv)   cvv.addEventListener('input', formatCvv);

    // Step 1 submit
    form1.addEventListener('submit', function (e) {
      e.preventDefault();

      const n  = $('#checkName').value;
      const em = $('#checkEmail').value;
      const ph = $('#checkPhone').value;
      const cf = $('#checkCpf') ? $('#checkCpf').value : '';

      const v1 = showError('checkName',  'checkNameError',  validateName(n));
      const v2 = showError('checkEmail', 'checkEmailError', validateEmail(em));
      const v3 = showError('checkPhone', 'checkPhoneError', validatePhone(ph));
      const v4 = cf ? showError('checkCpf', 'checkCpfError', cf.replace(/\D/g,'').length === 11 ? '' : 'CPF inválido.') : true;

      if (!v1 || !v2 || !v3 || !v4) return;

      // Store
      localStorage.setItem('tp_checkout_data', JSON.stringify({
        name:  n.trim(),
        email: em.trim(),
        phone: ph.trim(),
        cpf:   cf.trim()
      }));

      // Go to step 2
      $('#checkoutStep1').style.display = 'none';
      $('#checkoutStep2').style.display = 'block';
      $('#checkoutStep2').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // ──────────────── SWITCH PAYMENT ────────────────
  window.switchPayment = function (method, btn) {
    $$('.pay-tab').forEach(function (t) { t.classList.remove('active'); });
    btn.classList.add('active');

    $('#payCredit').style.display = method === 'credit' ? 'block' : 'none';
    $('#payPix').style.display = method === 'pix' ? 'block' : 'none';
  };

  // ──────────────── CHECKOUT BACK ────────────────
  window.checkoutBack = function () {
    $('#checkoutStep2').style.display = 'none';
    $('#checkoutStep1').style.display = 'block';
  };

  // ──────────────── PIX MODAL ────────────────
  let pixPollingInterval = null;

  function showPixModal(qrBase64, pixCode, paymentId, order) {
    const modal  = $('#pixModal');
    const img    = $('#pixQrImg');
    const input  = $('#pixCopyCode');
    const status = $('#pixStatus');

    if (img)   img.src = 'data:image/png;base64,' + qrBase64;
    if (input) input.value = pixCode;
    if (status) status.innerHTML = '⏳ Aguardando pagamento...';

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Poll status every 5s (max 10 min)
    let tries = 0;
    pixPollingInterval = setInterval(async function () {
      tries++;
      if (tries > 120) { clearInterval(pixPollingInterval); return; }
      try {
        const r = await fetch(getBackendUrl() + '/api/payment/' + paymentId + '/status');
        const d = await r.json();
        if (d.status === 'approved') {
          clearInterval(pixPollingInterval);
          closePixModal();
          sendCoursePDF(order);
          showSuccessModal(order);
        }
      } catch (_) { /* ignora erros de rede */ }
    }, 5000);
  }

  window.closePixModal = function () {
    const modal = $('#pixModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
    if (pixPollingInterval) clearInterval(pixPollingInterval);
  };

  window.copyPixCode = function () {
    const input = $('#pixCopyCode');
    if (!input) return;
    input.select();
    navigator.clipboard.writeText(input.value).catch(function () {
      document.execCommand('copy');
    });
    const btn = input.nextElementSibling;
    if (btn) {
      btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>';
      setTimeout(function () {
        btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';
      }, 2000);
    }
  };

  // ──────────────── PROCESS PAYMENT ────────────────
  window.processPayment = async function () {
    const activeTab = $('.pay-tab.active');
    const method = activeTab ? activeTab.dataset.method : 'credit';

    const rawData = localStorage.getItem('tp_checkout_data');
    const data = rawData ? JSON.parse(rawData) : {};

    const order = {
      name:  data.name  || '',
      email: data.email || '',
      phone: data.phone || '',
      cpf:   data.cpf   || '',
      method,
      amount: 19.90,
      timestamp: new Date().toISOString()
    };

    const btn = $('.btn-success');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span style="opacity:.7">Processando...</span>';
    }

    try {
      if (method === 'pix') {
        // ── PIX ──────────────────────────────────────────────
        const r = await fetch(getBackendUrl() + '/api/payment/pix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: order.name, email: order.email, cpf: order.cpf })
        });
        
        let d;
        try {
          d = await r.json();
        } catch (e) {
          console.error('Erro ao parsear resposta JSON:', e, 'Status:', r.status);
          throw new Error('Resposta inválida do servidor. Tente novamente.');
        }
        
        if (!r.ok) throw new Error(d.error || `Erro HTTP ${r.status}: ${d.message || 'Erro ao gerar PIX'}`);
        if (!d.payment_id) throw new Error('Resposta do servidor inválida: falta payment_id');
        
        console.log('✅ PIX criado:', d);
        showPixModal(d.qr_code_base64 || d.qr_code, d.qr_code || d.qr_code_base64, d.payment_id, order);

      } else {
        // ── CARTÃO ───────────────────────────────────────────
        const holder = $('#cardHolder').value.trim();
        const number = $('#cardNumber').value.replace(/\s/g, '');
        const expiry = $('#expiry').value;
        const cvvVal = $('#cvv').value;
        const installments = $('#installments') ? parseInt($('#installments').value) : 1;

        if (!holder || number.length < 13 || !/^\d{2}\/\d{2}$/.test(expiry) || cvvVal.length < 3) {
          Swal.fire({
            icon: 'warning',
            title: 'Dados incompletos',
            text: 'Preencha todos os dados do cartão corretamente.',
            confirmButtonColor: '#0066FF'
          });
          return;
        }

        if (!mpInstance) {
          // Tenta inicializar agora (SDK pode ter carregado depois do DOMContentLoaded)
          initMP();
        }

        if (!mpInstance) {
          Swal.fire({
            icon: 'error',
            title: 'Erro de conexão',
            text: 'Serviço de pagamento indisponível. Recarregue a página e tente novamente.',
            confirmButtonColor: '#0066FF'
          });
          return;
        }

        const [expMonth, expYear] = expiry.split('/');

        // Detecta bandeira pelo BIN
        let paymentMethodId = 'visa';
        let issuerId;
        try {
          const methods = await mpInstance.getPaymentMethods({ bin: number.substring(0, 6) });
          if (methods.results && methods.results.length > 0) {
            paymentMethodId = methods.results[0].id;
            issuerId = methods.results[0].issuer && methods.results[0].issuer.id;
          }
        } catch (_) { /* usa 'visa' como fallback */ }

        // Tokeniza o cartão no cliente (PCI compliance)
        const tokenResult = await mpInstance.createCardToken({
          cardNumber: number,
          cardholderName: holder,
          cardExpirationMonth: expMonth,
          cardExpirationYear: expYear,
          securityCode: cvvVal,
          identificationType: 'CPF',
          identificationNumber: (order.cpf || '').replace(/\D/g, '')
        });

        if (!tokenResult || !tokenResult.id) {
          throw new Error('Não foi possível tokenizar o cartão. Verifique os dados.');
        }

        const r = await fetch(getBackendUrl() + '/api/payment/card', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name:              order.name,
            email:             order.email,
            cpf:               order.cpf,
            token:             tokenResult.id,
            installments,
            payment_method_id: paymentMethodId,
            issuer_id:         issuerId
          })
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Pagamento recusado. Verifique os dados do cartão.');

        sendCoursePDF(order);
        showSuccessModal(order);
      }
    } catch (err) {
      console.error('Erro no pagamento:', err);
      const msg = err.message || 'Erro ao processar pagamento.';
      const isNetwork = msg.includes('Failed to fetch') || msg.includes('ERR_CONNECTION');
      Swal.fire({
        icon: 'error',
        title: isNetwork ? 'Servidor indisponível' : 'Pagamento não processado',
        text: isNetwork
          ? 'Não foi possível conectar ao servidor de pagamentos. Verifique sua conexão e tente novamente.'
          : msg,
        confirmButtonColor: '#0066FF'
      });
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    }
  };

  // ──────────────── SUCCESS MODAL ────────────────
  function showSuccessModal(order) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content">
        <div class="modal-icon">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>
        </div>
        <h2>Compra Realizada com Sucesso!</h2>
        <p class="modal-sub">Bem-vindo ao Cursos Práticos</p>
        <div class="modal-details">
          <p><strong>Aluno:</strong> ${order.name}</p>
          <p><strong>E-mail:</strong> ${order.email}</p>
          <p><strong>Valor:</strong> R$ ${order.amount.toFixed(2)}</p>
          <p><strong>Pagamento:</strong> ${order.method === 'pix' ? 'PIX' : 'Cartão de Crédito'}</p>
        </div>
        <div class="modal-notice">
          Enviamos o <strong>PDF do curso</strong> e os dados de acesso para <strong>${order.email}</strong>.<br>
          Confira sua caixa de entrada e spam.
        </div>
        <button class="btn btn-primary btn-block" onclick="this.closest('.modal-overlay').remove()">Entendido</button>
      </div>
    `;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        overlay.remove();
        document.body.style.overflow = '';
      }
    });
  }

  // ──────────────── INIT ────────────────
  document.addEventListener('DOMContentLoaded', function () {
    // Inicializar ícones Lucide
    if (window.lucide) {
      window.lucide.createIcons();
    }

    initEmailJS();
    initMP();

    initCountdown();
    initFloatingCta();
    initLeadForm();
    initCheckout();

    // Open first curriculum module by default
    const firstHeader = $('.module-header');
    if (firstHeader) {
      firstHeader.classList.add('open');
      const body = firstHeader.closest('.curriculum-module').querySelector('.module-body');
      if (body) body.style.maxHeight = body.scrollHeight + 'px';
    }
  });

})();
