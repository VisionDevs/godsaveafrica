/* ========================================
   GSAW Website — Scroll & UI Animations
======================================== */
(function () {
    'use strict';

    // -------------------------------------------------------
    // 1. SCROLL REVEAL (IntersectionObserver)
    // -------------------------------------------------------
    function initScrollReveal() {
        if (!('IntersectionObserver' in window)) return;

        var targets = document.querySelectorAll(
            '.section-header, .card, .stat-card, .leader-card, ' +
            '.join-info, .join-form-wrapper, .feature-card, ' +
            '.benefit-card, .timeline-item, .contact-box, ' +
            '.donate-wrapper, .news-card, .about-section'
        );

        targets.forEach(function (el, i) {
            el.classList.add('reveal');
            // Stagger siblings within the same parent
            var siblings = el.parentElement
                ? Array.prototype.slice.call(el.parentElement.querySelectorAll('.reveal'))
                : [];
            var idx = siblings.indexOf(el);
            if (idx > 0) {
                el.style.transitionDelay = Math.min(idx * 0.08, 0.4) + 's';
            }
        });

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target); // fire once
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

        targets.forEach(function (el) { observer.observe(el); });
    }

    // -------------------------------------------------------
    // 2. ANIMATED COUNTERS
    // -------------------------------------------------------
    function animateCounter(el, target, duration) {
        var start = 0;
        var step = target / (duration / 16);
        var handle = setInterval(function () {
            start += step;
            if (start >= target) {
                start = target;
                clearInterval(handle);
            }
            el.textContent = Math.round(start).toLocaleString('en-ZA') + (el.dataset.suffix || '');
        }, 16);
    }

    function initCounters() {
        var els = document.querySelectorAll('[data-count]');
        if (!els.length) return;

        if (!('IntersectionObserver' in window)) {
            els.forEach(function (el) {
                el.textContent = el.dataset.count + (el.dataset.suffix || '');
            });
            return;
        }

        var obs = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    animateCounter(entry.target, parseInt(entry.target.dataset.count, 10), 1200);
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        els.forEach(function (el) { obs.observe(el); });
    }

    // -------------------------------------------------------
    // 3. HERO PARTICLE / SUBTLE MOTION
    // -------------------------------------------------------
    function initHeroMotion() {
        var hero = document.querySelector('.hero, .page-hero, #hero');
        if (!hero) return;
        var lastY = 0;
        window.addEventListener('scroll', function () {
            var y = window.scrollY;
            if (Math.abs(y - lastY) < 2) return;
            lastY = y;
            hero.style.backgroundPositionY = (y * 0.35) + 'px';
        }, { passive: true });
    }

    // -------------------------------------------------------
    // 4. SMOOTH NAV LINK ACTIVE STATE ON SCROLL
    // -------------------------------------------------------
    function initNavHighlight() {
        var sections = document.querySelectorAll('section[id]');
        var navLinks = document.querySelectorAll('nav a[href*="#"]');
        if (!sections.length || !navLinks.length) return;

        window.addEventListener('scroll', function () {
            var scrollY = window.scrollY + 100;
            sections.forEach(function (sec) {
                if (scrollY >= sec.offsetTop && scrollY < sec.offsetTop + sec.offsetHeight) {
                    navLinks.forEach(function (a) {
                        a.classList.toggle('nav-active', a.getAttribute('href').includes('#' + sec.id));
                    });
                }
            });
        }, { passive: true });
    }

    // -------------------------------------------------------
    // 5. RIPPLE EFFECT ON BUTTONS
    // -------------------------------------------------------
    function initRipple() {
        document.querySelectorAll('.btn, .cta-btn, .submit-btn').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                var ripple = document.createElement('span');
                ripple.classList.add('btn-ripple');
                var rect = btn.getBoundingClientRect();
                var size = Math.max(rect.width, rect.height);
                ripple.style.cssText = 'position:absolute;border-radius:50%;background:rgba(255,255,255,0.3);' +
                    'width:' + size + 'px;height:' + size + 'px;' +
                    'left:' + (e.clientX - rect.left - size / 2) + 'px;' +
                    'top:' + (e.clientY - rect.top - size / 2) + 'px;' +
                    'transform:scale(0);animation:ripple-anim 0.55s linear;pointer-events:none;';
                btn.style.position = 'relative';
                btn.style.overflow = 'hidden';
                btn.appendChild(ripple);
                ripple.addEventListener('animationend', function () { ripple.remove(); });
            });
        });
    }

    // -------------------------------------------------------
    // INIT
    // -------------------------------------------------------
    document.addEventListener('DOMContentLoaded', function () {
        initScrollReveal();
        initCounters();
        initHeroMotion();
        initNavHighlight();
        initRipple();
    });
}());
