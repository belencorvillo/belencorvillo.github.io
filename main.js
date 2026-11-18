/* ==========================================================================
   Belén Corvillo Guerra — Portfolio interactions
   1. Nav (scroll state, active section, mobile menu)
   2. Reveal on scroll
   3. Project sheet (dialog filled from <template id="p-…">)
   (The hero robot arm lives in arm.js)
   ========================================================================== */

(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------ 1. NAV */
  const nav = $('#nav');
  const navLinks = $('#nav-links');
  const navToggle = $('#nav-toggle');

  const onScroll = () => {
    nav.classList.toggle('is-scrolled', window.scrollY > 8);
    if (window.scrollY < window.innerHeight * 0.5) {
      $$('a.is-active', navLinks).forEach((a) => a.classList.remove('is-active'));
    }
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const setMenu = (open) => {
    navLinks.classList.toggle('is-open', open);
    nav.classList.toggle('menu-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  navToggle.addEventListener('click', () => setMenu(!navLinks.classList.contains('is-open')));
  $$('a', navLinks).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navLinks.classList.contains('is-open')) setMenu(false);
  });

  // CV dropdown (English / Español)
  const cvBtn = $('#cv-btn');
  const cvMenu = $('#cv-menu');
  if (cvBtn && cvMenu) {
    const items = () => $$('a', cvMenu);
    const setCv = (open, focusFirst = false) => {
      cvMenu.hidden = !open;
      cvBtn.setAttribute('aria-expanded', String(open));
      if (open && focusFirst) items()[0].focus();
    };
    cvBtn.addEventListener('click', () => setCv(cvMenu.hidden));
    cvBtn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setCv(true, true); }
    });
    cvMenu.addEventListener('keydown', (e) => {
      const list = items();
      const i = list.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); list[(i + 1) % list.length].focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); list[(i - 1 + list.length) % list.length].focus(); }
    });
    items().forEach((a) => a.addEventListener('click', () => setCv(false)));
    document.addEventListener('click', (e) => { if (!e.target.closest('.cv')) setCv(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !cvMenu.hidden) { setCv(false); cvBtn.focus(); }
    });
  }

  const linkFor = new Map($$('a[href^="#"]', navLinks).map((a) => [a.getAttribute('href').slice(1), a]));
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      linkFor.forEach((a) => a.classList.remove('is-active'));
      const link = linkFor.get(entry.target.id);
      if (link) link.classList.add('is-active');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  linkFor.forEach((_, id) => {
    const el = document.getElementById(id);
    if (el) sectionObserver.observe(el);
  });

  /* ------------------------------------------------------------------ 2. REVEAL */
  const revealEls = $$('.reveal');
  if (reducedMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('is-in'));
  } else {
    // small stagger between siblings that enter together
    revealEls.forEach((el) => {
      const siblings = Array.from(el.parentElement.children).filter((c) => c.classList.contains('reveal'));
      const i = siblings.indexOf(el);
      if (i > 0) el.style.transitionDelay = `${Math.min(i, 4) * 70}ms`;
    });
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach((el) => revealObserver.observe(el));
  }

  /* ------------------------------------------------------------------ 3. PROJECT SHEET */
  const sheet = $('#sheet');
  const sheetContent = $('#sheet-content');
  const sheetIndex = $('#sheet-index');

  const pauseAll = (root) => $$('video', root).forEach((v) => v.pause());
  let cleanups = [];

  function setupGallery(root) {
    const gallery = $('[data-gallery]', root);
    if (!gallery) return;
    const track = $('.gallery__track', gallery);
    const count = $('[data-count]', gallery);
    const total = track.children.length;
    const current = () => (track.clientWidth ? Math.round(track.scrollLeft / track.clientWidth) : 0);
    const update = () => { count.textContent = `${current() + 1} / ${total}`; };
    $$('[data-dir]', gallery).forEach((btn) => {
      btn.addEventListener('click', () => {
        pauseAll(track);
        const next = (current() + Number(btn.dataset.dir) + total) % total;
        track.scrollTo({ left: next * track.clientWidth, behavior: reducedMotion ? 'auto' : 'smooth' });
      });
    });
    track.addEventListener('scroll', () => window.requestAnimationFrame(update), { passive: true });
    update();
  }

  function setupRotate(root) {
    const video = $('video[data-rotate]', root);
    const btn = $('[data-rotate-btn]', root);
    if (!video || !btn) return;
    const box = video.parentElement;
    let rot = Number(video.dataset.rotate) || 0;
    // size the element so the rotated picture fits the box without cropping
    const fit = () => {
      const vw = video.videoWidth || 16;
      const vh = video.videoHeight || 9;
      const bw = box.clientWidth;
      const bh = box.clientHeight;
      const sideways = (((rot % 360) + 360) % 360) % 180 !== 0;
      const w = sideways ? Math.min(bh, (bw * vw) / vh) : Math.min(bw, (bh * vw) / vh);
      video.style.width = `${Math.floor(w)}px`;
      video.style.setProperty('--rot', `${rot}deg`);
    };
    video.addEventListener('loadedmetadata', fit);
    window.addEventListener('resize', fit);
    cleanups.push(() => window.removeEventListener('resize', fit));
    btn.addEventListener('click', () => {
      rot += 90;
      fit();
    });
    window.requestAnimationFrame(fit);
  }

  function openProject(id) {
    const tpl = document.getElementById(`p-${id}`);
    if (!tpl) return;
    cleanups.forEach((fn) => fn());
    cleanups = [];
    pauseAll(sheetContent);
    sheetContent.replaceChildren(tpl.content.cloneNode(true));
    const num = $('.kicker span', sheetContent);
    const title = $('.sheet__title', sheetContent);
    sheetIndex.textContent = [num && num.textContent, title && title.textContent].filter(Boolean).join(' — ');
    setupGallery(sheetContent);
    setupRotate(sheetContent);
    sheet.showModal();
    document.documentElement.style.overflow = 'hidden';
    const lead = $('.sheet__media > video', sheetContent);
    if (lead) lead.play().catch(() => {});
  }

  $$('[data-project]').forEach((el) => {
    el.addEventListener('click', () => openProject(el.dataset.project));
  });

  $('#sheet-close').addEventListener('click', () => sheet.close());
  sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.close(); });
  sheet.addEventListener('close', () => {
    if (sheet.open) return; // stale event from a close→reopen in the same tick
    pauseAll(sheetContent);
    document.documentElement.style.overflow = '';
  });
})();
