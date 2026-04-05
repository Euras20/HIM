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
    console.log('Order ID:', orderData.orderId);
    console.log('Customer:', orderData.customer.fullName);
    console.log('Total:', orderData.pricing.total);
    
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
  let paymentCompleted = false;
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
        description: `Commande HIM - ${currentOrderData.items.length} article(s)`,
        custom_metadata: {
          order_id: currentOrderData.orderId,
          customer_email: currentOrderData.customer.email
        }
      },
      customer: {
        email: currentOrderData.customer.email,
        lastname: currentOrderData.customer.lastName,
        firstname: currentOrderData.customer.firstName,
        phone: currentOrderData.customer.phone
      },
      currency: {
        iso: 'XOF'
      },
      container: '#fedapay-widget',
      
      // Called when checkout is completed (payment processed, regardless of success/failure)
      onComplete: async function(resp) {
        console.log('=== FEDAPAY onComplete CALLED ===');
        console.log('Response:', resp);
        console.log('Reason:', resp.reason);
        console.log('Transaction:', resp.transaction);
        console.log('FedaPay.CHECKOUT_COMPLETED:', FedaPay.CHECKOUT_COMPLETED);
        console.log('FedaPay.DIALOG_DISMISSED:', FedaPay.DIALOG_DISMISSED);

        const FedaPay = window['FedaPay'];

        // Check if user closed the dialog without completing payment
        if (resp.reason === FedaPay.DIALOG_DISMISSED) {
          console.log('User dismissed the payment dialog');
          paymentCompleted = false;
          document.getElementById('failedTitle').textContent = 'Paiement annulé';
          document.getElementById('failedMessage').innerHTML = 'Vous avez fermé la fenêtre de paiement.<br>Vous pouvez réessayer quand vous voulez.';
          document.getElementById('failedModal').classList.add('active');
          return;
        }

        // Check if checkout was completed
        if (resp.reason === FedaPay.CHECKOUT_COMPLETED) {
          console.log('Checkout completed, checking transaction status...');
          
          // Check if transaction exists and has status
          if (!resp.transaction) {
            console.error('No transaction object in response');
            document.getElementById('failedTitle').textContent = 'Erreur de paiement';
            document.getElementById('failedMessage').textContent = 'Impossible de vérifier le statut du paiement. Veuillez réessayer.';
            document.getElementById('failedModal').classList.add('active');
            return;
          }

          const status = resp.transaction.status;
          console.log('Transaction status:', status);

          // SUCCESS: Transaction approved
          if (status === 'approved') {
            console.log('✅ Payment APPROVED - showing success modal');
            paymentCompleted = true;

            // Show loader while saving
            document.getElementById('loaderOverlay').classList.add('active');

            // Save to Google Sheet
            const saved = await saveOrderToSheet(currentOrderData);

            // Hide loader
            document.getElementById('loaderOverlay').classList.remove('active');

            if (saved) {
              console.log('✅ Order saved to sheet successfully');
              // Show success modal
              document.getElementById('modalOrderId').innerText = currentOrderData.orderId;
              document.getElementById('successModal').classList.add('active');
              
              // Clear session storage
              sessionStorage.removeItem('him_checkout_order');
              localStorage.removeItem('him_temp_items');
            } else {
              console.error('❌ Failed to save order to sheet');
              // Still show success modal but warn about sheet error
              document.getElementById('modalOrderId').innerText = currentOrderData.orderId;
              document.getElementById('successModal').classList.add('active');
            }
            return;
          }

          // FAILED: Transaction declined
          if (status === 'declined') {
            console.log('❌ Payment DECLINED');
            paymentCompleted = false;
            document.getElementById('failedTitle').textContent = 'Paiement refusé';
            document.getElementById('failedMessage').innerHTML = 'Votre paiement a été refusé.<br>Veuillez vérifier vos informations et réessayer.';
            document.getElementById('failedModal').classList.add('active');
            return;
          }

          // CANCELLED: Transaction canceled
          if (status === 'canceled') {
            console.log('❌ Payment CANCELED');
            paymentCompleted = false;
            document.getElementById('failedTitle').textContent = 'Paiement annulé';
            document.getElementById('failedMessage').innerHTML = 'Le paiement a été annulé.<br>Vous pouvez réessayer quand vous voulez.';
            document.getElementById('failedModal').classList.add('active');
            return;
          }

          // PENDING or other statuses
          if (status === 'pending') {
            console.log('⏳ Payment PENDING');
            document.getElementById('failedTitle').textContent = 'Paiement en cours';
            document.getElementById('failedMessage').innerHTML = 'Votre paiement est en cours de traitement.<br>Vous recevrez une confirmation par email.';
            document.getElementById('failedModal').classList.add('active');
            return;
          }

          // UNKNOWN status
          console.log('❓ Unknown transaction status:', status);
          document.getElementById('failedTitle').textContent = 'Statut inconnu';
          document.getElementById('failedMessage').textContent = 'Statut du paiement: ' + status + '. Veuillez vérifier votre email.';
          document.getElementById('failedModal').classList.add('active');
          return;
        }

        // Fallback for any other reason
        console.log('⚠️ Unhandled reason:', resp.reason);
        document.getElementById('failedTitle').textContent = 'Paiement non complété';
        document.getElementById('failedMessage').textContent = 'Le paiement n\'a pas été finalisé. Veuillez réessayer.';
        document.getElementById('failedModal').classList.add('active');
      },
      
      // Called when there's a technical error during payment processing
      onError: function(error) {
        console.error('=== FEDAPAY onError CALLED ===');
        console.error('Error:', error);
        paymentCompleted = false;
        document.getElementById('failedTitle').textContent = 'Erreur technique';
        document.getElementById('failedMessage').innerHTML = 'Une erreur technique est survenue.<br>Détails: ' + (error.message || 'Erreur inconnue');
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
    
    // Update session storage with latest info
    sessionStorage.setItem('him_checkout_order', JSON.stringify(currentOrderData));
    
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
