let state = {
  cart: [],
  wishlist: [],
  currentArrivalsFilter: 'All',
  isAdmin: false,
  products: []
};

const ADMIN_CREDENTIALS = {
  username: 'admin01',
  password: 'cheema1'
};

// Load initial state from localStorage if available
function loadSavedState() {
  try {
    const savedCart = localStorage.getItem('toyland_cart');
    const savedWish = localStorage.getItem('toyland_wishlist');
    const savedProducts = localStorage.getItem('toyland_custom_products');
    const savedAdmin = localStorage.getItem('toyland_admin_session');

    if (savedCart) state.cart = JSON.parse(savedCart);
    if (savedWish) state.wishlist = JSON.parse(savedWish);
    if (savedAdmin === 'true') state.isAdmin = true;

    if (savedProducts) {
      state.products = JSON.parse(savedProducts);
    } else {
      // Default to initial dataset
      state.products = [...TOYLAND_PRODUCTS];
    }
  } catch (e) {
    console.warn('LocalStorage error:', e);
    state.products = [...TOYLAND_PRODUCTS];
  }
}

function saveState() {
  try {
    localStorage.setItem('toyland_cart', JSON.stringify(state.cart));
    localStorage.setItem('toyland_wishlist', JSON.stringify(state.wishlist));
    localStorage.setItem('toyland_custom_products', JSON.stringify(state.products));
    localStorage.setItem('toyland_admin_session', state.isAdmin ? 'true' : 'false');
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }
}

// ----------------- TOAST SYSTEM -----------------
function showToast(message, type = 'info', icon = 'fa-check') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 2600);
}

// ----------------- RENDER FUNCTIONS -----------------

// 1. Render Categories
function renderCategories() {
  const container = document.getElementById('categories-grid');
  if (!container) return;

  container.innerHTML = TOYLAND_CATEGORIES.map(cat => `
    <div class="category-card" onclick="filterBySelectedCategory('${cat.id}')">
      <div class="category-img-wrap" style="background-color: ${cat.color};">
        <img src="${cat.img}" alt="${cat.name}" loading="lazy" />
      </div>
      <div class="category-card-name">${cat.emoji} ${cat.name}</div>
      <div class="category-card-desc">${cat.desc}</div>
      <span class="category-card-btn">Explore <i class="fa-solid fa-arrow-right"></i></span>
    </div>
  `).join('');
}

// 2. Render Featured Collections
function renderCollections() {
  const container = document.getElementById('collections-grid');
  if (!container) return;

  container.innerHTML = TOYLAND_COLLECTIONS.map(col => `
    <div class="collection-card" onclick="filterBySelectedCategory('${col.categoryFilter}')">
      <img class="collection-bg-img" src="${col.img}" alt="${col.title}" loading="lazy" />
      <div class="collection-overlay"></div>
      <div class="collection-content">
        <span class="collection-tag">${col.tag}</span>
        <h3 class="collection-title">${col.title}</h3>
        <p class="collection-subtitle">${col.subtitle}</p>
        <button class="btn-collection">Explore Now <i class="fa-solid fa-arrow-right"></i></button>
      </div>
    </div>
  `).join('');
}

// Helper: Render Star Rating
function getStarRatingHTML(rating) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  let stars = '';
  for (let i = 0; i < 5; i++) {
    if (i < fullStars) stars += '<i class="fa-solid fa-star"></i>';
    else if (i === fullStars && hasHalf) stars += '<i class="fa-solid fa-star-half-stroke"></i>';
    else stars += '<i class="fa-regular fa-star"></i>';
  }
  return stars;
}

// 3. Render Best Sellers (8-12 products)
function renderBestSellers() {
  const container = document.getElementById('best-sellers-grid');
  if (!container) return;

  const bestSellers = state.products.filter(p => p.isBestSeller);
  container.innerHTML = bestSellers.map(product => renderProductCardHTML(product)).join('');
}

