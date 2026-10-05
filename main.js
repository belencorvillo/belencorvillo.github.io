/* ==========================================================================
   BELÉN CORVILLO GUERRA - PORTFOLIO INTERACTIVITY & LOGIC
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* ------------------------------------------------------------------------
     1. THEME SWITCHER (DARK / LIGHT MODE)
     ------------------------------------------------------------------------ */
  const themeToggleBtn = document.getElementById('theme-toggle');
  const htmlElement = document.documentElement;

  // Read saved theme from localStorage or default to light
  const savedTheme = localStorage.getItem('portfolio-theme') || 'light';
  htmlElement.setAttribute('data-theme', savedTheme);

  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = htmlElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    htmlElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('portfolio-theme', newTheme);
  });

  /* ------------------------------------------------------------------------
     2. NAVBAR SCROLL EFFECT & ACTIVE SECTION LINK
     ------------------------------------------------------------------------ */
  const navbar = document.getElementById('navbar');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    // Highlight active nav link on scroll
    let current = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 120;
      const sectionHeight = section.offsetHeight;
      if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  });

  /* ------------------------------------------------------------------------
     3. MOBILE NAVIGATION MENU TOGGLE
     ------------------------------------------------------------------------ */
  const mobileToggleBtn = document.getElementById('mobile-toggle');
  const navMenu = document.getElementById('nav-menu');

  if (mobileToggleBtn && navMenu) {
    mobileToggleBtn.addEventListener('click', () => {
      navMenu.classList.toggle('active');
    });

    // Close menu when clicking links
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
      });
    });
  }

  /* ------------------------------------------------------------------------
     4. PROJECT CATEGORY FILTER TABS
     ------------------------------------------------------------------------ */
  const filterBtns = document.querySelectorAll('.filter-btn');
  const projectCards = document.querySelectorAll('.project-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filterValue = btn.getAttribute('data-filter');

      projectCards.forEach(card => {
        const categories = card.getAttribute('data-category').split(' ');
        if (filterValue === 'all' || categories.includes(filterValue)) {
          card.style.display = 'flex';
          setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'scale(1)';
          }, 50);
        } else {
          card.style.opacity = '0';
          card.style.transform = 'scale(0.95)';
          setTimeout(() => {
            card.style.display = 'none';
          }, 300);
        }
      });
    });
  });

  /* ------------------------------------------------------------------------
     5. SKILL PROGRESS BARS ANIMATION (INTERSECTION OBSERVER)
     ------------------------------------------------------------------------ */
  const skillSection = document.getElementById('skills');
  const progressFills = document.querySelectorAll('.progress-bar-fill');

  if (skillSection && progressFills.length > 0) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          progressFills.forEach(fill => {
            const targetWidth = fill.getAttribute('data-progress');
            fill.style.width = targetWidth;
          });
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });

    observer.observe(skillSection);
  }

  /* ------------------------------------------------------------------------
     6. CONTACT FORM & TOAST NOTIFICATION
     ------------------------------------------------------------------------ */
  const contactForm = document.getElementById('contact-form');
  const toast = document.getElementById('toast');

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3500);
  }

  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      showToast('Message sent successfully! Thank you for reaching out.');
      contactForm.reset();
    });
  }

  /* ------------------------------------------------------------------------
     7. CLICK TO COPY EMAIL
     ------------------------------------------------------------------------ */
  const copyEmailBtn = document.getElementById('copy-email-btn');
  if (copyEmailBtn) {
    copyEmailBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const email = 'becorvillo14@gmail.com';
      navigator.clipboard.writeText(email).then(() => {
        showToast('Email address copied to clipboard!');
      }).catch(() => {
        showToast('Direct Email: becorvillo14@gmail.com');
      });
    });
  }

  /* ------------------------------------------------------------------------
     8. BACK TO TOP BUTTON
     ------------------------------------------------------------------------ */
  const backToTopBtn = document.getElementById('back-to-top');
  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  /* ------------------------------------------------------------------------
     9. HERO TYPEWRITER ANIMATION
     ------------------------------------------------------------------------ */
  const typedTextSpan = document.getElementById('typed-text');
  if (typedTextSpan) {
    const roles = [
      'Robotics Engineer',
      'Firmware Developer',
      'Mechatronics Engineer',
      'PCB Designer',
      'Control Systems Engineer',
      'Simulation Developer',
      'Student'
    ];
    let roleIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    const typeSpeed = 90;
    const deleteSpeed = 45;
    const pauseBeforeDelete = 1800;
    const pauseBeforeType = 350;

    function typeEffect() {
      const currentRole = roles[roleIndex];

      if (isDeleting) {
        charIndex--;
      } else {
        charIndex++;
      }

      typedTextSpan.textContent = currentRole.substring(0, charIndex);

      let nextDelay = isDeleting ? deleteSpeed : typeSpeed;

      if (!isDeleting && charIndex === currentRole.length) {
        nextDelay = pauseBeforeDelete;
        isDeleting = true;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        roleIndex = (roleIndex + 1) % roles.length;
        nextDelay = pauseBeforeType;
      }

      setTimeout(typeEffect, nextDelay);
    }

    setTimeout(typeEffect, 400);
  }

  /* ------------------------------------------------------------------------
     10. MOYABOT PROJECT MODAL POPUP
     ------------------------------------------------------------------------ */
  const moyabotCard = document.getElementById('card-moyabot');
  const openModalBtn = document.getElementById('open-moyabot-modal');
  const moyabotModal = document.getElementById('moyabot-modal');
  const closeModalBtn = document.getElementById('close-moyabot-modal');
  const moyabotVideo = document.getElementById('moyabot-video');

  function openMoyabotModal() {
    if (!moyabotModal) return;
    moyabotModal.classList.add('active');
    moyabotModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (moyabotVideo) {
      moyabotVideo.play().catch(() => {});
    }
  }

  function closeMoyabotModal() {
    if (!moyabotModal) return;
    moyabotModal.classList.remove('active');
    moyabotModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (moyabotVideo) {
      moyabotVideo.pause();
      moyabotVideo.currentTime = 0;
    }
  }

  if (moyabotCard) {
    moyabotCard.addEventListener('click', () => {
      openMoyabotModal();
    });
  }

  if (openModalBtn) {
    openModalBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openMoyabotModal();
    });
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeMoyabotModal();
    });
  }

  if (moyabotModal) {
    moyabotModal.addEventListener('click', (e) => {
      if (e.target === moyabotModal) {
        closeMoyabotModal();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && moyabotModal && moyabotModal.classList.contains('active')) {
      closeMoyabotModal();
    }
  });

  /* ------------------------------------------------------------------------
     11. TUNABOT PROJECT MODAL & CAROUSEL
     ------------------------------------------------------------------------ */
  const tunabotCard = document.getElementById('card-tunabot');
  const openTunabotBtn = document.getElementById('open-tunabot-modal');
  const tunabotModal = document.getElementById('tunabot-modal');
  const closeTunabotBtn = document.getElementById('close-tunabot-modal');

  const tunabotSlides = document.querySelectorAll('#tunabot-carousel-wrapper .carousel-slide');
  const tunabotDots = document.querySelectorAll('#tunabot-dots .carousel-dot');
  const tunabotPrevBtn = document.getElementById('tunabot-prev');
  const tunabotNextBtn = document.getElementById('tunabot-next');

  let currentTunabotSlide = 0;

  function setTunabotSlide(index) {
    if (!tunabotSlides.length) return;

    // Pause any playing videos in the slides and ensure audio is muted
    tunabotSlides.forEach(slide => {
      const vid = slide.querySelector('video');
      if (vid) {
        vid.muted = true;
        vid.pause();
      }
    });

    currentTunabotSlide = (index + tunabotSlides.length) % tunabotSlides.length;

    tunabotSlides.forEach((slide, i) => {
      slide.classList.toggle('active', i === currentTunabotSlide);
    });

    tunabotDots.forEach((dot, i) => {
      dot.classList.toggle('active', i === currentTunabotSlide);
    });
  }

  if (tunabotPrevBtn) {
    tunabotPrevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setTunabotSlide(currentTunabotSlide - 1);
    });
  }

  if (tunabotNextBtn) {
    tunabotNextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setTunabotSlide(currentTunabotSlide + 1);
    });
  }

  tunabotDots.forEach((dot, i) => {
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      setTunabotSlide(i);
    });
  });

  function openTunabotModal() {
    if (!tunabotModal) return;
    tunabotModal.classList.add('active');
    tunabotModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTunabotSlide(0);
  }

  function closeTunabotModal() {
    if (!tunabotModal) return;
    tunabotModal.classList.remove('active');
    tunabotModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    tunabotSlides.forEach(slide => {
      const vid = slide.querySelector('video');
      if (vid) {
        vid.pause();
        vid.currentTime = 0;
      }
    });
  }

  if (tunabotCard) {
    tunabotCard.addEventListener('click', () => {
      openTunabotModal();
    });
  }

  if (openTunabotBtn) {
    openTunabotBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openTunabotModal();
    });
  }

  if (closeTunabotBtn) {
    closeTunabotBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeTunabotModal();
    });
  }

  if (tunabotModal) {
    tunabotModal.addEventListener('click', (e) => {
      if (e.target === tunabotModal) {
        closeTunabotModal();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (tunabotModal && tunabotModal.classList.contains('active')) {
      if (e.key === 'Escape') {
        closeTunabotModal();
      } else if (e.key === 'ArrowLeft') {
        setTunabotSlide(currentTunabotSlide - 1);
      } else if (e.key === 'ArrowRight') {
        setTunabotSlide(currentTunabotSlide + 1);
      }
    }
  });

  /* ------------------------------------------------------------------------
     12. FPGA_HERO PROJECT MODAL
     ------------------------------------------------------------------------ */
  const fpgaHeroCard = document.getElementById('card-fpga-hero');
  const openFpgaHeroBtn = document.getElementById('open-fpga-hero-modal');
  const fpgaHeroModal = document.getElementById('fpga-hero-modal');
  const closeFpgaHeroBtn = document.getElementById('close-fpga-hero-modal');
  const fpgaHeroVideo = document.getElementById('fpga-hero-video');

  function openFpgaHeroModal() {
    if (!fpgaHeroModal) return;
    fpgaHeroModal.classList.add('active');
    fpgaHeroModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (fpgaHeroVideo) {
      fpgaHeroVideo.play().catch(() => {});
    }
  }

  function closeFpgaHeroModal() {
    if (!fpgaHeroModal) return;
    fpgaHeroModal.classList.remove('active');
    fpgaHeroModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (fpgaHeroVideo) {
      fpgaHeroVideo.pause();
      fpgaHeroVideo.currentTime = 0;
    }
  }

  if (fpgaHeroCard) {
    fpgaHeroCard.addEventListener('click', () => {
      openFpgaHeroModal();
    });
  }

  if (openFpgaHeroBtn) {
    openFpgaHeroBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openFpgaHeroModal();
    });
  }

  if (closeFpgaHeroBtn) {
    closeFpgaHeroBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeFpgaHeroModal();
    });
  }

  if (fpgaHeroModal) {
    fpgaHeroModal.addEventListener('click', (e) => {
      if (e.target === fpgaHeroModal) {
        closeFpgaHeroModal();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && fpgaHeroModal && fpgaHeroModal.classList.contains('active')) {
      closeFpgaHeroModal();
    }
  });

  /* ------------------------------------------------------------------------
     13. ESCAPEROOM CUBE PROJECT MODAL
     ------------------------------------------------------------------------ */
  const escaperoomCard = document.getElementById('card-escaperoom');
  const openEscaperoomBtn = document.getElementById('open-escaperoom-modal');
  const escaperoomModal = document.getElementById('escaperoom-modal');
  const closeEscaperoomBtn = document.getElementById('close-escaperoom-modal');
  const escaperoomVideo = document.getElementById('escaperoom-video');
  const rotateEscaperoomBtn = document.getElementById('rotate-escaperoom-btn');

  let escaperoomRotation = 270; // 90 + 180 = 270 degrees

  function openEscaperoomModal() {
    if (!escaperoomModal) return;
    escaperoomModal.classList.add('active');
    escaperoomModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (escaperoomVideo) {
      escaperoomVideo.style.transform = `rotate(${escaperoomRotation}deg)`;
      escaperoomVideo.play().catch(() => {});
    }
  }

  function closeEscaperoomModal() {
    if (!escaperoomModal) return;
    escaperoomModal.classList.remove('active');
    escaperoomModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (escaperoomVideo) {
      escaperoomVideo.pause();
      escaperoomVideo.currentTime = 0;
    }
  }

  if (rotateEscaperoomBtn && escaperoomVideo) {
    rotateEscaperoomBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      escaperoomRotation = (escaperoomRotation + 90) % 360;
      escaperoomVideo.style.transform = `rotate(${escaperoomRotation}deg)`;
    });
  }

  if (escaperoomCard) {
    escaperoomCard.addEventListener('click', () => {
      openEscaperoomModal();
    });
  }

  if (openEscaperoomBtn) {
    openEscaperoomBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEscaperoomModal();
    });
  }

  if (closeEscaperoomBtn) {
    closeEscaperoomBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeEscaperoomModal();
    });
  }

  if (escaperoomModal) {
    escaperoomModal.addEventListener('click', (e) => {
      if (e.target === escaperoomModal) {
        closeEscaperoomModal();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && escaperoomModal && escaperoomModal.classList.contains('active')) {
      closeEscaperoomModal();
    }
  });

  /* ------------------------------------------------------------------------
     14. DUAL DELTA DIGITAL TWIN PROJECT MODAL
     ------------------------------------------------------------------------ */
  const deltaTwinCard = document.getElementById('card-delta-twin');
  const openDeltaTwinBtn = document.getElementById('open-delta-twin-modal');
  const deltaTwinModal = document.getElementById('delta-twin-modal');
  const closeDeltaTwinBtn = document.getElementById('close-delta-twin-modal');
  const deltaTwinVideo = document.getElementById('delta-twin-video');

  function openDeltaTwinModal() {
    if (!deltaTwinModal) return;
    deltaTwinModal.classList.add('active');
    deltaTwinModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (deltaTwinVideo) {
      deltaTwinVideo.play().catch(() => {});
    }
  }

  function closeDeltaTwinModal() {
    if (!deltaTwinModal) return;
    deltaTwinModal.classList.remove('active');
    deltaTwinModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (deltaTwinVideo) {
      deltaTwinVideo.pause();
      deltaTwinVideo.currentTime = 0;
    }
  }

  if (deltaTwinCard) {
    deltaTwinCard.addEventListener('click', () => {
      openDeltaTwinModal();
    });
  }

  if (openDeltaTwinBtn) {
    openDeltaTwinBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openDeltaTwinModal();
    });
  }

  if (closeDeltaTwinBtn) {
    closeDeltaTwinBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeDeltaTwinModal();
    });
  }

  if (deltaTwinModal) {
    deltaTwinModal.addEventListener('click', (e) => {
      if (e.target === deltaTwinModal) {
        closeDeltaTwinModal();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && deltaTwinModal && deltaTwinModal.classList.contains('active')) {
      closeDeltaTwinModal();
    }
  });

  /* ------------------------------------------------------------------------
     15. MACHINE LEARNING IN PLC CONTROL PROJECT MODAL
     ------------------------------------------------------------------------ */
  const mlPlcCard = document.getElementById('card-ml-plc');
  const openMlPlcBtn = document.getElementById('open-ml-plc-modal');
  const mlPlcModal = document.getElementById('ml-plc-modal');
  const closeMlPlcBtn = document.getElementById('close-ml-plc-modal');
  const mlPlcVideo = document.getElementById('ml-plc-video');

  function openMlPlcModal() {
    if (!mlPlcModal) return;
    mlPlcModal.classList.add('active');
    mlPlcModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (mlPlcVideo) {
      mlPlcVideo.play().catch(() => {});
    }
  }

  function closeMlPlcModal() {
    if (!mlPlcModal) return;
    mlPlcModal.classList.remove('active');
    mlPlcModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (mlPlcVideo) {
      mlPlcVideo.pause();
      mlPlcVideo.currentTime = 0;
    }
  }

  if (mlPlcCard) {
    mlPlcCard.addEventListener('click', () => {
      openMlPlcModal();
    });
  }

  if (openMlPlcBtn) {
    openMlPlcBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openMlPlcModal();
    });
  }

  if (closeMlPlcBtn) {
    closeMlPlcBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeMlPlcModal();
    });
  }

  if (mlPlcModal) {
    mlPlcModal.addEventListener('click', (e) => {
      if (e.target === mlPlcModal) {
        closeMlPlcModal();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mlPlcModal && mlPlcModal.classList.contains('active')) {
      closeMlPlcModal();
    }
  });

  /* ------------------------------------------------------------------------
     16. TARANTULA PROJECT MODAL
     ------------------------------------------------------------------------ */
  const tarantulaCard = document.getElementById('card-tarantula');
  const openTarantulaBtn = document.getElementById('open-tarantula-modal');
  const tarantulaModal = document.getElementById('tarantula-modal');
  const closeTarantulaBtn = document.getElementById('close-tarantula-modal');
  const tarantulaVideo = document.getElementById('tarantula-video');

  function openTarantulaModal() {
    if (!tarantulaModal) return;
    tarantulaModal.classList.add('active');
    tarantulaModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (tarantulaVideo) {
      tarantulaVideo.play().catch(() => {});
    }
  }

  function closeTarantulaModal() {
    if (!tarantulaModal) return;
    tarantulaModal.classList.remove('active');
    tarantulaModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (tarantulaVideo) {
      tarantulaVideo.pause();
      tarantulaVideo.currentTime = 0;
    }
  }

  if (tarantulaCard) {
    tarantulaCard.addEventListener('click', () => {
      openTarantulaModal();
    });
  }

  if (openTarantulaBtn) {
    openTarantulaBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openTarantulaModal();
    });
  }

  if (closeTarantulaBtn) {
    closeTarantulaBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeTarantulaModal();
    });
  }

  if (tarantulaModal) {
    tarantulaModal.addEventListener('click', (e) => {
      if (e.target === tarantulaModal) {
        closeTarantulaModal();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && tarantulaModal && tarantulaModal.classList.contains('active')) {
      closeTarantulaModal();
    }
  });

  /* ------------------------------------------------------------------------
     17. BALBO CHESS PROJECT MODAL
     ------------------------------------------------------------------------ */
  const chessCard = document.getElementById('card-chess');
  const openChessBtn = document.getElementById('open-chess-modal');
  const chessModal = document.getElementById('chess-modal');
  const closeChessBtn = document.getElementById('close-chess-modal');
  const chessVideo = document.getElementById('chess-video');

  function openChessModal() {
    if (!chessModal) return;
    chessModal.classList.add('active');
    chessModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (chessVideo) {
      chessVideo.play().catch(() => {});
    }
  }

  function closeChessModal() {
    if (!chessModal) return;
    chessModal.classList.remove('active');
    chessModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (chessVideo) {
      chessVideo.pause();
      chessVideo.currentTime = 0;
    }
  }

  if (chessCard) {
    chessCard.addEventListener('click', () => {
      openChessModal();
    });
  }

  if (openChessBtn) {
    openChessBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openChessModal();
    });
  }

  if (closeChessBtn) {
    closeChessBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeChessModal();
    });
  }

  if (chessModal) {
    chessModal.addEventListener('click', (e) => {
      if (e.target === chessModal) {
        closeChessModal();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && chessModal && chessModal.classList.contains('active')) {
      closeChessModal();
    }
  });

});



