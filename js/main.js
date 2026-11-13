/* AI ENTERPRISES — interactions
   GSAP + ScrollTrigger + Lenis + Three.js (all loaded from CDN; site degrades gracefully if they fail) */
(function () {
  'use strict';
  var doc = document.documentElement;
  var reduceOS = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var reduce = false; // animations stay on for every visitor; only smooth-scroll respects the OS setting
  var fine = window.matchMedia('(pointer:fine)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  if (!window.gsap || !window.ScrollTrigger) {
    doc.classList.add('fallback');
    document.body.classList.remove('is-loading');
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* ---------- smooth scroll ---------- */
  var lenis = null;
  if (window.Lenis && !reduceOS) {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.95 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  function lockScroll(v) { if (lenis) { v ? lenis.stop() : lenis.start(); } document.body.style.overflow = v ? 'hidden' : ''; }

  /* ---------- helpers ---------- */
  function splitWords(el) {
    var out = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var parts = n.textContent.split(/(\s+)/);
          var frag = document.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span'); w.className = 'w';
            var i = document.createElement('span'); i.className = 'wi'; i.textContent = p;
            w.appendChild(i); frag.appendChild(w); out.push(i);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') { walk(n); }
      });
    })(el);
    return out;
  }

  /* ---------- page transition ---------- */
  var pt = $('#pt');
  var ptCols = pt ? $$('div', pt) : [];
  function ptOut(cb) {
    if (!pt) { cb && cb(); return; }
    gsap.to(ptCols, { scaleY: 0, transformOrigin: 'top', duration: 0.9, ease: 'expo.inOut', stagger: { each: 0.06, from: 'start' }, onComplete: function () { pt.classList.remove('on'); cb && cb(); } });
  }
  function ptIn(href) {
    pt.classList.add('on');
    gsap.set(ptCols, { transformOrigin: 'bottom', scaleY: 0 });
    gsap.to(ptCols, { scaleY: 1, duration: 0.75, ease: 'expo.inOut', stagger: { each: 0.06, from: 'end' }, onComplete: function () { window.location.href = href; } });
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#' || /^(mailto:|tel:|https?:)/.test(href) || a.hasAttribute('download')) return;
    e.preventDefault();
    if (document.body.classList.contains('menu-open')) document.body.classList.remove('menu-open');
    if (href === location.pathname.split('/').pop()) { if (lenis) lenis.scrollTo(0); return; }
    ptIn(href);
  });
  window.addEventListener('pageshow', function (e) { if (e.persisted && pt) { pt.classList.remove('on'); gsap.set(ptCols, { scaleY: 0 }); } });

  /* ---------- intro (loader on first visit to home, curtain otherwise) ---------- */
  var loader = $('#loader');
  var seen = false;
  try { seen = sessionStorage.getItem('za-loaded') === '1'; } catch (e) {}

  function start() {
    document.body.classList.remove('is-loading');
    lockScroll(false);
    heroIntro();
    initScrollFX();
    ScrollTrigger.refresh();
  }

  if (loader && !seen && !reduce) {
    lockScroll(true);
    gsap.set(ptCols, { scaleY: 0 });
    var cnt = $('.ld-count span', loader), bar = $('.ld-bar', loader), word = $$('.ld-word span', loader);
    var o = { v: 0 };
    gsap.set(word, { yPercent: 110 });
    var paint = function () { cnt.textContent = Math.round(o.v); };
    var introDone = false, pageLoaded = document.readyState === 'complete', exiting = false;
    // phase 1: words rise, counter races to 88% (short, fixed)
    gsap.timeline({ onComplete: function () { introDone = true; exit(); } })
      .to(word, { yPercent: 0, duration: 0.9, ease: 'expo.out', stagger: 0.05 }, 0.05)
      .to(o, { v: 88, duration: 1.1, ease: 'power2.out', onUpdate: paint }, 0)
      .to(bar, { scaleX: 0.88, duration: 1.1, ease: 'power2.out' }, 0);
    // phase 2: runs as soon as the page has really finished loading (never waits longer than needed)
    function exit() {
      if (exiting || !introDone || !pageLoaded) return;
      exiting = true;
      gsap.timeline({ onComplete: function () { try { sessionStorage.setItem('za-loaded', '1'); } catch (e) {} } })
        .to(o, { v: 100, duration: 0.3, ease: 'none', onUpdate: paint }, 0)
        .to(bar, { scaleX: 1, duration: 0.3, ease: 'none' }, 0)
        .to(word, { yPercent: -110, duration: 0.55, ease: 'expo.in', stagger: 0.03 }, 0.25)
        .to($$('.ld-top,.ld-count', loader), { opacity: 0, duration: 0.3 }, 0.25)
        .to(loader, { yPercent: -100, duration: 0.9, ease: 'expo.inOut', onStart: start }, 0.7)
        .set(loader, { display: 'none' });
    }
    if (!pageLoaded) window.addEventListener('load', function () { pageLoaded = true; exit(); });
    setTimeout(function () { pageLoaded = true; exit(); }, 6000); // safety net on very slow connections
  } else {
    if (loader) loader.style.display = 'none';
    gsap.set(ptCols, { scaleY: 1, transformOrigin: 'top' });
    ptOut(start);
  }

  /* ---------- header, menu, cursor ---------- */
  var hdr = $('.hdr');
  var lastY = 0;
  function onScroll(y) {
    if (!hdr) return;
    hdr.classList.toggle('scrolled', y > 40);
    lastY = y;
  }
  if (lenis) lenis.on('scroll', function (e) { onScroll(e.scroll); });
  else window.addEventListener('scroll', function () { onScroll(window.scrollY); }, { passive: true });

  var burger = $('.burger');
  if (burger) burger.addEventListener('click', function () {
    var open = document.body.classList.toggle('menu-open');
    burger.setAttribute('aria-expanded', open);
    lockScroll(open);
  });

  var cursor = $('.cursor');
  if (cursor && fine) {
    var cx = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3' }), cy = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3' });
    window.addEventListener('mousemove', function (e) { cursor.classList.add('show'); cx(e.clientX); cy(e.clientY); });
    document.addEventListener('mouseleave', function () { cursor.classList.remove('show'); });
    var lab = $('span', cursor);
    document.addEventListener('mouseover', function (e) {
      var t = e.target.closest ? e.target.closest('[data-cursor],a,button,.cat,.mi,.strip img') : null;
      cursor.classList.remove('big', 'link');
      if (!t) return;
      var txt = t.getAttribute('data-cursor') || (t.matches('.mi,.strip img') ? 'View' : '');
      if (txt) { lab.textContent = txt; cursor.classList.add('big'); } else { cursor.classList.add('link'); }
    });
  }

  /* magnetic buttons */
  if (fine && !reduce) $$('.btn,.burger').forEach(function (b) {
    b.addEventListener('mousemove', function (e) {
      var r = b.getBoundingClientRect();
      gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * 0.25, y: (e.clientY - r.top - r.height / 2) * 0.35, duration: 0.4, ease: 'power3' });
    });
    b.addEventListener('mouseleave', function () { gsap.to(b, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1,.4)' }); });
  });

  /* ---------- hero intro ---------- */
  function heroIntro() {
    var h = $('[data-hero]');
    if (!h) return;
    var h1 = h.tagName === 'H1' ? h : $('h1', h);
    var words = h1 ? splitWords(h1) : [];
    var tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.from(words, { yPercent: 120, rotate: 9, skewX: -14, duration: 1.5, stagger: 0.09 }, 0)
      .from('[data-hero-fade]', { y: 30, opacity: 0, duration: 1.1, stagger: 0.1 }, 0.5)
      ;
  }

  /* ---------- scroll effects ---------- */
  var scrollInit = false;
  function initScrollFX() {
    if (scrollInit) return; scrollInit = true;

    // headings: word reveal
    $$('[data-split]').forEach(function (el) {
      var inHero = el.closest('[data-hero]');
      var words = inHero ? [] : splitWords(el);
      if (!words.length) return;
      gsap.from(words, { yPercent: 120, rotate: 7, skewX: -12, duration: 1.3, ease: 'expo.out', stagger: 0.06, scrollTrigger: { trigger: el, start: 'top 88%' } });
    });

    // statement: scrub highlight
    $$('[data-scrub]').forEach(function (el) {
      var words = [];
      (function walk(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (n) {
          if (n.nodeType === 3) {
            var frag = document.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach(function (p) {
              if (!p) return;
              if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
              var s = document.createElement('span'); s.className = 'sw'; s.textContent = p; frag.appendChild(s); words.push(s);
            });
            n.parentNode.replaceChild(frag, n);
          } else if (n.nodeType === 1) walk(n);
        });
      })(el);
      gsap.to(words, { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: 0.6 } });
    });

    // fade-up
    $$('[data-reveal]').forEach(function (el) {
      gsap.from(el, { y: 50, opacity: 0, duration: 1.2, ease: 'expo.out', delay: parseFloat(el.getAttribute('data-delay') || 0), scrollTrigger: { trigger: el, start: 'top 90%' } });
    });
    $$('[data-stagger]').forEach(function (p) {
      gsap.from(p.children, { y: 60, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: p, start: 'top 85%' } });
    });

    // image clip reveal + parallax
    $$('[data-clip]').forEach(function (el) {
      gsap.fromTo(el, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.5, ease: 'expo.inOut', scrollTrigger: { trigger: el, start: 'top 85%' } });
    });
    $$('[data-parallax]').forEach(function (img) {
      var amt = parseFloat(img.getAttribute('data-parallax')) || 12;
      gsap.fromTo(img, { yPercent: -amt, scale: 1.15 }, { yPercent: amt, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    $$('.hr-line').forEach(function (l) {
      gsap.from(l, { scaleX: 0, duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: l, start: 'top 95%' } });
    });

    // counters
    $$('[data-count]').forEach(function (el) {
      var end = parseFloat(el.getAttribute('data-count')), o = { v: 0 }, fmt = el.getAttribute('data-fmt');
      ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: function () {
        gsap.to(o, { v: end, duration: 2.2, ease: 'power3.out', onUpdate: function () { el.textContent = fmt === 'plain' ? Math.round(o.v) : Math.round(o.v); } });
      } });
    });

    // horizontal projects
    var hs = $('.hscroll'), track = hs && $('.hs-track', hs);
    if (track) {
      ScrollTrigger.matchMedia({
        '(min-width: 1px)': function () {
          var dist = function () { return track.scrollWidth - window.innerWidth; };
          gsap.to(track, { x: function () { return -dist(); }, ease: 'none', scrollTrigger: { trigger: hs, start: 'top top', end: function () { return '+=' + dist(); }, pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1 } });
        }
      });
    }

    initExtra();
  }

  /* ---------- extra motion: crooked images, wonky tiles, kinetic text, scroll skew ---------- */
  function initExtra() {
    // 1) images start tilted + small, then straighten as they scroll into view (alternating direction)
    $$('.imgbox,.pbanner,.person').forEach(function (el, i) {
      var dir = i % 2 ? 1 : -1;
      gsap.fromTo(el, { rotation: dir * 5, scale: 0.92 }, { rotation: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 96%', end: 'top 40%', scrub: true } });
    });

    // 2) tiles / strips / cards rest slightly crooked; hover (desktop) snaps them straight
    var rots = [-2.2, 1.6, -1.2, 2.4, -1.8, 1];
    $$('.logo-tile,.inst,.strip img,.mi,.pcard:not(.end)').forEach(function (el, i) {
      var r = rots[i % rots.length];
      gsap.set(el, { rotation: r });
      if (fine) {
        el.addEventListener('mouseenter', function () { gsap.to(el, { rotation: 0, duration: 0.6, ease: 'back.out(2.2)', overwrite: 'auto' }); });
        el.addEventListener('mouseleave', function () { gsap.to(el, { rotation: r, duration: 0.8, ease: 'elastic.out(1,.5)', overwrite: 'auto' }); });
      }
    });

    // 3) giant kinetic text rows slide in opposite directions as you scroll
    $$('.krow').forEach(function (row) {
      var dir = +row.getAttribute('data-k') || 1;
      gsap.fromTo(row, { xPercent: dir > 0 ? -33 : 0 }, { xPercent: dir > 0 ? 0 : -33, ease: 'none', scrollTrigger: { trigger: row.parentNode, start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
    });

    // 4) scroll-velocity skew on headings/images + marquee speeds up while scrolling
    var skewEls = $$('h1.display,h2.display,.statement,.imgbox,.pbanner,.person,.krow');
    if (skewEls.length) {
      gsap.set(skewEls, { transformOrigin: '50% 50%' });
      var setSkew = gsap.quickSetter(skewEls, 'skewY', 'deg'), px = { s: 0 }, clampS = gsap.utils.clamp(-6, 6);
      var anims = $$('.marq-track').map(function (t) { return t.getAnimations ? t.getAnimations()[0] : null; }).filter(Boolean);
      var rate = { r: 1 };
      ScrollTrigger.create({ onUpdate: function (self) {
        var v = self.getVelocity(), s = clampS(v / -350);
        if (Math.abs(s) > Math.abs(px.s)) {
          px.s = s;
          gsap.to(px, { s: 0, duration: 0.9, ease: 'power3', overwrite: true, onUpdate: function () { setSkew(px.s); } });
        }
        var r = 1 + Math.min(5, Math.abs(v) / 350);
        if (anims.length && r > rate.r) {
          rate.r = r;
          gsap.to(rate, { r: 1, duration: 1.4, ease: 'power2.out', overwrite: true, onUpdate: function () { anims.forEach(function (a) { a.updatePlaybackRate(rate.r); }); } });
        }
      } });
    }

    if (fine) {
      // 5) words in big headings lean over and bounce when hovered
      $$('.display .w').forEach(function (w) {
        var wi = $('.wi', w);
        if (!wi) return;
        w.addEventListener('mouseenter', function () { gsap.to(wi, { skewX: -14, rotate: -3, yPercent: -6, duration: 0.35, ease: 'power3.out', overwrite: 'auto' }); });
        w.addEventListener('mouseleave', function () { gsap.to(wi, { skewX: 0, rotate: 0, yPercent: 0, duration: 1, ease: 'elastic.out(1,.4)', overwrite: 'auto' }); });
      });

      // 6) hero photos drift with the mouse at different depths
      var depth = [40, -30, 22];
      var fp = $$('.fphoto').map(function (el, i) { return { x: gsap.quickTo(el, 'x', { duration: 1.2, ease: 'power3' }), y: gsap.quickTo(el, 'y', { duration: 1.2, ease: 'power3' }), d: depth[i % 3] }; });
      if (fp.length) window.addEventListener('mousemove', function (e) {
        var nx = e.clientX / window.innerWidth - 0.5, ny = e.clientY / window.innerHeight - 0.5;
        fp.forEach(function (f) { f.x(nx * f.d * 2); f.y(ny * f.d * 2); });
      });
    }
  }

  /* ---------- tilt + glare cards ---------- */
  if (fine && !reduce) $$('[data-tilt]').forEach(function (c) {
    var max = parseFloat(c.getAttribute('data-tilt')) || 8;
    var g = $('.glare', c);
    c.addEventListener('mousemove', function (e) {
      var r = c.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      gsap.to(c, { rotateY: (px - 0.5) * max * 2, rotateX: -(py - 0.5) * max * 2, transformPerspective: 900, duration: 0.5, ease: 'power3' });
      if (g) { c.style.setProperty('--gx', px * 100 + '%'); c.style.setProperty('--gy', py * 100 + '%'); }
    });
    c.addEventListener('mouseleave', function () { gsap.to(c, { rotateX: 0, rotateY: 0, duration: 0.9, ease: 'elastic.out(1,.5)' }); });
  });

  /* touch devices have no hover, so cards get a scroll-driven 3D entrance instead */
  if (!fine) $$('.scard,.person,.inst,.logo-tile').forEach(function (c) {
    // only rotate/scale here: the parent's stagger already owns y + opacity, so the two never fight
    gsap.fromTo(c, { rotateX: 14, scale: 0.94, transformPerspective: 800 }, { rotateX: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: c, start: 'top 98%', end: 'top 70%', scrub: true } });
  });

  /* ---------- hover image follow (service list) ---------- */
  var fl = $('.float-img');
  if (fl && fine) {
    var imgs = $$('img', fl);
    var fx = gsap.quickTo(fl, 'x', { duration: 0.6, ease: 'power3' }), fy = gsap.quickTo(fl, 'y', { duration: 0.6, ease: 'power3' });
    var rot = gsap.quickTo(fl, 'rotate', { duration: 0.6, ease: 'power3' });
    var lastX = 0;
    window.addEventListener('mousemove', function (e) {
      fx(e.clientX + 30); fy(e.clientY - fl.offsetHeight / 2); rot(Math.max(-8, Math.min(8, (e.clientX - lastX) * 0.4))); lastX = e.clientX;
    });
    $$('.srow[data-img]').forEach(function (row) {
      row.addEventListener('mouseenter', function () {
        var i = +row.getAttribute('data-img');
        if (imgs[i] && !imgs[i].getAttribute('src')) imgs[i].src = imgs[i].getAttribute('data-src'); // load on first hover
        imgs.forEach(function (im, k) { im.classList.toggle('on', k === i); });
        gsap.to(fl, { opacity: 1, scale: 1, duration: 0.5, ease: 'expo.out' });
      });
      row.addEventListener('mouseleave', function () { gsap.to(fl, { opacity: 0, scale: 0.6, duration: 0.4, ease: 'expo.in' }); });
    });
  }

  /* ---------- gallery filter + lightbox ---------- */
  var cats = $$('.cat[data-f]');
  if (cats.length) {
    var items = $$('.mi');
    cats.forEach(function (b) {
      b.addEventListener('click', function () {
        cats.forEach(function (x) { x.classList.toggle('on', x === b); });
        var f = b.getAttribute('data-f');
        gsap.to(items, { opacity: 0, scale: 0.94, duration: 0.25, onComplete: function () {
          items.forEach(function (it) { it.classList.toggle('hidden', f !== 'all' && it.getAttribute('data-c') !== f); });
          gsap.fromTo(items.filter(function (it) { return !it.classList.contains('hidden'); }), { opacity: 0, y: 30, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'expo.out', stagger: 0.03 });
          ScrollTrigger.refresh();
        } });
      });
    });
  }
  var lb = $('.lb');
  if (lb) {
    var lbImg = $('img', lb), pool = [], idx = 0;
    var show = function (i) { idx = (i + pool.length) % pool.length; lbImg.src = pool[idx].src; };
    document.addEventListener('click', function (e) {
      var im = e.target.closest && e.target.closest('.mi img,.strip img,[data-lb] img');
      if (im) {
        var scope = im.closest('.masonry,.strip') || document;
        pool = $$('img', scope).filter(function (x) { return !x.closest('.hidden') && !x.closest('[aria-hidden="true"]') || x === im; });
        idx = Math.max(0, pool.indexOf(im)); lbImg.src = im.src; lb.classList.add('open'); lockScroll(true);
      } else if (e.target.closest && e.target.closest('.lb .x') || e.target === lb) { lb.classList.remove('open'); lockScroll(false); }
      else if (e.target.closest && e.target.closest('.lb .nv')) { show(idx + (e.target.closest('.nv').classList.contains('r') ? 1 : -1)); }
    });
    window.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') { lb.classList.remove('open'); lockScroll(false); }
      if (e.key === 'ArrowRight') show(idx + 1);
      if (e.key === 'ArrowLeft') show(idx - 1);
    });
  }

  /* ---------- contact form (opens mail client) ---------- */
  var form = $('#contact-form');
  if (form) {
    var sel = $('select', form);
    sel.addEventListener('change', function () { sel.parentNode.classList.toggle('has', !!sel.value); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(form);
      var body = 'Name: ' + d.get('name') + '\nPhone: ' + d.get('phone') + '\nEmail: ' + d.get('email') + '\nService: ' + d.get('service') + '\n\n' + d.get('message');
      window.location.href = 'mailto:ahsankhan172.ak@gmail.com?subject=' + encodeURIComponent('Website enquiry — ' + (d.get('service') || 'General')) + '&body=' + encodeURIComponent(body);
    });
  }

  /* ---------- 3D network (lightweight canvas renderer, no WebGL / no library) ---------- */
  function initNet(canvas, opt) {
    if (!canvas || !canvas.getContext) return;
    opt = opt || {};
    var shape = opt.shape || 'sphere', N = opt.count || 360;
    var ctx = canvas.getContext('2d', { alpha: true });
    var pts = [], i, a, b, p;
    for (i = 0; i < N; i++) {
      if (shape === 'sphere') {
        var phi = Math.acos(1 - 2 * (i + 0.5) / N), th = Math.PI * (1 + Math.sqrt(5)) * i;
        var r = 1.7 * (Math.random() < 0.72 ? 1 : 0.35 + Math.random() * 0.5);
        p = [Math.cos(th) * Math.sin(phi) * r, Math.sin(th) * Math.sin(phi) * r, Math.cos(phi) * r];
      } else if (shape === 'torus') {
        var u = Math.random() * Math.PI * 2, v = Math.random() * Math.PI * 2, R = 1.5, rr = 0.55 + Math.random() * 0.25;
        p = [(R + rr * Math.cos(v)) * Math.cos(u), (R + rr * Math.cos(v)) * Math.sin(u) * 0.55, rr * Math.sin(v) * 1.2];
      } else {
        p = [(Math.floor(Math.random() * 4) - 1.5) * 0.8, (Math.floor(Math.random() * 4) - 1.5) * 0.8, (Math.floor(Math.random() * 4) - 1.5) * 0.8];
      }
      pts.push(p);
    }
    var thr = shape === 'sphere' ? 0.62 : shape === 'torus' ? 0.5 : 0.85, edges = [];
    for (a = 0; a < N && edges.length < 1100; a++) for (b = a + 1; b < N; b++) {
      var dx = pts[a][0] - pts[b][0], dy = pts[a][1] - pts[b][1], dz = pts[a][2] - pts[b][2];
      if (dx * dx + dy * dy + dz * dz < thr * thr) { edges.push([a, b]); if (edges.length >= 1100) break; }
    }
    var big = pts.map(function () { return Math.random() < 0.3; });
    var PK = Math.min(34, edges.length), packets = [];
    for (i = 0; i < PK; i++) packets.push({ e: edges[(Math.random() * edges.length) | 0], t: Math.random(), s: 0.004 + Math.random() * 0.008 });

    var W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 1.5), acc = 0;
    var mx = 0, my = 0, tx = 0, ty = 0, vis = true, ry = 0, rz = 0, intro = { s: 0.2 };
    var proj = new Float32Array(N * 3), BUCKETS = 4;
    window.addEventListener('mousemove', function (e) { mx = e.clientX / window.innerWidth - 0.5; my = e.clientY / window.innerHeight - 0.5; }, { passive: true });
    function size() {
      var w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
      W = w; H = h; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    }
    size();
    if (window.ResizeObserver) new ResizeObserver(size).observe(canvas); else window.addEventListener('resize', size);
    if (window.IntersectionObserver) new IntersectionObserver(function (en) { vis = en[0].isIntersecting; }).observe(canvas);
    gsap.to(intro, { s: 1, duration: 2.4, ease: 'expo.out', delay: 0.3 });
    ScrollTrigger.create({ trigger: canvas, start: 'top bottom', end: 'bottom top', onUpdate: function (s) { rz = s.progress * 0.8; } });

    var tilt0 = shape === 'torus' ? 0.5 : 0, last = performance.now();
    function frame(now) {
      requestAnimationFrame(frame);
      var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
      if (!vis || document.hidden || !W) return;
      acc += dt; if (acc < 0.028) return; // draw at ~35 fps max: smooth enough for slow rotation, half the CPU/GPU work
      dt = acc; acc = 0;
      tx += (mx - tx) * 0.09; ty += (my - ty) * 0.09;
      ry += 0.096 * dt;
      var cy = Math.cos(ry), sy = Math.sin(ry), tiltX = ty * 0.7 + tilt0, cx = Math.cos(tiltX), sx = Math.sin(tiltX), cz = Math.cos(rz), sz = Math.sin(rz);
      var camZ = 5.2, f = Math.min(W, H) * 0.5 * camZ / 2.4 * intro.s, ox = W / 2 + tx * 40, oy = H / 2;
      var k, x, y, z, x1, z1, y1, z2, x2, y2;
      for (k = 0; k < N; k++) {
        x = pts[k][0]; y = pts[k][1]; z = pts[k][2];
        x1 = x * cy + z * sy; z1 = -x * sy + z * cy;            // spin (Y)
        y1 = y * cx - z1 * sx; z2 = y * sx + z1 * cx;            // tilt (X)
        x2 = x1 * cz - y1 * sz; y2 = x1 * sz + y1 * cz;          // roll (Z, scroll)
        var sc = camZ / (camZ + z2);
        proj[k * 3] = ox + x2 * f / camZ * sc; proj[k * 3 + 1] = oy + y2 * f / camZ * sc; proj[k * 3 + 2] = z2;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      // lines, batched into depth buckets (far = faint, near = stronger) => only 4 strokes
      var path = [], j;
      for (j = 0; j < BUCKETS; j++) path.push(new Path2D());
      for (k = 0; k < edges.length; k++) {
        var e = edges[k], A = e[0] * 3, B = e[1] * 3, zz = (proj[A + 2] + proj[B + 2]) * 0.5;
        var bi = Math.max(0, Math.min(BUCKETS - 1, Math.floor((1 - (zz + 1.8) / 3.6) * BUCKETS)));
        path[BUCKETS - 1 - bi].moveTo(proj[A], proj[A + 1]); path[BUCKETS - 1 - bi].lineTo(proj[B], proj[B + 1]);
      }
      ctx.lineWidth = 1;
      for (j = 0; j < BUCKETS; j++) { ctx.strokeStyle = 'rgba(108,128,91,' + (0.1 + j * 0.1).toFixed(2) + ')'; ctx.stroke(path[j]); }
      // nodes
      for (k = 0; k < N; k++) {
        var depth = 1 - (proj[k * 3 + 2] + 1.8) / 3.6; depth = depth < 0 ? 0 : depth > 1 ? 1 : depth;
        var rad = (big[k] ? 2.6 : 1.8) * (0.55 + depth * 0.9);
        ctx.fillStyle = big[k] ? 'rgba(108,128,91,' + (0.5 + depth * 0.5).toFixed(2) + ')' : 'rgba(59,75,53,' + (0.45 + depth * 0.55).toFixed(2) + ')';
        ctx.fillRect(proj[k * 3] - rad, proj[k * 3 + 1] - rad, rad * 2, rad * 2);
      }
      // data packets travelling along the links
      for (k = 0; k < PK; k++) {
        var pk = packets[k]; pk.t += pk.s;
        if (pk.t >= 1) { pk.t = 0; pk.e = edges[(Math.random() * edges.length) | 0]; }
        var a3 = pk.e[0] * 3, b3 = pk.e[1] * 3, px = proj[a3] + (proj[b3] - proj[a3]) * pk.t, py = proj[a3 + 1] + (proj[b3 + 1] - proj[a3 + 1]) * pk.t;
        ctx.fillStyle = 'rgba(168,183,143,.45)'; ctx.beginPath(); ctx.arc(px, py, 6, 0, 6.2832); ctx.fill();
        ctx.fillStyle = '#6C805B'; ctx.beginPath(); ctx.arc(px, py, 2.6, 0, 6.2832); ctx.fill();
      }
    }
    frame();
  }
  var nets = $$('canvas[data-net]');
  if (nets.length) {
    var bootNets = function () {
      var small = window.innerWidth < 800;
      nets.forEach(function (c) {
        var n = +c.getAttribute('data-count') || 360;
        initNet(c, { shape: c.getAttribute('data-net'), count: small ? Math.round(n * 0.6) : n });
      });
    };
    if (document.readyState === 'complete') bootNets(); else window.addEventListener('load', bootNets);
  }

  // lazy images can shift layout slightly once they arrive: re-measure scroll triggers once, debounced
  var rt; window.addEventListener('load', function () { clearTimeout(rt); rt = setTimeout(function () { ScrollTrigger.refresh(); }, 400); });

  /* ---------- footer word letters ---------- */
  var fw = $('.ftr-word');
  if (fw) {
    var t = fw.textContent; fw.textContent = '';
    t.split('').forEach(function (ch) { var s = document.createElement('span'); s.textContent = ch === ' ' ? ' ' : ch; fw.appendChild(s); });
    if (!reduce) gsap.from($$('span', fw), { yPercent: 100, duration: 1.4, ease: 'expo.out', stagger: 0.05, scrollTrigger: { trigger: fw, start: 'top 95%' } });
  }
})();
