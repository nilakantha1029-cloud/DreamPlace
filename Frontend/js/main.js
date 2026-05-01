/* ============================================================
   Dream Place — main.js
   Landing page: navbar, counters, destinations, packages, contact
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  /* ── Navbar scroll ── */
  const navbar = document.getElementById('navbar');
  const navToggle = document.getElementById('navToggle');
  const navLinks  = document.getElementById('navLinks');

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  });
  if (navToggle) {
    navToggle.addEventListener('click', () => {
      navToggle.classList.toggle('open');
      navLinks.classList.toggle('open');
      document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
    });
    document.querySelectorAll('.nav-link').forEach(l => {
      l.addEventListener('click', () => {
        navToggle.classList.remove('open');
        navLinks.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  /* ── Scroll reveal ── */
  const reveals = document.querySelectorAll('.reveal');
  const revObs  = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); revObs.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  reveals.forEach(el => revObs.observe(el));

  /* ── Animated counters ── */
  let counted = false;
  function animateCounter(id, target, suffix = '') {
    const el = document.getElementById(id);
    if (!el) return;
    let count = 0;
    const inc = Math.ceil(target / 60);
    const t = setInterval(() => {
      count = Math.min(count + inc, target);
      el.textContent = count.toLocaleString('en-IN') + suffix;
      if (count >= target) clearInterval(t);
    }, 22);
  }
  const statsStrip = document.querySelector('.stats-strip');
  if (statsStrip) {
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !counted) {
        counted = true;
        animateCounter('cntTravellers', 10000, '+');
        animateCounter('cntDest', 52, '+');
        animateCounter('cntYears', 15, '+');
      }
    }, { threshold: 0.4 });
    obs.observe(statsStrip);
  }

  /* ── Load destinations from API ── */
  const destGrid = document.getElementById('destGridHome');
  async function loadDestinations() {
    try {
      const dests = await API.getDestinations();
      if (!destGrid) return;
      const featured = dests.slice(0, 6);
      destGrid.innerHTML = featured.map(d => `
        <div class="dest-card-home reveal" onclick="window.location.href='signup.html'">
          <img src="${d.image_url}" alt="${d.name}" loading="lazy" />
          <div class="dest-card-overlay"></div>
          <div class="dest-card-info">
            <div class="dest-card-flag">${d.flag}</div>
            <div class="dest-card-name">${d.name}</div>
            <div class="dest-card-country">${d.country}</div>
            <div class="dest-card-bottom">
              <span class="dest-card-price">From ₹${d.base_price.toLocaleString('en-IN')}</span>
              <span class="dest-card-rating">⭐ ${d.rating} · ${d.nights}N</span>
            </div>
          </div>
        </div>`).join('');
      // re-observe new elements
      destGrid.querySelectorAll('.reveal').forEach(el => revObs.observe(el));
    } catch {
      // API not running — show fallback static cards
      if (destGrid) destGrid.innerHTML = fallbackDestCards();
      destGrid && destGrid.querySelectorAll('.reveal').forEach(el => revObs.observe(el));
    }
  }

  /* ── Load packages from API ── */
  const pkgGrid = document.getElementById('pkgPreviewGrid');
  async function loadPackages() {
    try {
      const pkgs = await API.getPackages();
      if (!pkgGrid) return;
      const featured = pkgs.slice(0, 3);
      pkgGrid.innerHTML = featured.map(p => `
        <div class="pkg-preview-card reveal">
          ${p.badge ? `<span class="pkg-preview-badge">${p.badge}</span>` : ''}
          <img class="pkg-preview-img" src="${p.image_url}" alt="${p.name}" loading="lazy" />
          <div class="pkg-preview-body">
            <div class="pkg-preview-type">${capitalize(p.category)}</div>
            <div class="pkg-preview-name">${p.name}</div>
            <div class="pkg-preview-includes">
              ${p.includes.slice(0,4).map(i => `<span class="pkg-include-chip">✓ ${i}</span>`).join('')}
            </div>
          </div>
          <div class="pkg-preview-footer">
            <div>
              <span class="pkg-price-from">Starting from</span>
              <span class="pkg-price-amt">₹${p.price_per_person.toLocaleString('en-IN')}</span>
              <span class="pkg-price-pp"> / person · ${p.nights}N</span>
            </div>
            <a href="signup.html" class="btn btn-primary btn-sm">Book Now</a>
          </div>
        </div>`).join('');
      pkgGrid.querySelectorAll('.reveal').forEach(el => revObs.observe(el));
    } catch {
      if (pkgGrid) pkgGrid.innerHTML = fallbackPkgCards();
      pkgGrid && pkgGrid.querySelectorAll('.reveal').forEach(el => revObs.observe(el));
    }
  }

  loadDestinations();
  loadPackages();

  /* ── Contact form ── */
  const landingForm = document.getElementById('landingContactForm');
  if (landingForm) {
    landingForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const name  = document.getElementById('cname').value.trim();
      const email = document.getElementById('cemail').value.trim();
      const msg   = document.getElementById('cmsg').value.trim();
      const msgEl = document.getElementById('landingContactMsg');
      if (!name || !email || !msg) {
        msgEl.className = 'form-msg error-msg';
        msgEl.textContent = 'Please fill in all required fields.';
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        msgEl.className = 'form-msg error-msg';
        msgEl.textContent = 'Please enter a valid email address.';
        return;
      }
      msgEl.className = 'form-msg success';
      msgEl.textContent = '✓ Message sent! We\'ll get back to you within 2 business hours.';
      landingForm.reset();
      setTimeout(() => { msgEl.className = 'form-msg'; }, 6000);
    });
  }

  /* ── Newsletter forms ── */
  document.querySelectorAll('#footerNewsletterForm').forEach(form => {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const inp = form.querySelector('input');
      if (inp && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inp.value)) {
        const btn = form.querySelector('button');
        const orig = btn.textContent;
        btn.textContent = '✓ Subscribed!';
        setTimeout(() => { btn.textContent = orig; inp.value = ''; }, 3000);
      }
    });
  });

  /* ── Smooth anchor scroll ── */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', function (e) {
      const t = document.querySelector(this.getAttribute('href'));
      if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); }
    });
  });

  /* ── Topbar date ── */
  const dateEl = document.getElementById('topbarDate');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  // ── Helpers ────────────────────────────────────────────────
  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // Static fallback cards when API is offline
  function fallbackDestCards() {
    const items = [
      { name:'Bali', country:'Indonesia', flag:'🇮🇩', price:'45,000', rating:'4.9', nights:7,
        img:'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=500&q=80' },
      { name:'Maldives', country:'Maldives', flag:'🇲🇻', price:'1,25,000', rating:'4.9', nights:5,
        img:'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=500&q=80' },
      { name:'Paris', country:'France', flag:'🇫🇷', price:'95,000', rating:'4.8', nights:6,
        img:'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=500&q=80' },
      { name:'Santorini', country:'Greece', flag:'🇬🇷', price:'1,15,000', rating:'4.8', nights:7,
        img:'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=500&q=80' },
      { name:'Dubai', country:'UAE', flag:'🇦🇪', price:'35,000', rating:'4.7', nights:4,
        img:'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=500&q=80' },
      { name:'Swiss Alps', country:'Switzerland', flag:'🇨🇭', price:'1,85,000', rating:'4.9', nights:8,
        img:'https://images.unsplash.com/photo-1531973576160-7125cd663d86?auto=format&fit=crop&w=500&q=80' },
    ];
    return items.map(d => `
      <div class="dest-card-home reveal" onclick="window.location.href='signup.html'">
        <img src="${d.img}" alt="${d.name}" loading="lazy" />
        <div class="dest-card-overlay"></div>
        <div class="dest-card-info">
          <div class="dest-card-flag">${d.flag}</div>
          <div class="dest-card-name">${d.name}</div>
          <div class="dest-card-country">${d.country}</div>
          <div class="dest-card-bottom">
            <span class="dest-card-price">From ₹${d.price}</span>
            <span class="dest-card-rating">⭐ ${d.rating} · ${d.nights}N</span>
          </div>
        </div>
      </div>`).join('');
  }

  function fallbackPkgCards() {
    const pkgs = [
      { badge:'⭐ Best Seller', img:'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=600&q=80',
        type:'Honeymoon', name:'Maldives Overwater Escape',
        includes:['Return Flights','Overwater Villa','Full Board','Sunset Cruise'],
        price:'2,45,999', nights:5 },
      { badge:'', img:'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=600&q=80',
        type:'Honeymoon', name:'Bali Romance Package',
        includes:['Return Flights','Private Pool Villa','Couples Spa','Breakfast Daily'],
        price:'89,999', nights:7 },
      { badge:'', img:'https://images.unsplash.com/photo-1531973576160-7125cd663d86?auto=format&fit=crop&w=600&q=80',
        type:'Adventure', name:'Swiss Alps Explorer',
        includes:['Return Flights','Jungfraujoch Trip','Paragliding','Swiss Travel Pass'],
        price:'1,85,999', nights:7 },
    ];
    return pkgs.map(p => `
      <div class="pkg-preview-card reveal">
        ${p.badge ? `<span class="pkg-preview-badge">${p.badge}</span>` : ''}
        <img class="pkg-preview-img" src="${p.img}" alt="${p.name}" loading="lazy" />
        <div class="pkg-preview-body">
          <div class="pkg-preview-type">${p.type}</div>
          <div class="pkg-preview-name">${p.name}</div>
          <div class="pkg-preview-includes">
            ${p.includes.map(i => `<span class="pkg-include-chip">✓ ${i}</span>`).join('')}
          </div>
        </div>
        <div class="pkg-preview-footer">
          <div>
            <span class="pkg-price-from">Starting from</span>
            <span class="pkg-price-amt">₹${p.price}</span>
            <span class="pkg-price-pp"> / person · ${p.nights}N</span>
          </div>
          <a href="signup.html" class="btn btn-primary btn-sm">Book Now</a>
        </div>
      </div>`).join('');
  }

});