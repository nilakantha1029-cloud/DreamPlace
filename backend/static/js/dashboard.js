/* ============================================================
   Dream Place — dashboard.js
   Full dashboard: panels, packages grid, booking modal,
   my bookings list, profile editor, stats cards
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  /* ── Auth guard ── */
  if (!API.requireAuth()) return;
  const user = API.getUser();

  /* ── Populate user info ── */
  function getInitials(name) {
    return name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'U';
  }
  function populateUser(u) {
    const initials = getInitials(u.full_name);
    ['sidebarAvatar','topbarAvatar'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = initials;
    });
    const sn = document.getElementById('sidebarName');
    const se = document.getElementById('sidebarEmail');
    const tg = document.getElementById('topbarGreeting');
    if (sn) sn.textContent = u.full_name;
    if (se) se.textContent = u.email;
    if (tg) {
      const hr = new Date().getHours();
      const greeting = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
      tg.textContent = `${greeting}, ${u.full_name.split(' ')[0]}!`;
    }
    // Profile panel
    const pa = document.getElementById('profileBigAvatar');
    const pn = document.getElementById('profileName');
    const pe = document.getElementById('profileEmail');
    const pm = document.getElementById('profileMember');
    const pf = document.getElementById('profileFullName');
    const pp = document.getElementById('profilePhone');
    const pef= document.getElementById('profileEmailField');
    if (pa) pa.textContent = initials;
    if (pn) pn.textContent = u.full_name;
    if (pe) pe.textContent = u.email;
    if (pm) pm.textContent = `Member since ${u.member_since || '—'}`;
    if (pf) pf.value = u.full_name;
    if (pp) pp.value = u.phone || '';
    if (pef) pef.value = u.email;
  }
  populateUser(user);

  /* ── Topbar date ── */
  const dateEl = document.getElementById('topbarDate');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  /* ── Sidebar toggle (mobile) ── */
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebarOverlay');
  const togBtn   = document.getElementById('sidebarToggle');
  const closeBtn = document.getElementById('sidebarClose');

  function openSidebar()  { sidebar.classList.add('open'); overlay.style.display = 'block'; document.body.style.overflow = 'hidden'; }
  window.closeSidebar = function () { sidebar.classList.remove('open'); overlay.style.display = 'none'; document.body.style.overflow = ''; };

  if (togBtn)   togBtn.addEventListener('click', openSidebar);
  if (closeBtn) closeBtn.addEventListener('click', closeSidebar);

  /* ── Panel switching ── */
  window.showPanel = function (panelId) {
    document.querySelectorAll('.dash-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    const panel = document.getElementById('panel-' + panelId);
    if (panel) panel.classList.add('active');
    document.querySelectorAll(`.sidebar-link[data-panel="${panelId}"]`).forEach(l => l.classList.add('active'));
    closeSidebar();
    // Lazy load panels
    if (panelId === 'book')       loadPackages();
    if (panelId === 'mybookings') loadMyBookings();
    if (panelId === 'overview')   loadOverview();
    if (panelId === 'profile')    refreshProfile();
  };

  /* ── Format currency ── */
  function fmt(n) { return '₹' + Number(n).toLocaleString('en-IN'); }

  /* ══════════════════════════════════════════════════════
     OVERVIEW
  ══════════════════════════════════════════════════════ */
  async function loadOverview() {
    try {
      const stats = await API.getDashStats();
      document.getElementById('statTotal').textContent     = stats.total_bookings;
      document.getElementById('statConfirmed').textContent = stats.confirmed;
      document.getElementById('statCancelled').textContent = stats.cancelled;
      document.getElementById('statSpent').textContent     = fmt(stats.total_spent);
    } catch { /* silently fail */ }

    // Recent bookings (last 3)
    try {
      const bookings = await API.getBookings();
      const el = document.getElementById('recentBookingsList');
      if (!el) return;
      const recent = bookings.slice(0, 3);
      if (!recent.length) {
        el.innerHTML = `<div class="empty-state">
          <div class="empty-icon">🌍</div>
          <h3>No bookings yet</h3>
          <p>Your confirmed trips will appear here. Start by exploring our packages!</p>
          <button class="btn btn-primary btn-sm" onclick="showPanel('book')" style="margin-top:16px;">Explore Packages</button>
        </div>`;
        return;
      }
      el.innerHTML = recent.map(b => bookingCardHTML(b, false)).join('');
      // Bind cancel buttons
      el.querySelectorAll('[data-cancel]').forEach(btn => {
        btn.addEventListener('click', () => cancelBooking(btn.dataset.cancel));
      });
    } catch {}
  }

  /* ══════════════════════════════════════════════════════
     PACKAGES
  ══════════════════════════════════════════════════════ */
  let packagesCache = [];
  let packagesLoaded = false;

  async function loadPackages() {
    if (packagesLoaded) return;
    const grid = document.getElementById('packagesGrid');
    try {
      const pkgs = await API.getPackages();
      packagesCache = pkgs;
      packagesLoaded = true;
      renderPackages(pkgs);
    } catch {
      if (grid) grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;">
        <p style="color:var(--text-light);">Could not load packages. Please ensure the backend server is running.</p>
        <p style="font-size:.8rem;color:var(--text-light);margin-top:8px;">Run: <code style="background:var(--cream);padding:2px 8px;border-radius:4px;">python app.py</code></p>
      </div>`;
    }
  }

  function renderPackages(pkgs) {
    const grid = document.getElementById('packagesGrid');
    if (!grid) return;
    if (!pkgs.length) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-light);">No packages found.</div>`;
      return;
    }
    grid.innerHTML = pkgs.map(p => `
      <div class="pkg-dash-card" data-type="${p.category}">
        ${p.badge ? `<span class="pkg-dash-badge">${p.badge}</span>` : ''}
        <img class="pkg-dash-img" src="${p.image_url}" alt="${p.name}" loading="lazy" />
        <div class="pkg-dash-body">
          <div class="pkg-dash-type">${capitalize(p.category)}</div>
          <div class="pkg-dash-name">${p.name}</div>
          <div class="pkg-dash-dest">${p.destination_flag} ${p.destination_name}</div>
          <div class="pkg-dash-includes">
            ${p.includes.slice(0,3).map(i => `<span class="pkg-dash-chip">✓ ${i}</span>`).join('')}
          </div>
        </div>
        <div class="pkg-dash-footer">
          <div class="pkg-dash-price">
            <span class="from">From</span>
            <span class="amt">${fmt(p.price_per_person)}</span>
            <span class="pp">/person</span>
            <span class="nights">${p.nights} Nights · ${p.nights + 1} Days</span>
          </div>
          <button class="btn btn-primary btn-sm" onclick="openBookingModal(${JSON.stringify(p).replace(/"/g, '&quot;')})">
            Book Now
          </button>
        </div>
      </div>`).join('');
  }

  // Category filter tabs
  document.querySelectorAll('.book-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.book-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.getAttribute('data-filter');
      document.querySelectorAll('.pkg-dash-card').forEach(card => {
        const type = card.getAttribute('data-type');
        card.classList.toggle('hidden', filter !== 'all' && type !== filter);
      });
    });
  });

  /* ══════════════════════════════════════════════════════
     BOOKING MODAL
  ══════════════════════════════════════════════════════ */
  let currentPkg = null;

  window.openBookingModal = function (pkg) {
    currentPkg = pkg;
    // Reset modal
    document.getElementById('modalFormWrap').style.display = 'block';
    document.getElementById('modalSuccess').classList.remove('show');
    document.getElementById('bookingError').classList.remove('show');
    document.getElementById('bookTravelDate').value = '';
    document.getElementById('bookTravellers').value = '2';
    document.getElementById('bookSpecialReq').value = '';
    document.getElementById('bookDateErr').style.display = 'none';

    // Fill details
    document.getElementById('modalPkgImg').src  = pkg.image_url;
    document.getElementById('modalPkgImg').alt  = pkg.name;
    document.getElementById('modalPkgName').textContent = pkg.name;
    document.getElementById('modalPkgDest').textContent = `${pkg.destination_flag} ${pkg.destination_name}`;
    document.getElementById('modalPkgPrice').textContent = `${fmt(pkg.price_per_person)} / person · ${pkg.nights} Nights`;
    document.getElementById('modalPkgId').value = pkg.id;

    updateTotal();

    // Min date
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('bookTravelDate').min = tomorrow.toISOString().split('T')[0];

    document.getElementById('bookingModal').classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  window.closeModal = function () {
    document.getElementById('bookingModal').classList.remove('open');
    document.body.style.overflow = '';
  };

  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('bookingModal').addEventListener('click', function (e) {
    if (e.target === this) closeModal();
  });

  function updateTotal() {
    if (!currentPkg) return;
    const t = parseInt(document.getElementById('bookTravellers').value) || 1;
    document.getElementById('modalTotalAmt').textContent = fmt(currentPkg.price_per_person * t);
  }
  document.getElementById('bookTravellers').addEventListener('change', updateTotal);

  // Submit booking
  document.getElementById('bookingForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    document.getElementById('bookingError').classList.remove('show');

    const travelDate = document.getElementById('bookTravelDate').value;
    const dateErrEl  = document.getElementById('bookDateErr');
    if (!travelDate || new Date(travelDate) <= new Date()) {
      dateErrEl.style.display = 'block';
      return;
    }
    dateErrEl.style.display = 'none';

    const btn = document.getElementById('confirmBookBtn');
    btn.querySelector('.btn-text').style.display = 'none';
    btn.querySelector('.auth-spinner').style.display = 'inline';
    btn.disabled = true;

    try {
      const result = await API.createBooking({
        package_id:  currentPkg.id,
        travellers:  parseInt(document.getElementById('bookTravellers').value),
        travel_date: travelDate,
        special_req: document.getElementById('bookSpecialReq').value,
      });
      // Show success
      document.getElementById('modalFormWrap').style.display = 'none';
      document.getElementById('modalSuccess').classList.add('show');
      document.getElementById('modalSuccessMsg').textContent =
        `Your ${currentPkg.name} trip has been confirmed for ${result.booking.travel_date}. Our team will contact you within 2 hours.`;
      // Invalidate cache
      packagesLoaded = false;
    } catch (err) {
      document.getElementById('bookingError').classList.add('show');
      document.getElementById('bookingErrorMsg').textContent = err.message || 'Booking failed. Please try again.';
    } finally {
      btn.querySelector('.btn-text').style.display = 'inline';
      btn.querySelector('.auth-spinner').style.display = 'none';
      btn.disabled = false;
    }
  });

  /* ══════════════════════════════════════════════════════
     MY BOOKINGS
  ══════════════════════════════════════════════════════ */
  async function loadMyBookings() {
    const el = document.getElementById('myBookingsList');
    if (!el) return;
    el.innerHTML = `<div style="text-align:center;padding:48px;"><i class="fa-solid fa-circle-notch fa-spin" style="font-size:2rem;color:var(--gold);"></i><p style="margin-top:12px;color:var(--text-light);">Loading…</p></div>`;
    try {
      const bookings = await API.getBookings();
      if (!bookings.length) {
        el.innerHTML = `<div class="empty-state">
          <div class="empty-icon">✈</div>
          <h3>No trips booked yet</h3>
          <p>Your confirmed and past bookings will appear here.</p>
          <button class="btn btn-primary btn-sm" onclick="showPanel('book')" style="margin-top:16px;">Browse Packages</button>
        </div>`;
        return;
      }
      el.innerHTML = `<div class="bookings-list">${bookings.map(b => bookingCardHTML(b, true)).join('')}</div>`;
      el.querySelectorAll('[data-cancel]').forEach(btn => {
        btn.addEventListener('click', () => cancelBooking(btn.dataset.cancel));
      });
    } catch {
      el.innerHTML = `<div style="text-align:center;padding:40px;"><p style="color:var(--text-light);">Could not load bookings. Ensure backend is running.</p></div>`;
    }
  }

  function bookingCardHTML(b, showCancel) {
    const cancelBtn = (showCancel && b.status === 'confirmed')
      ? `<span class="booking-cancel-btn" data-cancel="${b.id}">Cancel booking</span>` : '';
    return `
      <div class="booking-card" id="booking-${b.id}">
        <img class="booking-card-img" src="${b.image_url || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=200&q=60'}" alt="${b.package_name}" loading="lazy" />
        <div>
          <div class="booking-card-flag">${b.flag}</div>
          <div class="booking-card-name">${b.package_name}</div>
          <div class="booking-card-dest">${b.destination}</div>
          <div class="booking-card-meta">
            <span class="booking-card-meta-item"><i class="fa-regular fa-calendar"></i> ${b.travel_date}</span>
            <span class="booking-card-meta-item"><i class="fa-solid fa-users"></i> ${b.travellers} traveller${b.travellers > 1 ? 's' : ''}</span>
            <span class="booking-card-meta-item"><i class="fa-regular fa-moon"></i> ${b.nights} nights</span>
            <span class="booking-card-meta-item"><i class="fa-solid fa-tag"></i> ${capitalize(b.category)}</span>
          </div>
        </div>
        <div class="booking-card-right">
          <div class="booking-card-amount">${fmt(b.total_amount)}</div>
          <span class="booking-status ${b.status}">${capitalize(b.status)}</span>
          ${cancelBtn}
        </div>
      </div>`;
  }

  async function cancelBooking(id) {
    if (!confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) return;
    try {
      await API.cancelBooking(id);
      // Update card in DOM
      const card = document.getElementById(`booking-${id}`);
      if (card) {
        card.querySelector('.booking-status').className = 'booking-status cancelled';
        card.querySelector('.booking-status').textContent = 'Cancelled';
        const cancelBtn = card.querySelector('[data-cancel]');
        if (cancelBtn) cancelBtn.remove();
      }
      // Refresh stats
      loadOverview();
    } catch (err) {
      alert(err.message || 'Could not cancel booking. Please try again.');
    }
  }

  /* ══════════════════════════════════════════════════════
     PROFILE
  ══════════════════════════════════════════════════════ */
  async function refreshProfile() {
    try {
      const u = await API.getProfile();
      API.saveAuth(API.getToken(), u);
      populateUser(u);
    } catch {}
  }

  document.getElementById('profileForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn = document.getElementById('profileSaveBtn');
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      const data = await API.updateProfile({
        full_name: document.getElementById('profileFullName').value.trim(),
        phone:     document.getElementById('profilePhone').value.trim(),
      });
      API.saveAuth(API.getToken(), data.user);
      populateUser(data.user);
      document.getElementById('profileSaveMsg').classList.add('show');
      setTimeout(() => document.getElementById('profileSaveMsg').classList.remove('show'), 4000);
    } catch (err) {
      alert(err.message || 'Could not update profile.');
    } finally {
      btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Changes';
    }
  });

  /* ── Logout ── */
  async function handleLogoutFn() {
    await API.logout();
    window.location.href = '/login';
  }
  window.handleLogout = handleLogoutFn;
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogoutFn);

  /* ── Initial load ── */
  loadOverview();

  // ── Helper ──
  function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
});