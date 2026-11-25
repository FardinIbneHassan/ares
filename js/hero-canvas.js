/* =========================================================
   ARES — home hero animation
   Starfield (parallax) + slowly rotating Mars + orbiter + dust.
   Pauses when off-screen or when the tab is hidden.
   Draws a single still frame for prefers-reduced-motion.
   ========================================================= */
(function () {
  "use strict";

  var canvas = document.querySelector(".hero-canvas");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var W = 0, H = 0, DPR = 1;
  var stars = [], dust = [], features = [];
  var planet = { x: 0, y: 0, r: 0 };
  var pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  var rot = 0;
  var running = false;
  var visible = true;
  var last = 0;

  // Deterministic pseudo-random so the planet surface looks the same every load
  var seed = 7;
  function rand() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  function buildSurface() {
    seed = 7;
    features = [];
    for (var i = 0; i < 38; i++) {
      features.push({
        lon: rand() * Math.PI * 2,
        lat: (rand() * 2 - 1) * 1.2,
        size: 0.05 + rand() * 0.22,
        dark: rand() < 0.62,
        alpha: 0.08 + rand() * 0.16
      });
    }
    // a few craters
    for (var j = 0; j < 14; j++) {
      features.push({
        lon: rand() * Math.PI * 2,
        lat: (rand() * 2 - 1) * 1.1,
        size: 0.015 + rand() * 0.035,
        crater: true,
        alpha: 0.25
      });
    }
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width;
    H = rect.height;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    var mobile = W < 760;
    planet.r = mobile ? W * 0.85 : Math.min(W, H) * 0.62;
    planet.x = mobile ? W * 0.62 : W * 0.8;
    planet.y = mobile ? H + planet.r * 0.38 : H * 0.98 + planet.r * 0.12;

    var count = Math.round((W * H) / (mobile ? 5200 : 3800));
    stars = [];
    for (var i = 0; i < count; i++) {
      var depth = Math.random();
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.3 + depth * 1.1,
        depth: depth,
        tw: Math.random() * Math.PI * 2,
        tws: 0.5 + Math.random() * 1.5,
        warm: Math.random() < 0.12
      });
    }

    var dCount = mobile ? 40 : 80;
    dust = [];
    for (var k = 0; k < dCount; k++) dust.push(makeDust(true));
  }

  function makeDust(anywhere) {
    return {
      x: anywhere ? Math.random() * W : -20,
      y: Math.random() * H,
      r: 0.6 + Math.random() * 1.8,
      vx: 6 + Math.random() * 18,
      vy: -2 + Math.random() * 6,
      a: 0.08 + Math.random() * 0.25,
      sand: Math.random() < 0.5
    };
  }

  function drawStars(t) {
    var px = pointer.x, py = pointer.y;
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var tw = 0.55 + 0.45 * Math.sin(s.tw + t * s.tws);
      var x = s.x + px * s.depth * 18;
      var y = s.y + py * s.depth * 12;
      ctx.globalAlpha = (0.25 + s.depth * 0.6) * tw;
      ctx.fillStyle = s.warm ? "#e0b49a" : "#e6e3dd";
      ctx.beginPath();
      ctx.arc(x, y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawPlanet() {
    var cx = planet.x + pointer.x * -10;
    var cy = planet.y + pointer.y * -6;
    var r = planet.r;

    // outer atmosphere glow
    var glow = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 1.35);
    glow.addColorStop(0, "rgba(180,103,77,0.28)");
    glow.addColorStop(0.4, "rgba(180,103,77,0.08)");
    glow.addColorStop(1, "rgba(180,103,77,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    // base sphere shading (lit from upper-left)
    var body = ctx.createRadialGradient(cx - r * 0.45, cy - r * 0.55, r * 0.05, cx, cy, r * 1.05);
    body.addColorStop(0, "#c98466");
    body.addColorStop(0.35, "#9c5540");
    body.addColorStop(0.75, "#4a271d");
    body.addColorStop(1, "#1d110d");
    ctx.fillStyle = body;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    // rotating surface features (orthographic projection)
    for (var i = 0; i < features.length; i++) {
      var f = features[i];
      var lon = f.lon + rot;
      var cosLon = Math.cos(lon);
      if (cosLon <= 0.02) continue; // far side
      var cosLat = Math.cos(f.lat);
      var x = cx + r * Math.sin(lon) * cosLat;
      var y = cy - r * Math.sin(f.lat) * 0.92;
      var sx = f.size * r * cosLon;   // foreshortened width
      var sy = f.size * r * 0.55 * cosLat;
      if (sx < 0.5 || sy < 0.5) continue;
      ctx.globalAlpha = f.alpha * Math.min(1, cosLon * 1.6);
      if (f.crater) {
        ctx.strokeStyle = "#2a1610";
        ctx.lineWidth = Math.max(0.6, sx * 0.18);
        ctx.beginPath();
        ctx.ellipse(x, y, sx, sy * 1.6, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = f.dark ? "#2b1610" : "#d9a585";
        ctx.beginPath();
        ctx.ellipse(x, y, sx, sy, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // terminator shadow (night side)
    var shade = ctx.createLinearGradient(cx - r * 0.2, cy - r * 0.6, cx + r, cy + r * 0.4);
    shade.addColorStop(0, "rgba(13,14,16,0)");
    shade.addColorStop(0.55, "rgba(13,14,16,0.55)");
    shade.addColorStop(1, "rgba(13,14,16,0.95)");
    ctx.fillStyle = shade;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    // thin lit rim
    ctx.restore();
    ctx.strokeStyle = "rgba(207,138,112,0.45)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI * 1.05, Math.PI * 1.6);
    ctx.stroke();

    return { cx: cx, cy: cy, r: r };
  }

  function drawOrbit(p, t) {
    var rx = p.r * 1.22, ry = p.r * 0.32, tilt = -0.32;
    ctx.save();
    ctx.translate(p.cx, p.cy);
    ctx.rotate(tilt);
    ctx.strokeStyle = "rgba(201,184,154,0.16)";
    ctx.setLineDash([3, 6]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    var a = t * 0.18;
    var ox = Math.cos(a) * rx, oy = Math.sin(a) * ry;
    var behind = Math.sin(a) < 0 && Math.abs(ox) < p.r * 0.98;
    if (!behind) {
      ctx.fillStyle = "#7fbcbd";
      ctx.shadowColor = "rgba(127,188,189,0.9)";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(ox, oy, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  function drawDust(dt) {
    for (var i = 0; i < dust.length; i++) {
      var d = dust[i];
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      if (d.x > W + 20 || d.y > H + 20 || d.y < -20) dust[i] = makeDust(false);
      ctx.globalAlpha = d.a;
      ctx.fillStyle = d.sand ? "#c9b89a" : "#b4674d";
      ctx.beginPath();
      ctx.arc(d.x + pointer.x * 24, d.y + pointer.y * 14, d.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    if (!running) return;
    var t = now / 1000;
    var dt = last ? Math.min(0.05, t - last) : 0.016;
    last = t;

    pointer.x += (pointer.tx - pointer.x) * 0.04;
    pointer.y += (pointer.ty - pointer.y) * 0.04;
    rot += dt * 0.035;

    ctx.clearRect(0, 0, W, H);
    drawStars(t);
    var p = drawPlanet();
    drawOrbit(p, t);
    drawDust(dt);

    requestAnimationFrame(frame);
  }

  function start() {
    if (running || reduceMotion || !visible || document.hidden) return;
    running = true;
    last = 0;
    requestAnimationFrame(frame);
  }
  function stop() { running = false; }

  function drawStill() {
    ctx.clearRect(0, 0, W, H);
    drawStars(0);
    var p = drawPlanet();
    drawOrbit(p, 2);
  }

  buildSurface();
  resize();
  if (reduceMotion) drawStill(); else start();

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      resize();
      if (reduceMotion) drawStill();
    }, 150);
  });

  if (window.matchMedia("(hover: hover)").matches) {
    window.addEventListener("pointermove", function (e) {
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) start(); else stop();
    }).observe(canvas);
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop(); else start();
  });
})();