// 4. Render New Arrivals
function renderNewArrivals(filter = 'All') {
  const container = document.getElementById('new-arrivals-grid');
  if (!container) return;

  state.currentArrivalsFilter = filter;

  let products = state.products.filter(p => p.isNew);
  if (filter !== 'All') {
    products = products.filter(p => (p.tag && p.tag.toLowerCase() === filter.toLowerCase()) || (p.categoryName && p.categoryName.toLowerCase().includes(filter.toLowerCase())));
  }

  if (products.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #64748B;">
      <i class="fa-solid fa-box-open" style="font-size: 2.5rem; margin-bottom: 10px; display: block; opacity: 0.5;"></i>
      No toys found in this filter right now. Check back soon!
    </div>`;
    return;
  }

  container.innerHTML = products.map(product => renderProductCardHTML(product, true)).join('');
}

// Product Card HTML Generator
function renderProductCardHTML(product, forceNewBadge = false) {
  const isWish = state.wishlist.some(w => w.id === product.id);
  const discountPercent = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);

  return `
    <div class="product-card" data-id="${product.id}">
      <div class="product-image-area">
        <img src="${product.image}" alt="${product.name}" loading="lazy" />
        
        <div class="badge-stack">
          ${(product.isNew || forceNewBadge) ? '<span class="badge-pill badge-new">NEW</span>' : ''}
          ${product.isBestSeller ? '<span class="badge-pill badge-bestseller">HOT</span>' : ''}
          <span class="badge-pill badge-discount">-${discountPercent}%</span>
        </div>

        <div class="product-actions-overlay">
          <button class="product-action-btn ${isWish ? 'active-wishlist' : ''}" 
                  onclick="toggleWishlist(${product.id})" 
                  title="${isWish ? 'Remove from Wishlist' : 'Add to Wishlist'}">
            <i class="${isWish ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
          </button>
        </div>

        <button class="quick-view-overlay-btn" onclick="openQuickView(${product.id})">
          <i class="fa-solid fa-eye"></i> Quick View
        </button>
      </div>

      <div class="product-info">
        <div class="product-meta-row">
          <span class="product-category-tag">${product.categoryName}</span>
          <span class="product-age-badge"><i class="fa-regular fa-clock"></i> ${product.age}</span>
        </div>

        <h4 class="product-name" title="${product.name}">${product.name}</h4>

        <div class="product-rating">
          <span class="stars">${getStarRatingHTML(product.rating)}</span>
          <span class="rating-count">(${product.reviewsCount})</span>
        </div>

        <div class="product-price-row">
          <span class="current-price">₹${product.price.toLocaleString('en-IN')}</span>
          <span class="original-price">₹${product.originalPrice.toLocaleString('en-IN')}</span>
          <span class="discount-tag">${discountPercent}% OFF</span>
        </div>

        <button class="btn-add-cart" onclick="addToCart(${product.id})">
          <i class="fa-solid fa-basket-shopping"></i> Add to Cart
        </button>
      </div>
    </div>
  `;
}

// 5. Render Shop By Age
function renderShopByAge() {
  const container = document.getElementById('age-cards-grid');
  if (!container) return;

  container.innerHTML = AGE_GROUPS_DATA.map(age => `
    <div class="age-card" onclick="filterByAgeGroup('${age.id}')">
      <div class="age-avatar">
        <img src="${age.img}" alt="${age.label}" loading="lazy" />
      </div>
      <h3 class="age-title">${age.label}</h3>
      <div class="age-sub">${age.subtitle}</div>
      <span class="age-badge-pill">${age.badge}</span>
      <div>
        <button class="btn-explore-age">Explore Toys <i class="fa-solid fa-arrow-right"></i></button>
      </div>
    </div>
  `).join('');
}

// ----------------- CART ACTIONS -----------------
function addToCart(productId, quantity = 1) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  const existing = state.cart.find(item => item.id === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    state.cart.push({ ...product, quantity });
  }

  saveState();
  updateHeaderCounts();
  renderCartDrawer();
  showToast(`Added <strong>${product.name}</strong> to your cart!`, 'success', 'fa-bag-shopping');
}

function updateCartQty(productId, delta) {
  const item = state.cart.find(i => i.id === productId);
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    state.cart = state.cart.filter(i => i.id !== productId);
    showToast(`Item removed from cart`, 'info', 'fa-trash');
  }

  saveState();
  updateHeaderCounts();
  renderCartDrawer();
}

function removeFromCart(productId) {
  state.cart = state.cart.filter(i => i.id !== productId);
  saveState();
  updateHeaderCounts();
  renderCartDrawer();
  showToast('Item removed from cart', 'info', 'fa-trash');
}

function renderCartDrawer() {
  const container = document.getElementById('cart-items-container');
  const totalAmountEl = document.getElementById('cart-total-amount');
  const subtotalEl = document.getElementById('cart-subtotal');
  const shippingBar = document.getElementById('free-shipping-fill');
  const shippingMsg = document.getElementById('free-shipping-msg');

  if (!container) return;

  if (state.cart.length === 0) {
    container.innerHTML = `
      <div class="drawer-empty-state">
        <div class="drawer-empty-icon">🛒</div>
        <h3>Your Cart is Empty!</h3>
        <p style="margin-top: 8px;">Explore our fun collections and fill it with smiles.</p>
        <button class="btn btn-primary" style="margin-top: 20px;" onclick="toggleCartDrawer(false)">Start Shopping</button>
      </div>
    `;
    if (totalAmountEl) totalAmountEl.textContent = '₹0';
    if (subtotalEl) subtotalEl.textContent = '₹0';
    if (shippingBar) shippingBar.style.width = '0%';
    if (shippingMsg) shippingMsg.innerHTML = '<i class="fa-solid fa-truck-fast"></i> Add items worth ₹999 for FREE Delivery!';
    return;
  }

  let subtotal = 0;
  container.innerHTML = state.cart.map(item => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    return `
      <div class="cart-item">
        <img class="cart-item-img" src="${item.image}" alt="${item.name}" />
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">₹${item.price.toLocaleString('en-IN')}</div>
          <div class="cart-qty-controls">
            <button class="qty-btn" onclick="updateCartQty(${item.id}, -1)">−</button>
            <span class="qty-num">${item.quantity}</span>
            <button class="qty-btn" onclick="updateCartQty(${item.id}, 1)">+</button>
          </div>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart(${item.id})">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    `;
  }).join('');

  if (subtotalEl) subtotalEl.textContent = `₹${subtotal.toLocaleString('en-IN')}`;
  if (totalAmountEl) totalAmountEl.textContent = `₹${subtotal.toLocaleString('en-IN')}`;

  // Free shipping threshold ₹999
  const threshold = 999;
  if (shippingBar && shippingMsg) {
    if (subtotal >= threshold) {
      shippingBar.style.width = '100%';
      shippingMsg.innerHTML = '🎉 <strong>Woohoo! You unlocked FREE Delivery!</strong>';
    } else {
      const remaining = threshold - subtotal;
      const pct = Math.min(100, Math.round((subtotal / threshold) * 100));
      shippingBar.style.width = `${pct}%`;
      shippingMsg.innerHTML = `<i class="fa-solid fa-truck-fast"></i> Add <strong>₹${remaining}</strong> more for <strong>FREE Delivery!</strong>`;
    }
  }
}

// ----------------- WISHLIST ACTIONS -----------------
function toggleWishlist(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  const index = state.wishlist.findIndex(w => w.id === productId);
  if (index >= 0) {
    state.wishlist.splice(index, 1);
    showToast(`Removed from Wishlist`, 'info', 'fa-heart-crack');
  } else {
    state.wishlist.push(product);
    showToast(`Saved <strong>${product.name}</strong> to Wishlist!`, 'success', 'fa-heart');
  }

  saveState();
  updateHeaderCounts();
  renderWishlistDrawer();
  renderBestSellers();
  renderNewArrivals(state.currentArrivalsFilter);
}

