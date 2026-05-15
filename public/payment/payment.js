/**
 * Pasarela de Pagos Izipay — Lógica principal
 * Comunicación con el proyecto padre via postMessage.
 */

(function () {
  'use strict';

  var state = {
    allowedOrigin: null,
    backendUrl: null,
    order: null,
    customer: null,
    userId: null
  };

  function init() {
    initListener();
    document.getElementById('btn-continue').addEventListener('click', onContinue);
    document.getElementById('btn-back').addEventListener('click', onBack);
  }

  function initListener() {
    window.addEventListener('message', function (event) {
      if (!event.data || event.data.type !== 'INIT_PAYMENT') return;

      var data = event.data;

      if (!data.customer || !data.order || !data.backendUrl) {
        notifyParent({ status: 'ERROR', message: 'Datos de INIT_PAYMENT incompletos.' });
        showError('capture-error', 'Datos de inicialización incompletos.');
        return;
      }

      state.allowedOrigin = data.allowedOrigin || event.origin;
      state.backendUrl = data.backendUrl;
      state.order = data.order;
      state.customer = data.customer;
      state.userId = data.userId;

      populateForm(data.customer, data.order);
      showView('view-capture');
    });
  }

  function populateForm(customer, order) {
    setField('field-firstName', customer.firstName || '');
    setField('field-lastName', customer.lastName || '');
    setField('field-email', customer.email || '');
    setField('field-phone', customer.phoneNumber || '');
    setField('field-identityType', customer.identityType || '');
    setField('field-identityCode', customer.identityCode || '');
    setField('field-orderId', order.orderId || '');
    setField('field-amount', formatAmount(order.amount));
    setField('field-currency', order.currency || 'PEN');
  }

  function setField(id, value) {
    var el = document.getElementById(id);
    if (el) el.value = value;
  }

  function formatAmount(amount) {
    return parseFloat(amount).toFixed(2);
  }

  function onContinue() {
    hideError('capture-error');
    showView('view-checkout');
    document.getElementById('checkout-spinner').style.display = 'block';
    document.getElementById('kr-embedded').style.display = 'none';
    hideError('checkout-error');

    console.log('Solicitando token a:', state.backendUrl);

    requestFormToken(state.order, state.customer, state.backendUrl)
      .then(function (result) {
        initKrypton(result.publicKey, result.formToken);
      })
      .catch(function (err) {
        document.getElementById('checkout-spinner').style.display = 'none';
        showError('checkout-error', 'Error: ' + (err.message || 'No se pudo conectar con el servidor.'));
        notifyParent({ status: 'ERROR', message: err.message || 'Error al obtener formToken.' });
      });
  }

  function requestFormToken(order, customer, backendUrl) {
    var payload = {
      amount: Math.round(parseFloat(order.amount) * 100), 
      currency: order.currency || 'PEN',
      orderId: order.orderId,
      customer: {
        email: customer.email,
        billingDetails: {
          firstName: customer.firstName,
          lastName: customer.lastName,
          phoneNumber: customer.phoneNumber,
          identityType: customer.identityType,
          identityCode: customer.identityCode
        }
      }
    };

    return fetch(backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (response) {
        if (!response.ok) {
          return response.text().then(function (text) {
            throw new Error('Error (' + response.status + '): ' + text);
          });
        }
        return response.json();
      })
      .then(function (data) {
        if (!data.formToken || !data.publicKey) {
          throw new Error('Respuesta inválida del servidor.');
        }
        return data;
      });
  }

  function initKrypton(publicKey, formToken) {
    console.log('Iniciando carga de la biblioteca Izipay...');
    
    // Si ya existe el script, lo removemos para asegurar que se reinicie con la nueva llave si hiciera falta
    var existingScript = document.getElementById('izipay-script');
    if (existingScript) existingScript.remove();

    var script = document.createElement('script');
    script.id = 'izipay-script';
    script.type = 'text/javascript';
    // URL estable para el mercado peruano
    script.src = 'https://static.micuentaweb.pe/static/js/krypton-client/V4.0/stable/kr-payment-form.min.js';
    
    // IMPORTANTE: Atributos requeridos por Krypton
    script.setAttribute('kr-public-key', publicKey);
    script.setAttribute('kr-post-url-callback', state.backendUrl.replace('create-payment-token', 'validate-payment-hash'));
    script.setAttribute('kr-language', 'es-PE');
    
    script.onload = function() {
      console.log('Biblioteca Izipay cargada. Esperando a KR...');
      
      var checkKR = setInterval(function() {
        if (typeof KR !== 'undefined') {
          clearInterval(checkKR);
          setupForm(formToken);
        }
      }, 100);
    };

    script.onerror = function() {
      document.getElementById('checkout-spinner').style.display = 'none';
      showError('checkout-error', 'No se pudo cargar la biblioteca de pagos. Verifica tu conexión.');
    };

    document.head.appendChild(script);
  }

  function setupForm(formToken) {
    if (typeof KR === 'undefined') {
      showError('checkout-error', 'Error interno: KR no definido tras carga.');
      return;
    }

    KR.setFormConfig({
      formToken: formToken,
      'kr-language': 'es-PE'
    })
      .then(function () {
        return KR.attachForm('#kr-embedded');
      })
      .then(function (result) {
        document.getElementById('checkout-spinner').style.display = 'none';
        document.getElementById('kr-embedded').style.display = 'block';
        KR.onSubmit(onPaid);
        KR.onError(onKryptonError);
      })
      .catch(function (err) {
        document.getElementById('checkout-spinner').style.display = 'none';
        showError('checkout-error', 'Error en formulario: ' + (err.message || err));
      });
  }

  function onPaid(event) {
    console.log('Pago finalizado por Krypton. Validando integridad...', event);
    var answer = event.clientAnswer;
    var hash = event.hash || (event.rawAnswer && event.rawAnswer['kr-hash']);
    
    // Si no viene en el evento, intentar buscarlo en los campos de respuesta si KR lo expone ahí
    if (!hash && answer && answer['kr-hash']) hash = answer['kr-hash'];

    // NOTA: Para seguridad real, enviamos TODO el answer y el hash al backend
    var validationUrl = state.backendUrl.replace('create-payment-token', 'validate-payment-hash');

    fetch(validationUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientAnswer: answer,
        hash: hash,
        userId: state.userId
      })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.success) {
        var result = {
          status: 'PAID',
          orderId: (answer && answer.orderDetails && answer.orderDetails.orderId) || state.order.orderId,
          amount: answer && answer.orderDetails
            ? (answer.orderDetails.orderTotalAmount / 100).toFixed(2)
            : state.order.amount,
          currency: answer && answer.orderDetails
            ? answer.orderDetails.orderCurrency
            : state.order.currency,
          orderStatus: answer ? answer.orderStatus : 'UNKNOWN',
          rawAnswer: answer || {}
        };
        showResult(result);
        notifyParent(result);
      } else {
        throw new Error(data.error || 'Fallo en la validación del pago');
      }
    })
    .catch(function(err) {
      console.error('Error de validación:', err);
      showError('checkout-error', 'Tu pago no pudo ser verificado: ' + err.message);
      notifyParent({ status: 'ERROR', message: err.message });
    });

    return false; 
  }

  function onKryptonError(event) {
    showError('checkout-error', (event && event.errorMessage) || 'Error en el proceso de pago.');
  }

  function showResult(result) {
    var iconEl = document.getElementById('result-icon');
    var statusEl = document.getElementById('result-status');

    if (result.status === 'PAID') {
      iconEl.className = 'result-icon paid mb-3';
      statusEl.textContent = '¡Pago aprobado!';
      statusEl.className = 'font-weight-bold mb-3 text-success';
    } else {
      iconEl.className = 'result-icon failed mb-3';
      statusEl.textContent = 'Pago rechazado';
      statusEl.className = 'font-weight-bold mb-3 text-danger text-purple';
    }

    document.getElementById('result-orderId').textContent = result.orderId;
    document.getElementById('result-amount').textContent = result.amount;
    document.getElementById('result-currency').textContent = result.currency;
    document.getElementById('result-orderStatus').textContent = result.orderStatus;
    document.getElementById('result-raw').textContent = JSON.stringify(result.rawAnswer, null, 2);

    showView('view-result');
  }

  function onBack() {
    notifyParent({ type: 'CLOSE_PAYMENT' });
  }

  function notifyParent(result) {
    var target = state.allowedOrigin || '*';
    window.parent.postMessage(
      Object.assign({ type: 'PAYMENT_RESULT' }, result),
      target
    );
  }

  function showView(id) {
    var views = document.querySelectorAll('.view');
    views.forEach(function (v) { v.classList.remove('active'); });
    var target = document.getElementById(id);
    if (target) target.classList.add('active');
  }

  function showError(containerId, message) {
    var el = document.getElementById(containerId);
    if (el) {
      el.textContent = message;
      el.classList.remove('d-none');
    }
  }

  function hideError(containerId) {
    var el = document.getElementById(containerId);
    if (el) el.classList.add('d-none');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
