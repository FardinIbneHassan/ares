/* =========================================================
   ARES — shared site behaviour (all pages)
   No dependencies. Every feature checks that its elements
   exist, so this file is safe to load on every page.
   ========================================================= */
(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.remove("no-js");
  root.classList.add("js");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ---------- Header: solid background after scrolling ---------- */
  var header = $(".site-header");
  if (header) {
    var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 24); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Mobile navigation ---------- */
  var toggle = $(".nav-toggle");
  var nav = $("#site-nav");
  if (toggle && nav) {
    var setOpen = function (open) {
      toggle.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
      document.body.classList.toggle("nav-open", open);
    };
    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        setOpen(false);
        toggle.focus();
      }
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth >= 1024) setOpen(false);
    });
  }

  /* ---------- Split hero title into animated characters ---------- */
  $$("[data-split]").forEach(function (el) {
    var text = el.textContent.trim();
    el.setAttribute("aria-label", text);
    el.textContent = "";
    text.split("").forEach(function (ch, i) {
      var span = document.createElement("span");
      span.className = "char";
      span.setAttribute("aria-hidden", "true");
      span.style.setProperty("--i", i);
      span.textContent = ch === " " ? " " : ch;
      el.appendChild(span);
    });
  });

  /* ---------- Decode / scramble text effect ---------- */
  var GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/<>-_";
  function decode(el) {
    var final = el.getAttribute("data-decode") || el.textContent;
    el.setAttribute("data-decode", final);
    if (reduceMotion) { el.textContent = final; return; }
    var frame = 0;
    var total = 22;
    (function tick() {
      var out = "";
      for (var i = 0; i < final.length; i++) {
        var settleAt = (i / final.length) * total;
        if (final[i] === " " || frame >= settleAt) out += final[i];
        else out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      el.textContent = out;
      if (frame++ < total) setTimeout(tick, 40);
      else el.textContent = final;
    })();
  }

  /* ---------- Count-up numbers ---------- */
  function countUp(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var decimals = parseInt(el.getAttribute("data-decimals") || "0", 10);
    if (reduceMotion || isNaN(target)) { el.textContent = target.toFixed(decimals); return; }
    var start = performance.now();
    var dur = 1600;
    (function step(now) {
      var t = Math.min(1, (now - start) / dur);
      var eased = 1 - Math.pow(1 - t, 4);
      el.textContent = (target * eased).toFixed(decimals);
      if (t < 1) requestAnimationFrame(step);
    })(start);
  }

  /* ---------- Reveal on scroll (one observer for everything) ---------- */
  var revealTargets = $$(".reveal, .flow-diagram, .timeline-item, [data-decode], [data-count]");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.classList.add("is-visible");
        if (el.classList.contains("reveal")) {
          // once revealed, drop the class so hover transitions run without stagger delay
          var d = parseFloat(getComputedStyle(el).getPropertyValue("--d")) || 0;
          setTimeout(function () { el.classList.remove("reveal"); }, 1000 + d * 90);
        }
        if (el.hasAttribute("data-decode")) decode(el);
        if (el.hasAttribute("data-count")) countUp(el);
        io.unobserve(el);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
    revealTargets.forEach(function (el) {
      if (el.hasAttribute("data-count")) el.textContent = "0";
      io.observe(el);
    });
  } else {
    revealTargets.forEach(function (el) {
      el.classList.add("is-visible");
      if (el.hasAttribute("data-count")) countUp(el);
    });
  }

  /* ---------- Measure SVG paths for the line-drawing effect ---------- */
  $$(".flow-diagram .draw").forEach(function (path) {
    if (typeof path.getTotalLength === "function") {
      path.style.setProperty("--len", Math.ceil(path.getTotalLength()));
    }
  });

  /* ---------- Cursor-follow glow on cards ---------- */
  if (window.matchMedia("(hover: hover)").matches) {
    $$(".card--glow").forEach(function (card) {
      var glow = document.createElement("span");
      glow.className = "glow";
      glow.setAttribute("aria-hidden", "true");
      card.prepend(glow);
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", (e.clientX - r.left) + "px");
        card.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });
  }

  /* ---------- Live-looking HUD telemetry (hero) ---------- */
  var telemetry = $$("[data-telemetry]");
  if (telemetry.length) {
    var updateTelemetry = function () {
      telemetry.forEach(function (el) {
        var base = parseFloat(el.getAttribute("data-base"));
        var jitter = parseFloat(el.getAttribute("data-jitter") || "1");
        var dec = parseInt(el.getAttribute("data-decimals") || "1", 10);
        var unit = el.getAttribute("data-unit") || "";
        var v = base + (Math.random() * 2 - 1) * jitter;
        el.textContent = v.toFixed(dec) + unit;
        var bar = el.getAttribute("data-bar") && document.getElementById(el.getAttribute("data-bar"));
        if (bar) bar.style.setProperty("--v", Math.max(0, Math.min(100, v)) + "%");
      });
    };
    updateTelemetry();
    if (!reduceMotion) setInterval(function () { if (!document.hidden) updateTelemetry(); }, 1400);
  }

  /* Mission clock (sol counter style) */
  var clock = $("[data-clock]");
  if (clock) {
    var tickClock = function () {
      var d = new Date();
      var pad = function (n) { return String(n).padStart(2, "0"); };
      clock.textContent = pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes()) + ":" + pad(d.getUTCSeconds()) + " UTC";
    };
    tickClock();
    setInterval(tickClock, 1000);
  }

  /* ---------- Roadmap: timeline progress line ---------- */
  var timeline = $(".timeline");
  if (timeline) {
    var updateProgress = function () {
      var r = timeline.getBoundingClientRect();
      var vh = window.innerHeight;
      var p = (vh * 0.6 - r.top) / r.height;
      timeline.style.setProperty("--progress", (Math.max(0, Math.min(1, p)) * 100).toFixed(1) + "%");
    };
    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
  }

  /* ---------- Features page: highlight current section chip ---------- */
  var chips = $$(".feature-nav a");
  if (chips.length && "IntersectionObserver" in window) {
    var chipFor = {};
    chips.forEach(function (a) { chipFor[a.getAttribute("href").slice(1)] = a; });
    var secObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        chips.forEach(function (c) { c.classList.remove("is-active"); });
        var chip = chipFor[entry.target.id];
        if (chip) {
          chip.classList.add("is-active");
          // scroll only the chip row horizontally (scrollIntoView could also move the page)
          var row = chip.closest("ul");
          if (row && row.scrollWidth > row.clientWidth) {
            row.scrollTo({ left: chip.offsetLeft - row.clientWidth / 2 + chip.offsetWidth / 2, behavior: reduceMotion ? "auto" : "smooth" });
          }
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(chipFor).forEach(function (id) {
      var sec = document.getElementById(id);
      if (sec) secObserver.observe(sec);
    });
  }

  /* ---------- Gallery: filters ---------- */
  var filterBtns = $$(".filter-btn");
  if (filterBtns.length) {
    filterBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var f = btn.getAttribute("data-filter");
        filterBtns.forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
        $$(".gallery-item").forEach(function (item) {
          var show = f === "all" || item.getAttribute("data-cat") === f;
          item.classList.toggle("is-hidden", !show);
        });
      });
    });
  }

  /* ---------- Gallery: lightbox for real images ---------- */
  var lightboxLinks = $$("a[data-lightbox]");
  if (lightboxLinks.length) {
    var lb = document.createElement("div");
    lb.className = "lightbox";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.setAttribute("aria-label", "Image viewer");
    lb.innerHTML = '<button class="lightbox-close" aria-label="Close">&times;</button><figure style="margin:0"><img alt=""><figcaption class="lightbox-caption"></figcaption></figure>';
    document.body.appendChild(lb);
    var lbImg = $("img", lb);
    var lbCap = $(".lightbox-caption", lb);
    var lbClose = $(".lightbox-close", lb);
    var lastFocus = null;
    var closeLb = function () {
      lb.classList.remove("is-open");
      if (lastFocus) lastFocus.focus();
    };
    lightboxLinks.forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        lastFocus = a;
        var img = $("img", a);
        lbImg.src = a.getAttribute("href");
        lbImg.alt = img ? img.alt : "";
        lbCap.textContent = a.getAttribute("data-caption") || (img ? img.alt : "");
        lb.classList.add("is-open");
        lbClose.focus();
      });
    });
    lbClose.addEventListener("click", closeLb);
    lb.addEventListener("click", function (e) { if (e.target === lb) closeLb(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && lb.classList.contains("is-open")) closeLb();
    });
  }

  /* ---------- Page-leave progress bar (fallback feel for all browsers) ---------- */
  var bar = document.createElement("div");
  bar.className = "page-progress";
  bar.setAttribute("aria-hidden", "true");
  document.body.appendChild(bar);
  document.addEventListener("click", function (e) {
    var a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === "_blank") return;
    var href = a.getAttribute("href");
    if (!href || href.charAt(0) === "#" || /^(mailto:|tel:|https?:)/.test(href)) return;
    bar.classList.add("is-active");
  });
  window.addEventListener("pageshow", function () { bar.classList.remove("is-active"); });

  /* ---------- Footer year ---------- */
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