function renderWishlistDrawer() {
  const container = document.getElementById('wishlist-items-container');
  if (!container) return;

  if (state.wishlist.length === 0) {
    container.innerHTML = `
      <div class="drawer-empty-state">
        <div class="drawer-empty-icon">💖</div>
        <h3>Your Wishlist is Empty</h3>
        <p style="margin-top: 8px;">Tap the heart on any toy to save it for later!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = state.wishlist.map(item => `
    <div class="cart-item">
      <img class="cart-item-img" src="${item.image}" alt="${item.name}" />
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">₹${item.price.toLocaleString('en-IN')}</div>
        <button class="btn btn-primary" style="padding: 4px 12px; font-size: 0.8rem; margin-top: 4px;" onclick="moveToCartFromWishlist(${item.id})">
          Move to Cart
        </button>
      </div>
      <button class="cart-item-remove" onclick="toggleWishlist(${item.id})">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </div>
  `).join('');
}

function moveToCartFromWishlist(productId) {
  addToCart(productId, 1);
  toggleWishlist(productId);
}

// ----------------- HEADER COUNTS -----------------
function updateHeaderCounts() {
  const cartCount = state.cart.reduce((sum, i) => sum + i.quantity, 0);
  const wishCount = state.wishlist.length;

  const cartEl = document.getElementById('header-cart-count');
  const wishEl = document.getElementById('header-wishlist-count');

  if (cartEl) cartEl.textContent = cartCount;
  if (wishEl) wishEl.textContent = wishCount;
}

// ----------------- DRAWERS & MODALS TOGGLERS -----------------
function toggleCartDrawer(open) {
  const drawer = document.getElementById('cart-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  if (open) {
    renderCartDrawer();
    drawer.classList.add('open');
    backdrop.classList.add('active');
  } else {
    drawer.classList.remove('open');
    backdrop.classList.remove('active');
  }
}

function toggleWishlistDrawer(open) {
  const drawer = document.getElementById('wishlist-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  if (open) {
    renderWishlistDrawer();
    drawer.classList.add('open');
    backdrop.classList.add('active');
  } else {
    drawer.classList.remove('open');
    backdrop.classList.remove('active');
  }
}

function closeAllDrawers() {
  toggleCartDrawer(false);
  toggleWishlistDrawer(false);
}

// ----------------- QUICK VIEW MODAL -----------------
function openQuickView(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  const modal = document.getElementById('quickview-modal');
  const body = document.getElementById('quickview-body');
  if (!modal || !body) return;

  const discountPercent = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);

  body.innerHTML = `
    <div class="quickview-grid">
      <div class="quickview-img-box">
        <img src="${product.image}" alt="${product.name}" />
      </div>
      <div class="quickview-details">
        <div class="quickview-tags">
          <span class="product-category-tag">${product.categoryName}</span>
          <span class="product-age-badge"><i class="fa-regular fa-clock"></i> Recommended: ${product.age}</span>
        </div>
        <h2 class="quickview-title">${product.name}</h2>
        <div class="product-rating" style="margin-bottom: 12px;">
          <span class="stars">${getStarRatingHTML(product.rating || 5.0)}</span>
          <span class="rating-count">(${product.reviewsCount || 10} verified reviews)</span>
        </div>
        <div class="quickview-price-area">
          <span class="current-price" style="font-size: 1.8rem;">₹${product.price.toLocaleString('en-IN')}</span>
          <span class="original-price" style="font-size: 1.1rem;">₹${product.originalPrice.toLocaleString('en-IN')}</span>
          <span class="discount-tag">${discountPercent}% OFF</span>
        </div>
        <p class="quickview-desc">${product.description || 'Delightful toy made with premium, child-safe materials.'}</p>
        
        <h4 style="font-size: 0.95rem; margin-bottom: 8px;">Key Highlights:</h4>
        <ul class="quickview-features">
          ${(product.features || ['Non-toxic child-safe materials', 'Durable high-grade construction', 'Improves creativity & problem solving']).map(f => `<li><i class="fa-solid fa-circle-check"></i> ${f}</li>`).join('')}
        </ul>

        <div style="display: flex; gap: 12px; margin-top: auto;">
          <button class="btn btn-primary" style="flex-grow: 1;" onclick="addToCart(${product.id}); closeQuickView();">
            <i class="fa-solid fa-cart-shopping"></i> Add to Cart
          </button>
          <button class="action-btn" onclick="toggleWishlist(${product.id}); closeQuickView();" title="Wishlist">
            <i class="${state.wishlist.some(w => w.id === product.id) ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
          </button>
        </div>
      </div>
    </div>
  `;

  modal.classList.add('active');
}

function closeQuickView() {
  const modal = document.getElementById('quickview-modal');
  if (modal) modal.classList.remove('active');
}

// ----------------- SEARCH SYSTEM -----------------
function openSearchModal() {
  const modal = document.getElementById('search-modal');
  const input = document.getElementById('search-input');
  if (modal) {
    modal.classList.add('active');
    setTimeout(() => input?.focus(), 100);
    renderSearchResults('');
  }
}

function closeSearchModal() {
  const modal = document.getElementById('search-modal');
  if (modal) modal.classList.remove('active');
}

function handleSearchInput(e) {
  const query = e.target.value.trim().toLowerCase();
  renderSearchResults(query);
}

function renderSearchResults(query) {
  const list = document.getElementById('search-results-list');
  if (!list) return;

  if (!query) {
    list.innerHTML = `
      <div style="text-align: center; color: #94A3B8; padding: 20px;">
        Type toy name, category (e.g. <em>RC Car, Teddy Bear, Blocks</em>), or age group.
      </div>
    `;
    return;
  }

  const matches = state.products.filter(p => 
    p.name.toLowerCase().includes(query) ||
    (p.categoryName && p.categoryName.toLowerCase().includes(query)) ||
    (p.description && p.description.toLowerCase().includes(query)) ||
    (p.tag && p.tag.toLowerCase().includes(query))
  );

  if (matches.length === 0) {
    list.innerHTML = `<div style="text-align: center; color: #64748B; padding: 20px;">No matching toys found for "${query}". Try another word!</div>`;
    return;
  }

  list.innerHTML = matches.map(p => `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px; border-radius: 12px; background: #F8FAFC; cursor: pointer;"
         onclick="openQuickView(${p.id}); closeSearchModal();">
      <div style="display: flex; align-items: center; gap: 12px;">
        <img src="${p.image}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover;" />
        <div>
          <div style="font-weight: 700; font-size: 0.95rem;">${p.name}</div>
          <div style="font-size: 0.78rem; color: #64748B;">${p.categoryName} • ${p.age}</div>
        </div>
      </div>
      <div style="font-weight: 800; color: #FF477E;">₹${p.price}</div>
    </div>
  `).join('');
}

// ----------------- CHECKOUT ROUTER -----------------
// (Delegates to OTP Verification Checkout flow modal implemented below)

function closeCheckoutSuccess() {
  const modal = document.getElementById('checkout-success-modal');
  if (modal) modal.classList.remove('active');
}

// Playful Confetti Particle Generator
function launchConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#FF477E', '#FFB703', '#FB8500', '#06D6A0', '#4A90E2', '#8338EC'];

  for (let i = 0; i < 120; i++) {
    particles.push({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      vx: (Math.random() - 0.5) * 16,
      vy: (Math.random() - 0.7) * 18,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 10,
      alpha: 1
    });
  }

  let animationFrame;
  function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = 0;

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35; // gravity
      p.rotation += p.vRot;
      p.alpha -= 0.008;

      if (p.alpha > 0) {
        alive++;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
    });

    if (alive > 0) {
      animationFrame = requestAnimationFrame(update);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cancelAnimationFrame(animationFrame);
    }
  }

  update();
}

// ----------------- FILTER & NAVIGATION HOOKS -----------------
function filterBySelectedCategory(categoryId) {
  const targetSection = document.getElementById('best-sellers-section');
  if (targetSection) {
    targetSection.scrollIntoView({ behavior: 'smooth' });
  }

  const container = document.getElementById('best-sellers-grid');
  if (!container) return;

  const matched = state.products.filter(p => p.category === categoryId);
  if (matched.length > 0) {
    container.innerHTML = matched.map(product => renderProductCardHTML(product)).join('');
    showToast(`Showing ${matched[0].categoryName || categoryId} toys!`, 'info', 'fa-filter');
  } else {
    renderBestSellers();
  }
}

function filterByAgeGroup(ageGroupId) {
  const targetSection = document.getElementById('best-sellers-section');
  if (targetSection) {
    targetSection.scrollIntoView({ behavior: 'smooth' });
  }

  const container = document.getElementById('best-sellers-grid');
  if (!container) return;

  const matched = state.products.filter(p => p.ageGroup === ageGroupId);
  if (matched.length > 0) {
    container.innerHTML = matched.map(product => renderProductCardHTML(product)).join('');
    showToast(`Showing toys suitable for ${ageGroupId} years!`, 'info', 'fa-child');
  } else {
    renderBestSellers();
  }
}

// ================= ADMIN MANAGEMENT SYSTEM =================

function openAdminPanel() {
  if (state.isAdmin) {
    openAdminDashboard();
  } else {
    openAdminLogin();
  }
}

function openAdminLogin() {
  const modal = document.getElementById('admin-login-modal');
  const err = document.getElementById('admin-login-error');
  if (err) err.style.display = 'none';
  if (modal) modal.classList.add('active');
}

function closeAdminLogin() {
  const modal = document.getElementById('admin-login-modal');
  if (modal) modal.classList.remove('active');
}

function handleAdminLogin(e) {
  e.preventDefault();
  const userInput = document.getElementById('admin-user-input').value.trim();
  const passInput = document.getElementById('admin-pass-input').value.trim();
  const errEl = document.getElementById('admin-login-error');

  if (userInput === ADMIN_CREDENTIALS.username && passInput === ADMIN_CREDENTIALS.password) {
    state.isAdmin = true;
    saveState();
    closeAdminLogin();
    showToast('Welcome back, Admin!', 'success', 'fa-user-shield');
    openAdminDashboard();
  } else {
    if (errEl) errEl.style.display = 'block';
  }
}

function openAdminDashboard() {
  const modal = document.getElementById('admin-dashboard-modal');
  if (!modal) return;
  renderAdminProductTable();
  modal.classList.add('active');
}

function closeAdminDashboard() {
  const modal = document.getElementById('admin-dashboard-modal');
  if (modal) modal.classList.remove('active');
}

function adminLogout() {
  state.isAdmin = false;
  saveState();
  closeAdminDashboard();
  showToast('Admin logged out successfully', 'info', 'fa-right-from-bracket');
}

// Render Admin inventory table with price editors and actions
function renderAdminProductTable() {
  const tbody = document.getElementById('admin-product-tbody');
  const totalCountEl = document.getElementById('admin-total-products');
  const searchInput = document.getElementById('admin-filter-search');
  if (!tbody) return;

  let query = searchInput ? searchInput.value.trim().toLowerCase() : '';
  let products = state.products;

  if (query) {
    products = products.filter(p => p.name.toLowerCase().includes(query) || (p.categoryName && p.categoryName.toLowerCase().includes(query)));
  }

  if (totalCountEl) totalCountEl.textContent = state.products.length;

  tbody.innerHTML = products.map(p => `
    <tr style="border-bottom: 1px solid #EEF2F6;">
      <td style="padding: 12px 16px; display: flex; align-items: center; gap: 12px;">
        <img src="${p.image}" style="width: 44px; height: 44px; border-radius: 8px; object-fit: cover;" />
        <div>
          <div style="font-weight: 700; color: #1E293B;">${p.name}</div>
          <div style="font-size: 0.75rem; color: #64748B;">ID: #${p.id}</div>
        </div>
      </td>
      <td style="padding: 12px 16px; color: #475569;">${p.categoryName || p.category}</td>
      <td style="padding: 12px 16px; color: #475569;"><span style="background: #F1F5F9; padding: 2px 8px; border-radius: 99px; font-size: 0.78rem;">${p.age}</span></td>
      <td style="padding: 12px 16px;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-weight: 800; color: #FF477E;">₹</span>
          <input type="number" value="${p.price}" onchange="quickUpdatePrice(${p.id}, this.value)" 
                 style="width: 80px; padding: 4px 8px; border: 1.5px solid #CBD5E1; border-radius: 6px; font-weight: 700; font-family: inherit;" />
        </div>
      </td>
      <td style="padding: 12px 16px; color: #94A3B8;">₹${p.originalPrice}</td>
      <td style="padding: 12px 16px; text-align: center;">
        <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
          <button class="action-btn" style="width: 32px; height: 32px; font-size: 0.85rem;" onclick="openEditProductModal(${p.id})" title="Edit Details">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="action-btn" style="width: 32px; height: 32px; font-size: 0.85rem; color: #EF4444;" onclick="adminDeleteProduct(${p.id})" title="Delete Product">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Quick price update inline from table
function quickUpdatePrice(productId, newPrice) {
  const priceNum = parseInt(newPrice, 10);
  if (isNaN(priceNum) || priceNum <= 0) {
    showToast('Invalid price entered', 'info', 'fa-triangle-exclamation');
    return;
  }

  const product = state.products.find(p => p.id === productId);
  if (product) {
    product.price = priceNum;
    if (product.originalPrice < product.price) {
      product.originalPrice = Math.round(product.price * 1.3);
    }
    saveState();
    refreshAllStorefront();
    showToast(`Price updated for ${product.name} to ₹${priceNum}!`, 'success', 'fa-check');
  }
}

// Add Product Modal trigger
function openAddProductModal() {
  document.getElementById('product-manage-form').reset();
  document.getElementById('form-product-id').value = '';
  document.getElementById('product-form-title').textContent = 'Add New Toy Product';
  document.getElementById('form-product-image').value = 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=600&q=80';
  document.getElementById('product-form-modal').classList.add('active');
}

// Edit Product Modal trigger
function openEditProductModal(productId) {
  const p = state.products.find(item => item.id === productId);
  if (!p) return;

  document.getElementById('form-product-id').value = p.id;
  document.getElementById('product-form-title').textContent = 'Edit Toy Details & Pricing';
  document.getElementById('form-product-name').value = p.name;
  document.getElementById('form-product-price').value = p.price;
  document.getElementById('form-product-origprice').value = p.originalPrice;
  document.getElementById('form-product-category').value = p.category || 'soft-toys';
  document.getElementById('form-product-age').value = p.ageGroup || '3-5';
  document.getElementById('form-product-image').value = p.image || '';
  document.getElementById('form-product-desc').value = p.description || '';

  document.getElementById('product-form-modal').classList.add('active');
}

function closeProductFormModal() {
  const modal = document.getElementById('product-form-modal');
  if (modal) modal.classList.remove('active');
}

// Save or Update Product
function handleSaveProduct(e) {
  e.preventDefault();
  const idVal = document.getElementById('form-product-id').value;
  const name = document.getElementById('form-product-name').value.trim();
  const price = parseInt(document.getElementById('form-product-price').value, 10);
  const origPrice = parseInt(document.getElementById('form-product-origprice').value, 10);
  const category = document.getElementById('form-product-category').value;
  const ageGroup = document.getElementById('form-product-age').value;
  let image = document.getElementById('form-product-image').value.trim();
  const desc = document.getElementById('form-product-desc').value.trim();

  if (!image) {
    image = 'https://images.unsplash.com/photo-1559454403-b8fb88521f11?auto=format&fit=crop&w=600&q=80';
  }

  const categoryObj = TOYLAND_CATEGORIES.find(c => c.id === category);
  const categoryName = categoryObj ? categoryObj.name : 'Toy';

  const ageLabels = {
    '0-2': '0–2 Years',
    '3-5': '3–5 Years',
    '6-8': '6–8 Years',
    '9-12': '9–12 Years',
    '13+': '13+ Years'
  };

  if (idVal) {
    // Editing existing product
    const p = state.products.find(item => item.id == idVal);
    if (p) {
      p.name = name;
      p.price = price;
      p.originalPrice = origPrice;
      p.category = category;
      p.categoryName = categoryName;
      p.ageGroup = ageGroup;
      p.age = ageLabels[ageGroup] || 'All Ages';
      p.image = image;
      p.description = desc;
      showToast(`Updated product: ${p.name}`, 'success', 'fa-pen-to-square');
    }
  } else {
    // Adding brand new product
    const newId = state.products.length > 0 ? Math.max(...state.products.map(p => p.id)) + 1 : 101;
    const newProduct = {
      id: newId,
      name,
      price,
      originalPrice: origPrice,
      category,
      categoryName,
      ageGroup,
      age: ageLabels[ageGroup] || 'All Ages',
      image,
      description: desc,
      rating: 5.0,
      reviewsCount: 1,
      isBestSeller: true,
      isNew: true,
      tag: 'New',
      features: ['Child-safe materials', 'Interactive & engaging play', 'Certified quality']
    };
    state.products.unshift(newProduct);
    showToast(`Added new toy: ${name}!`, 'success', 'fa-sparkles');
  }

  saveState();
  closeProductFormModal();
  renderAdminProductTable();
  refreshAllStorefront();
}

// Delete product
function adminDeleteProduct(productId) {
  if (!confirm('Are you sure you want to remove this toy from TOYLAND store?')) return;

  state.products = state.products.filter(p => p.id !== productId);
  state.cart = state.cart.filter(p => p.id !== productId);
  state.wishlist = state.wishlist.filter(p => p.id !== productId);

  saveState();
  renderAdminProductTable();
  refreshAllStorefront();
  updateHeaderCounts();
  renderCartDrawer();
  renderWishlistDrawer();
  showToast('Toy removed from store', 'info', 'fa-trash');
}

// Re-render Storefront Components
function refreshAllStorefront() {
  renderBestSellers();
  renderNewArrivals(state.currentArrivalsFilter);
}

// ----------------- EVENT LISTENERS & INIT -----------------
document.addEventListener('DOMContentLoaded', () => {
  loadSavedState();

  // Render initial components
  renderCategories();
  renderCollections();
  renderBestSellers();
  renderNewArrivals('All');
  renderShopByAge();
  updateHeaderCounts();
  renderCartDrawer();
  renderWishlistDrawer();

  // Sticky header scroll shadow
  window.addEventListener('scroll', () => {
    const header = document.querySelector('.header-sticky');
    if (header) {
      if (window.scrollY > 20) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }
  });

  // Mobile menu toggle
  const hamburger = document.getElementById('hamburger-btn');
  const navMenu = document.getElementById('nav-menu');
  if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
      navMenu.classList.toggle('open');
    });
    // Close nav on link click
    navMenu.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => navMenu.classList.remove('open'));
    });
  }

  // New Arrivals Filter Tabs
  const filterTabs = document.querySelectorAll('.filter-tab');
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const filter = tab.getAttribute('data-filter');
      renderNewArrivals(filter);
    });
  });

  // Newsletter Form Submit
  const newsForm = document.getElementById('newsletter-form');
  if (newsForm) {
    newsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = newsForm.querySelector('input');
      if (input && input.value) {
        showToast(`🎉 You're in! ₹200 gift coupon sent to ${input.value}`, 'success', 'fa-envelope');
        input.value = '';
      }
    });
  }
});

