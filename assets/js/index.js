
    /* ─────────────────────────────────────────
       DARK MODE MANAGEMENT
       ───────────────────────────────────────── */
    const themeToggle = document.getElementById('themeToggle');
    const html = document.documentElement;
    
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('him-theme');
    if (savedTheme) {
      html.setAttribute('data-theme', savedTheme);
    } else {
      // Check system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        html.setAttribute('data-theme', 'dark');
      }
    }
    
    themeToggle.addEventListener('click', () => {
      const currentTheme = html.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      
      html.setAttribute('data-theme', newTheme);
      localStorage.setItem('him-theme', newTheme);
    });

    /* ─────────────────────────────────────────
       CURSOR & HEADER SCROLL EFFECTS
       ───────────────────────────────────────── */
    const cursor = document.getElementById('cursor');
    const ring = document.getElementById('cursorRing');
    let mx = 0, my = 0, rx = 0, ry = 0;

    // Only enable cursor effects on non-touch devices
    if (window.matchMedia('(pointer: fine)').matches) {
      document.addEventListener('mousemove', (e) => {
        mx = e.clientX;
        my = e.clientY;
        cursor.style.left = mx + 'px';
        cursor.style.top = my + 'px';
      });

      function animateRing() {
        rx += (mx - rx) * 0.13;
        ry += (my - ry) * 0.13;
        ring.style.left = rx + 'px';
        ring.style.top = ry + 'px';
        requestAnimationFrame(animateRing);
      }
      animateRing();

      // Hover effects for interactive elements
      document.querySelectorAll('a, button, input, select, .carousel-btn, .dot, .thumb, .btn-add-item, .remove-item, .theme-toggle')
        .forEach(el => {
          el.addEventListener('mouseenter', () => {
            cursor.classList.add('big');
            ring.classList.add('big');
          });
          el.addEventListener('mouseleave', () => {
            cursor.classList.remove('big');
            ring.classList.remove('big');
          });
        });
    }

    // Header scroll state
    const hdrEl = document.getElementById('hdr');
    window.addEventListener('scroll', () => {
      hdrEl.classList.toggle('scrolled', scrollY > 50);
    });

    // Reveal animations on scroll
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('on');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));

    /* ─────────────────────────────────────────
       MOBILE MENU TOGGLE
       ───────────────────────────────────────── */
    const menuToggle = document.getElementById('menuToggle');
    const mainNav = document.getElementById('mainNav');
    
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('active');
      mainNav.classList.toggle('active');
      document.body.style.overflow = mainNav.classList.contains('active') ? 'hidden' : '';
    });
    
    // Close menu when clicking on a link
    mainNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        menuToggle.classList.remove('active');
        mainNav.classList.remove('active');
        document.body.style.overflow = '';
      });
    });

    /* ─────────────────────────────────────────
       CAROUSEL FUNCTIONALITY
       ───────────────────────────────────────── */
    const track = document.getElementById('carouselTrack');
    const slides = document.querySelectorAll('.carousel-slide');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const dotsContainer = document.getElementById('carouselDots');
    let currentIdx = 0;
    const total = slides.length;

    function updateCarousel() {
      track.style.transform = `translateX(-${currentIdx * 100}%)`;
      
      document.querySelectorAll('.dot').forEach((d, i) => {
        d.classList.toggle('active', i === currentIdx);
      });
      
      document.querySelectorAll('.thumb').forEach((t, i) => {
        t.classList.toggle('active-thumb', i === currentIdx);
      });
    }

    function createDots() {
      for (let i = 0; i < total; i++) {
        let dot = document.createElement('div');
        dot.classList.add('dot');
        if (i === currentIdx) dot.classList.add('active');
        dot.addEventListener('click', () => {
          currentIdx = i;
          updateCarousel();
        });
        dotsContainer.appendChild(dot);
      }
    }
    createDots();

    prevBtn.addEventListener('click', () => {
      currentIdx = (currentIdx - 1 + total) % total;
      updateCarousel();
    });

    nextBtn.addEventListener('click', () => {
      currentIdx = (currentIdx + 1) % total;
      updateCarousel();
    });

    // Touch swipe support for mobile
    let touchStartX = 0;
    let touchEndX = 0;
    
    track.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, {passive: true});
    
    track.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    }, {passive: true});
    
    function handleSwipe() {
      if (touchEndX < touchStartX - 50) {
        currentIdx = (currentIdx + 1) % total;
        updateCarousel();
      }
      if (touchEndX > touchStartX + 50) {
        currentIdx = (currentIdx - 1 + total) % total;
        updateCarousel();
      }
    }

    // Thumbnails
    const thumbStrip = document.getElementById('thumbStrip');
    const images = ['HIM-White.jpg', 'HIM-Sand.jpg', 'HIM-Black.jpg'];
    
    images.forEach((src, i) => {
      let div = document.createElement('div');
      div.classList.add('thumb');
      div.innerHTML = `<img src="${src}" alt="thumb">`;
      div.addEventListener('click', () => {
        currentIdx = i;
        updateCarousel();
      });
      thumbStrip.appendChild(div);
    });
    
    updateCarousel();

    /* ─────────────────────────────────────────
       MULTI-ITEM ORDER MANAGEMENT
       ───────────────────────────────────────── */
    let items = [{ model: "HIM Classic — White Edition", color: "Blanc", size: "M" }];

    function saveItemsToStorage() {
      localStorage.setItem('him_temp_items', JSON.stringify(items));
    }

    function loadItemsFromStorage() {
      let stored = localStorage.getItem('him_temp_items');
      if (stored) items = JSON.parse(stored);
    }

    loadItemsFromStorage();
    if (!items.length) items = [{ model: "HIM Classic — White Edition", color: "Blanc", size: "M" }];

    function renderItems() {
      let container = document.getElementById('itemsContainer');
      if (!container) return;
      
      container.innerHTML = '';
      
      items.forEach((item, idx) => {
        let card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
          <div class="item-header">
            <span>Article ${idx + 1}</span>
            <button class="remove-item" data-idx="${idx}">
              <i class="ri-delete-bin-line"></i>
            </button>
          </div>
          <div class="item-row">
            <select class="item-model" data-idx="${idx}">
              <option value="HIM Classic — White Edition">Blanc Classic</option>
              <option value="HIM Desert — Sand Edition">Sable Desert</option>
              <option value="HIM Shadow — Black Edition">Noir Shadow</option>
            </select>
            <select class="item-color" data-idx="${idx}">
              <option value="Blanc">Blanc</option>
              <option value="Beige / Sable">Sable</option>
              <option value="Noir">Noir</option>
            </select>
            <select class="item-size" data-idx="${idx}">
              <option>M</option>
              <option>L</option>
              <option>XL</option>
              <option>XXL</option>
            </select>
          </div>
        `;
        
        container.appendChild(card);
        
        // Set values
        card.querySelector('.item-model').value = item.model;
        card.querySelector('.item-color').value = item.color;
        card.querySelector('.item-size').value = item.size;
        
        // Event listeners
        card.querySelector('.remove-item').addEventListener('click', (e) => {
          e.preventDefault();
          if (items.length > 1) {
            items.splice(idx, 1);
            renderItems();
            saveItemsToStorage();
          } else {
            alert("Au moins un article requis");
          }
        });
        
        card.querySelector('.item-model').addEventListener('change', (e) => {
          items[idx].model = e.target.value;
          saveItemsToStorage();
        });
        
        card.querySelector('.item-color').addEventListener('change', (e) => {
          items[idx].color = e.target.value;
          saveItemsToStorage();
        });
        
        card.querySelector('.item-size').addEventListener('change', (e) => {
          items[idx].size = e.target.value;
          saveItemsToStorage();
        });
      });
    }

    document.getElementById('addItemBtn')?.addEventListener('click', () => {
      items.push({ model: "HIM Classic — White Edition", color: "Blanc", size: "M" });
      renderItems();
      saveItemsToStorage();
    });

    renderItems();

    /* ─────────────────────────────────────────
       ORDER SUBMISSION → CHECKOUT REDIRECT
       ───────────────────────────────────────── */
    window.submitMultiOrder = function() {
      // Get customer details
      let fn = document.getElementById('fn').value.trim();
      let ln = document.getElementById('ln').value.trim();
      let em = document.getElementById('em').value.trim();
      let ph = document.getElementById('ph').value.trim();
      let addr = document.getElementById('addr').value.trim();
      let notes = document.getElementById('notes').value.trim();

      // Validation
      if (!fn || !ln || !em || !addr) {
        alert("⚠️ Remplissez tous les champs obligatoires (*) : Prénom, Nom, Email, Adresse.");
        return;
      }
      
      if (items.length === 0) {
        alert("Ajoutez au moins un article");
        return;
      }

      // Calculate total (12,000 CFA per piece based on your new pricing)
      const PRICE_PER_PIECE = 12000;
      const total = items.length * PRICE_PER_PIECE;

      // Build order data object
      const orderData = {
        items: items, // Array of {model, color, size}
        customer: {
          firstName: fn,
          lastName: ln,
          fullName: `${fn} ${ln}`,
          email: em,
          phone: ph,
          address: addr,
          notes: notes
        },
        pricing: {
          unitPrice: PRICE_PER_PIECE,
          quantity: items.length,
          total: total,
          currency: 'CFA'
        },
        timestamp: new Date().toISOString(),
        orderId: 'HIM-' + Date.now().toString().slice(-6)
      };

      // Save to sessionStorage for checkout page
      sessionStorage.setItem('him_checkout_order', JSON.stringify(orderData));
      
      // Also save to localStorage as backup
      localStorage.setItem('him_current_order', JSON.stringify(orderData));

      // Redirect to checkout
      window.location.href = 'checkout.html';
    };

    document.getElementById('submitOrderBtn')?.addEventListener('click', submitMultiOrder);

    // Handle resize for cursor display
    window.addEventListener('resize', () => {
      if (window.innerWidth <= 768) {
        cursor.style.display = 'none';
        ring.style.display = 'none';
      } else {
        cursor.style.display = 'block';
        ring.style.display = 'block';
      }
    });
  
