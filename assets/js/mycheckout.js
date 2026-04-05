 // ========== CONFIGURATION ==========
  const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyLGbw01mfT5K1v6hRGkvbmd3GP2Bd1oKs088reYvpQmLbRVsNb3EfwUIZ0MfCtfUlH/exec';
  const FEDAPAY_PUBLIC_KEY = 'pk_live_Z9rTyZj0YpVSpl7cINJ2zy8b'
  
  
  // ========== CURSOR ==========
  const cur = document.getElementById('cursor');
  const ring = document.getElementById('cursorRing');
  let mx = 0, my = 0, rx = 0, ry = 0;
  
  if (window.matchMedia('(pointer: fine)').matches) {
    document.addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      cur.style.left = mx + 'px'; cur.style.top = my + 'px';
    });
    function animateRing() {
      rx += (mx - rx) * 0.13;
      ry += (my - ry) * 0.13;
      ring.style.left = rx + 'px';
      ring.style.top = ry + 'px';
      requestAnimationFrame(animateRing);
    }
    animateRing();
    
    const interactiveElements = document.querySelectorAll('a,button,input,.confirm-btn');
    interactiveElements.forEach(el => {
      el.addEventListener('mouseenter', () => { cur.classList.add('big'); ring.classList.add('big'); });
      el.addEventListener('mouseleave', () => { cur.classList.remove('big'); ring.classList.remove('big'); });
    });
  } else {
    cur.style.display = 'none';
    ring.style.display = 'none';
  }

  // ========== LOAD ORDER DATA ==========
  function loadOrderData() {
    const container = document.getElementById('orderSummaryContainer');
    const totalDisplay = document.getElementById('totalAmount');
    
    let orderData = null;
    const storedOrder = sessionStorage.getItem('him_checkout_order');
    
    if (storedOrder) {
      try {
        orderData = JSON.parse(storedOrder);
      } catch(e) {
        console.error('Error parsing order data', e);
      }
    }
    
    if (!orderData || !orderData.items || orderData.items.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding: 30px 0; color: #8A7E6A;">
          <i class="ri-error-warning-line" style="font-size: 32px; margin-bottom: 10px; display: block;"></i>
          Aucune commande trouvée.<br>
          <a href="index.html" style="color: #7CB342; text-decoration: underline;">Retourner à la boutique</a>
        </div>
      `;
      totalDisplay.innerHTML = '0 CFA';
      return null;
    }

    // Pre-fill customer info
    if (orderData.customer) {
      const nameParts = (orderData.customer.fullName || '').split(' ');
      document.getElementById('firstName').value = nameParts[0] || orderData.customer.firstName || '';
      document.getElementById('lastName').value = nameParts.slice(1).join(' ') || orderData.customer.lastName || '';
      document.getElementById('emailAddress').value = orderData.customer.email || '';
      document.getElementById('deliveryAddress').value = orderData.customer.address || '';
      document.getElementById('phoneNumber').value = orderData.customer.phone || '';
      document.getElementById('orderNotes').value = orderData.customer.notes || '';
    }

    // Build items list HTML
    let itemsHtml = '';
    orderData.items.forEach((item, index) => {
      itemsHtml += `
        <div class="summary-row" style="border-left: 3px solid #7CB342; padding-left: 12px; margin-bottom: 8px;">
          <span class="summary-label">Article ${index + 1}</span>
          <span class="summary-value">
            <strong>${escapeHtml(item.model)}</strong><br>
            <span style="font-size: 13px; color: #5C4425;">
              ${escapeHtml(item.color)} · Taille ${escapeHtml(item.size)}
            </span>
          </span>
        </div>
      `;
    });

    const customerHtml = `
      <div class="summary-row" style="margin-top: 16px; padding-top: 16px; border-top: 2px solid #E8D9BE;">
        <span class="summary-label">Client</span>
        <span class="summary-value">${escapeHtml(orderData.customer.fullName || orderData.customer.firstName + ' ' + orderData.customer.lastName)}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Email</span>
        <span class="summary-value">${escapeHtml(orderData.customer.email)}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Adresse</span>
        <span class="summary-value">${escapeHtml(orderData.customer.address)}</span>
      </div>
      ${orderData.customer.phone ? `
      <div class="summary-row">
        <span class="summary-label">Téléphone</span>
        <span class="summary-value">${escapeHtml(orderData.customer.phone)}</span>
      </div>` : ''}
    `;

    container.innerHTML = itemsHtml + customerHtml;
    
    const total = orderData.pricing ? orderData.pricing.total : (orderData.items.length * 50);
    totalDisplay.innerHTML = total.toLocaleString() + ' CFA';
    
    return orderData;
  }

  function escapeHtml(str) { 
    if (!str) return ''; 
    return str.replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m])); 
  }

  // ========== VALIDATION ==========
  function validateForm() {
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('emailAddress').value.trim();
    const address = document.getElementById('deliveryAddress').value.trim();
    
    if (!firstName) { showError('Veuillez entrer votre prénom'); return false; }
    if (!lastName) { showError('Veuillez entrer votre nom'); return false; }
    if (!email) { showError('Veuillez entrer votre email'); return false; }
    if (!email.includes('@')) { showError('Email invalide'); return false; }
    if (!address) { showError('Veuillez entrer votre adresse de livraison'); return false; }
    
    return true;
  }

  function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
    setTimeout(() => errorDiv.classList.remove('show'), 5000);
  }

  function hideError() {
    document.getElementById('errorMessage').classList.remove('show');
  }

  // ========== SAVE TO GOOGLE SHEETS ==========
  async function saveOrderToSheet(orderData) {
    const formData = new FormData();
    
    formData.append('firstName', orderData.customer.firstName);
    formData.append('lastName', orderData.customer.lastName);
    formData.append('fullName', orderData.customer.fullName);
    formData.append('email', orderData.customer.email);
    formData.append('phone', orderData.customer.phone || '');
    formData.append('address', orderData.customer.address);
    formData.append('notes', orderData.customer.notes || '');
    formData.append('unitPrice', orderData.pricing.unitPrice);
    formData.append('total', orderData.pricing.total);
    formData.append('currency', orderData.pricing.currency);
    formData.append('itemsCount', orderData.items.length);
    formData.append('orderId', orderData.orderId);
    formData.append('items', JSON.stringify(orderData.items));
    
    console.log('=== SAVING ORDER TO SHEET ===');
    
    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      console.log('Sheet response:', data);
      
      return data.result === 'success';
    } catch (error) {
      console.error('Error saving to sheet:', error);
      return false;
    }
  }

  // ========== FEDAPAY INTEGRATION ==========
  let currentOrderData = null;
  let paymentCompleted = false; // Track if payment was actually successful
  let fedapayWidget = null;

  function initFedaPay() {
    if (!currentOrderData) return;
    
    const widgetContainer = document.getElementById('fedapay-widget');
    widgetContainer.style.display = 'flex';
    
    // Update status text
    document.getElementById('paymentStatusText').textContent = 'Complétez votre paiement sécurisé ci-dessous';
    
    // Scroll to widget
    widgetContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    fedapayWidget = FedaPay.init({
      public_key: FEDAPAY_PUBLIC_KEY,
      transaction: {
        amount: currentOrderData.pricing.total,
        description: `Commande HIM - ${currentOrderData.items.length} article(s)`
      },
      customer: {
        email: currentOrderData.customer.email,
        lastname: currentOrderData.customer.lastName,
        firstname: currentOrderData.customer.firstName,
        phone: currentOrderData.customer.phone
      },
      container: '#fedapay-widget',
      
      // Called when payment is SUCCESSFULLY COMPLETED
      onComplete: async function(transaction) {
  console.log('Payment completed:', transaction);

  // 🔴 CRITICAL CHECK
  if (!transaction || transaction.status !== "approved") {
    console.log("Payment NOT approved → do nothing");
    
    document.getElementById('failedTitle').textContent = 'Paiement non validé';
    document.getElementById('failedMessage').innerHTML = 'Le paiement n\'a pas été confirmé.<br>Veuillez réessayer.';
    document.getElementById('failedModal').classList.add('active');

    return; // ⛔ STOP HERE
  }

  // ✅ ONLY REAL SUCCESS CONTINUES
  paymentCompleted = true;

  document.getElementById('loaderOverlay').classList.add('active');

  const saved = await saveOrderToSheet(currentOrderData);

  document.getElementById('loaderOverlay').classList.remove('active');

  if (saved) {
    // success modal
    document.getElementById('modalOrderId').innerText = currentOrderData.orderId;
    document.getElementById('successModal').classList.add('active');
  }
},
      
      // Called when payment FAILS (error during processing)
      onError: function(error) {
        console.error('Payment error:', error);
        paymentCompleted = false;
        document.getElementById('failedTitle').textContent = 'Erreur de paiement';
        document.getElementById('failedMessage').textContent = 'Une erreur est survenue lors du paiement.<br>Veuillez réessayer.';
        document.getElementById('failedModal').classList.add('active');
      },
      
      // Called when user CANCELS or closes the widget
      onCancel: function() {
        console.log('Payment cancelled by user');
        paymentCompleted = false;
        
        // DO NOT save to sheet - payment was cancelled
        
        // Show cancelled modal
        document.getElementById('failedTitle').textContent = 'Paiement annulé';
        document.getElementById('failedMessage').textContent = 'Vous avez annulé le paiement.<br>Vous pouvez réessayer quand vous voulez.';
        document.getElementById('failedModal').classList.add('active');
      }
    });
  }

  // ========== EVENT LISTENERS ==========
  document.getElementById('confirmBtn').addEventListener('click', () => {
    hideError();
    
    if (!validateForm()) return;
    
    // Get order data from sessionStorage
    const storedOrder = sessionStorage.getItem('him_checkout_order');
    if (!storedOrder) {
      showError('Erreur: Aucune commande trouvée.');
      return;
    }
    
    try {
      currentOrderData = JSON.parse(storedOrder);
    } catch(e) {
      showError('Erreur lors du chargement de la commande.');
      return;
    }
    
    // Update customer info with form values
    currentOrderData.customer.firstName = document.getElementById('firstName').value.trim();
    currentOrderData.customer.lastName = document.getElementById('lastName').value.trim();
    currentOrderData.customer.fullName = `${currentOrderData.customer.firstName} ${currentOrderData.customer.lastName}`;
    currentOrderData.customer.email = document.getElementById('emailAddress').value.trim();
    currentOrderData.customer.phone = document.getElementById('phoneNumber').value.trim();
    currentOrderData.customer.address = document.getElementById('deliveryAddress').value.trim();
    currentOrderData.customer.notes = document.getElementById('orderNotes').value.trim();
    
    // Generate order ID if needed
    if (!currentOrderData.orderId) {
      currentOrderData.orderId = 'HIM-' + Date.now().toString().slice(-8);
    }
    
    // Hide form, show FedaPay widget
    document.getElementById('checkoutForm').style.display = 'none';
    
    // Initialize FedaPay
    initFedaPay();
  });

  // Close success modal
  document.getElementById('closeModalBtn').addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  // Retry payment
  document.getElementById('retryBtn').addEventListener('click', () => {
    document.getElementById('failedModal').classList.remove('active');
    // Reinitialize FedaPay
    if (currentOrderData) {
      // Clear old widget
      const container = document.getElementById('fedapay-widget');
      container.innerHTML = '';
      paymentCompleted = false;
      initFedaPay();
    }
  });

  // Modify order (go back)
  document.getElementById('modifyBtn').addEventListener('click', () => {
    document.getElementById('failedModal').classList.remove('active');
    // Show form again
    document.getElementById('checkoutForm').style.display = 'block';
    document.getElementById('fedapay-widget').style.display = 'none';
    document.getElementById('paymentStatusText').textContent = 'Vérifiez vos coordonnées et validez pour afficher le paiement';
  });

  // Load order data on page load
  const orderData = loadOrderData();
  if (!orderData) {
    document.getElementById('confirmBtn').disabled = true;
  }