// =============================================================================
// PHONE NUMBER OTP VERIFICATION & CHECKOUT SYSTEM (DEVELOPMENT & MSG91 READY)
// =============================================================================

let otpState = {
  mobile: '',
  isVerified: false,
  verifiedToken: null,
  cooldownTimer: null,
  expiryTimer: null,
  cooldownRemaining: 0,
  expiryRemaining: 0,
  isSending: false,
  isVerifying: false,
  devOtp: null
};

// Validate Indian mobile numbers (+91, starts with 6,7,8,9, 10 digits)
function validateIndianMobile(phone) {
  if (!phone) return { valid: false, error: 'Mobile number is required.' };
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
  // Extract 10 digits
  let digits = cleaned;
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    digits = cleaned.slice(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    digits = cleaned.slice(1);
  }

  if (!/^[6-9]\d{9}$/.test(digits)) {
    return {
      valid: false,
      error: 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.'
    };
  }
  return { valid: true, mobile: digits };
}

function handlePhoneInput(input) {
  // Allow only digits
  input.value = input.value.replace(/\D/g, '').slice(0, 10);
  const msgEl = document.getElementById('phone-input-msg');
  const btnSend = document.getElementById('btn-send-otp');

  // If phone changes after verification, reset verified status
  if (otpState.isVerified && input.value !== otpState.mobile) {
    resetVerificationState();
  }

  if (input.value.length === 10) {
    const val = validateIndianMobile(input.value);
    if (val.valid) {
      if (msgEl) {
        msgEl.textContent = 'Valid 10-digit Indian number (+91). Ready to send OTP.';
        msgEl.style.color = '#059669';
      }
      if (btnSend && otpState.cooldownRemaining <= 0) {
        btnSend.disabled = false;
      }
      return;
    }
  }

  if (msgEl) {
    msgEl.textContent = 'Please enter your 10-digit mobile number to receive verification code.';
    msgEl.style.color = '#64748B';
  }
}

function resetVerificationState() {
  otpState.isVerified = false;
  otpState.verifiedToken = null;
  otpState.devOtp = null;

  const badge = document.getElementById('phone-verified-status-badge');
  if (badge) {
    badge.className = 'verification-badge pending';
    badge.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Unverified';
  }

  const successBox = document.getElementById('phone-success-box');
  if (successBox) successBox.style.display = 'none';

  const orderBtn = document.getElementById('btn-complete-order');
  if (orderBtn) {
    orderBtn.disabled = true;
    orderBtn.style.opacity = '0.6';
    orderBtn.style.cursor = 'not-allowed';
    orderBtn.innerHTML = '<i class="fa-solid fa-lock"></i> Place Order (Phone Verification Required)';
  }
}

async function triggerSendOtp() {
  const phoneInput = document.getElementById('cust-phone');
  const rawPhone = phoneInput ? phoneInput.value.trim() : '';
  const validation = validateIndianMobile(rawPhone);

  const feedback = document.getElementById('otp-feedback-box');
  const msgEl = document.getElementById('phone-input-msg');

  if (!validation.valid) {
    if (msgEl) {
      msgEl.textContent = validation.error;
      msgEl.style.color = '#EF4444';
    }
    showToast(validation.error, 'error', 'fa-triangle-exclamation');
    if (phoneInput) phoneInput.focus();
    return;
  }

  if (otpState.cooldownRemaining > 0) {
    showToast(`Please wait ${otpState.cooldownRemaining}s before requesting a new OTP.`, 'info', 'fa-clock');
    return;
  }

  const btnSend = document.getElementById('btn-send-otp');
  const btnResend = document.getElementById('btn-resend-otp');
  if (btnSend) {
    btnSend.disabled = true;
    btnSend.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
  }

  try {
    const response = await fetch('/api/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: validation.mobile })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to send OTP.');
    }

    otpState.mobile = validation.mobile;
    otpState.devOtp = data.devOtp || null;

    // Show OTP input section
    const otpSection = document.getElementById('otp-verification-section');
    if (otpSection) otpSection.style.display = 'block';

    const otpField = document.getElementById('otp-input-field');
    if (otpField) {
      otpField.value = '';
      otpField.focus();
    }

    // Handle Development Mode Simulation Banner
    const devBanner = document.getElementById('otp-dev-banner');
    const devOtpDisplay = document.getElementById('dev-otp-display');
    if (data.isDevelopment && data.devOtp) {
      if (devBanner) devBanner.style.display = 'block';
      if (devOtpDisplay) devOtpDisplay.textContent = data.devOtp;
      showToast(`[Dev Mode] Simulated OTP: ${data.devOtp}`, 'info', 'fa-vial');
    } else {
      if (devBanner) devBanner.style.display = 'none';
      showToast(`OTP sent successfully to +91 ${validation.mobile}`, 'success', 'fa-paper-plane');
    }

    if (feedback) {
      feedback.className = 'otp-feedback-info';
      feedback.style.display = 'block';
      feedback.textContent = `Verification code sent to +91 ${validation.mobile}. Please enter it below.`;
    }

    // Start Cooldown Timer (60s)
    startCooldown(data.cooldownSeconds || 60);

    // Start Expiry Timer (300s)
    startExpiryCountdown(data.expiresInSeconds || 300);

  } catch (err) {
    showToast(err.message, 'error', 'fa-triangle-exclamation');
    if (feedback) {
      feedback.className = 'otp-feedback-error';
      feedback.style.display = 'block';
      feedback.textContent = err.message;
    }
  } finally {
    if (btnSend) {
      btnSend.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send OTP';
    }
  }
}

function autoFillDevOtp() {
  if (otpState.devOtp) {
    const input = document.getElementById('otp-input-field');
    if (input) {
      input.value = otpState.devOtp;
      input.focus();
    }
  }
}

function startCooldown(seconds) {
  clearInterval(otpState.cooldownTimer);
  otpState.cooldownRemaining = seconds;

  const btnSend = document.getElementById('btn-send-otp');
  const btnResend = document.getElementById('btn-resend-otp');
  const counterEl = document.getElementById('cooldown-counter');

  if (btnSend) btnSend.disabled = true;
  if (btnResend) btnResend.disabled = true;

  otpState.cooldownTimer = setInterval(() => {
    otpState.cooldownRemaining -= 1;
    if (counterEl) counterEl.textContent = otpState.cooldownRemaining;

    if (otpState.cooldownRemaining <= 0) {
      clearInterval(otpState.cooldownTimer);
      if (btnSend) btnSend.disabled = false;
      if (btnResend) {
        btnResend.disabled = false;
        btnResend.style.color = '#FF477E';
        btnResend.style.cursor = 'pointer';
        btnResend.textContent = 'Resend OTP Now';
      }
    } else {
      if (btnResend) {
        btnResend.disabled = true;
        btnResend.style.color = '#94A3B8';
        btnResend.style.cursor = 'not-allowed';
        btnResend.innerHTML = `Resend OTP in <span id="cooldown-counter">${otpState.cooldownRemaining}</span>s`;
      }
    }
  }, 1000);
}

function startExpiryCountdown(seconds) {
  clearInterval(otpState.expiryTimer);
  otpState.expiryRemaining = seconds;
  const countdownEl = document.getElementById('otp-countdown');

  otpState.expiryTimer = setInterval(() => {
    otpState.expiryRemaining -= 1;
    if (countdownEl) {
      const mins = String(Math.floor(otpState.expiryRemaining / 60)).padStart(2, '0');
      const secs = String(otpState.expiryRemaining % 60).padStart(2, '0');
      countdownEl.textContent = `${mins}:${secs}`;
    }

    if (otpState.expiryRemaining <= 0) {
      clearInterval(otpState.expiryTimer);
      const feedback = document.getElementById('otp-feedback-box');
      if (feedback && !otpState.isVerified) {
        feedback.className = 'otp-feedback-error';
        feedback.style.display = 'block';
        feedback.textContent = 'The OTP code has expired. Please click "Resend OTP".';
      }
    }
  }, 1000);
}

async function triggerVerifyOtp() {
  const otpInput = document.getElementById('otp-input-field');
  const otp = otpInput ? otpInput.value.trim() : '';
  const feedback = document.getElementById('otp-feedback-box');

  if (!otp || otp.length < 4) {
    if (feedback) {
      feedback.className = 'otp-feedback-error';
      feedback.style.display = 'block';
      feedback.textContent = 'Please enter the full 6-digit OTP code.';
    }
    if (otpInput) otpInput.focus();
    return;
  }

  const btnVerify = document.getElementById('btn-verify-otp');
  if (btnVerify) {
    btnVerify.disabled = true;
    btnVerify.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying...';
  }

  try {
    const response = await fetch('/api/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mobile: otpState.mobile,
        otp: otp
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Verification failed.');
    }

    // Verification Success!
    otpState.isVerified = true;
    otpState.verifiedToken = data.verifiedToken;
    clearInterval(otpState.expiryTimer);
    clearInterval(otpState.cooldownTimer);

    // Update Badges & Confirmation
    const badge = document.getElementById('phone-verified-status-badge');
    if (badge) {
      badge.className = 'verification-badge verified';
      badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Verified';
    }

    // Hide OTP input section and show success card
    const otpSection = document.getElementById('otp-verification-section');
    if (otpSection) otpSection.style.display = 'none';

    const successBox = document.getElementById('phone-success-box');
    const verifiedPhoneDisplay = document.getElementById('verified-phone-number-display');
    if (verifiedPhoneDisplay) verifiedPhoneDisplay.textContent = '+91 ' + otpState.mobile;
    if (successBox) successBox.style.display = 'block';

    // Disable phone editing
    const phoneInput = document.getElementById('cust-phone');
    const sendBtn = document.getElementById('btn-send-otp');
    if (phoneInput) phoneInput.disabled = true;
    if (sendBtn) sendBtn.style.display = 'none';

    // Unlock Place Order button
    const orderBtn = document.getElementById('btn-complete-order');
    if (orderBtn) {
      orderBtn.disabled = false;
      orderBtn.style.opacity = '1';
      orderBtn.style.cursor = 'pointer';
      orderBtn.innerHTML = '<i class="fa-solid fa-check-double"></i> Confirm & Place Order';
    }

    showToast('Phone number verified successfully.', 'success', 'fa-circle-check');

  } catch (err) {
    if (feedback) {
      feedback.className = 'otp-feedback-error';
      feedback.style.display = 'block';
      feedback.textContent = err.message;
    }
    showToast(err.message, 'error', 'fa-circle-exclamation');
  } finally {
    if (btnVerify) {
      btnVerify.disabled = false;
      btnVerify.innerHTML = '<i class="fa-solid fa-circle-check"></i> Verify OTP';
    }
  }
}

// ----------------- CHECKOUT FLOW MODAL HANDLERS -----------------
function triggerCheckout() {
  if (state.cart.length === 0) {
    showToast('Your cart is empty! Add toys before checkout.', 'info', 'fa-cart-shopping');
    return;
  }

  toggleCartDrawer(false);

  const checkoutModal = document.getElementById('checkout-flow-modal');
  const cartCountEl = document.getElementById('checkout-cart-count');
  const cartTotalEl = document.getElementById('checkout-cart-total');

  const totalCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (cartCountEl) cartCountEl.textContent = totalCount;
  if (cartTotalEl) cartTotalEl.textContent = '₹' + totalPrice.toLocaleString('en-IN');

  if (checkoutModal) checkoutModal.classList.add('active');
}

function closeCheckoutModal() {
  const modal = document.getElementById('checkout-flow-modal');
  if (modal) modal.classList.remove('active');
}

async function handleCheckoutSubmit(e) {
  e.preventDefault();

  if (!otpState.isVerified || !otpState.verifiedToken) {
    showToast('Please verify your Indian mobile number before placing the order.', 'error', 'fa-shield-halved');
    return;
  }

  const name = document.getElementById('cust-name').value.trim();
  const address = document.getElementById('cust-address').value.trim();
  const pincode = document.getElementById('cust-pincode').value.trim();
  const total = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const orderBtn = document.getElementById('btn-complete-order');
  if (orderBtn) {
    orderBtn.disabled = true;
    orderBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing Order...';
  }

  try {
    const res = await fetch('/api/orders/place', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mobile: otpState.mobile,
        verifiedToken: otpState.verifiedToken,
        customerName: name,
        address: `${address}, PIN: ${pincode}`,
        items: state.cart,
        total: total
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to place order.');
    }

    // Order Success!
    closeCheckoutModal();
    launchConfetti();

    const checkoutSuccessModal = document.getElementById('checkout-success-modal');
    const summaryEl = document.getElementById('checkout-success-summary');
    if (summaryEl) {
      summaryEl.innerHTML = `
        <div style="background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 12px; padding: 12px; margin-bottom: 16px;">
          <strong style="color: #065F46; font-size: 1rem;"><i class="fa-solid fa-circle-check"></i> ${data.message}</strong>
          <div style="color: #047857; font-size: 0.84rem; margin-top: 4px;">Order ID: <strong>#${data.orderId}</strong> • Verified: <strong>${data.verifiedPhone}</strong></div>
        </div>
        <p style="font-size: 1.1rem; color: #334155; margin-bottom: 8px;">
          Order Total: <strong style="color: #FF477E;">₹${total.toLocaleString('en-IN')}</strong>
        </p>
        <p style="color: #64748B; font-size: 0.88rem;">
          Thank you, <strong>${name}</strong>! Your toy package will be dispatched to <em>${address}</em>. An SMS notification has been dispatched to <strong>${data.verifiedPhone}</strong>.
        </p>
      `;
    }

    if (checkoutSuccessModal) checkoutSuccessModal.classList.add('active');

    // Reset cart and OTP state
    state.cart = [];
    saveState();
    updateHeaderCounts();
    renderCartDrawer();

    resetVerificationState();
    const phoneInput = document.getElementById('cust-phone');
    const sendBtn = document.getElementById('btn-send-otp');
    if (phoneInput) {
      phoneInput.value = '';
      phoneInput.disabled = false;
    }
    if (sendBtn) sendBtn.style.display = 'inline-block';

  } catch (err) {
    showToast(err.message, 'error', 'fa-circle-xmark');
    if (orderBtn) {
      orderBtn.disabled = false;
      orderBtn.innerHTML = '<i class="fa-solid fa-check-double"></i> Confirm & Place Order';
    }
  }
}

// ----------------- ADMIN DASHBOARD TABS & SMS SETTINGS -----------------
function switchAdminTab(tab) {
  const invTab = document.getElementById('admin-tab-inventory');
  const smsTab = document.getElementById('admin-tab-sms');
  const invView = document.getElementById('admin-view-inventory');
  const smsView = document.getElementById('admin-view-sms');

  if (tab === 'sms') {
    if (invTab) invTab.classList.remove('active');
    if (smsTab) smsTab.classList.add('active');
    if (invView) invView.style.display = 'none';
    if (smsView) smsView.style.display = 'block';
    fetchAdminSmsConfig();
  } else {
    if (smsTab) smsTab.classList.remove('active');
    if (invTab) invTab.classList.add('active');
    if (smsView) smsView.style.display = 'none';
    if (invView) invView.style.display = 'block';
    renderAdminProductTable();
  }
}

async function fetchAdminSmsConfig() {
  try {
    const res = await fetch('/api/admin/sms-config');
    const data = await res.json();
    if (!res.ok || !data.success) return;

    const cfg = data.config;

    const bannerTitle = document.getElementById('admin-sms-banner-title');
    const bannerDesc = document.getElementById('admin-sms-banner-desc');
    const bannerPill = document.getElementById('admin-sms-mode-pill');
    const bannerBox = document.getElementById('admin-sms-mode-banner');

    if (cfg.isDevelopment) {
      if (bannerBox) {
        bannerBox.style.background = '#FEF3C7';
        bannerBox.style.borderColor = '#F59E0B';
      }
      if (bannerTitle) bannerTitle.textContent = 'Active Provider: Development Simulation Mode';
      if (bannerDesc) bannerDesc.textContent = 'Real SMS costs are disabled. OTPs are simulated safely in terminal logs and API responses.';
      if (bannerPill) {
        bannerPill.textContent = 'TEST MODE';
        bannerPill.style.background = '#F59E0B';
      }
    } else {
      if (bannerBox) {
        bannerBox.style.background = '#ECFDF5';
        bannerBox.style.borderColor = '#10B981';
      }
      if (bannerTitle) bannerTitle.textContent = 'Active Provider: MSG91 Production SMS Gateway';
      if (bannerDesc) bannerDesc.textContent = 'Live SMS gateway connected. OTPs are delivered to real Indian mobile handsets.';
      if (bannerPill) {
        bannerPill.textContent = 'PRODUCTION';
        bannerPill.style.background = '#10B981';
      }
    }

    const statStatus = document.getElementById('admin-sms-stat-status');
    const statProvider = document.getElementById('admin-sms-stat-provider');
    const statTemplate = document.getElementById('admin-sms-stat-template');
    const countryEl = document.getElementById('admin-sms-country');
    const envVarEl = document.getElementById('admin-sms-env-var');
    const senderIdEl = document.getElementById('admin-sms-sender-id');
    const authStatusEl = document.getElementById('admin-sms-auth-status');
    const expiryEl = document.getElementById('admin-sms-expiry');
    const cooldownEl = document.getElementById('admin-sms-cooldown');

    if (statStatus) statStatus.textContent = cfg.gatewayStatus || 'Operational';
    if (statProvider) statProvider.textContent = cfg.provider;
    if (statTemplate) statTemplate.textContent = cfg.templateIdConfigured ? `Configured (${cfg.templateIdMasked})` : 'Not Configured (Ready)';
    if (countryEl) countryEl.textContent = cfg.countryCode || '+91 (India)';
    if (envVarEl) envVarEl.textContent = `SMS_PROVIDER=${cfg.provider}`;
    if (senderIdEl) senderIdEl.textContent = cfg.senderId;
    if (authStatusEl) authStatusEl.textContent = cfg.authKeyConfigured ? `Configured on server (${cfg.authKeyMasked})` : 'Not Configured (Safe Server Memory)';
    if (expiryEl) expiryEl.textContent = `${cfg.expirySeconds} seconds (${Math.round(cfg.expirySeconds / 60)} Minutes)`;
    if (cooldownEl) cooldownEl.textContent = `${cfg.cooldownSeconds} seconds`;

  } catch (e) {
    console.warn('Could not fetch SMS config:', e);
  }
}