/* =========================================================
   ARES — features page animations
   Six small looping visuals, one per subsystem. Each one only
   runs while it is on screen. These are illustrations of the
   concepts, not real rover data.
   ========================================================= */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var C = {
    rust: "#b4674d", rustLight: "#cf8a70", sand: "#c9b89a",
    teal: "#5f9ea0", tealLight: "#7fbcbd", text: "#e6e3dd",
    muted: "#8a8f98", dim: "#5d626b", line: "rgba(230,227,221,0.08)",
    lineStrong: "rgba(230,227,221,0.16)", warn: "#c9a25a", danger: "#b35a5a"
  };
  var MONO = '10px "JetBrains Mono", ui-monospace, monospace';

  function setText(id, v) {
    var el = document.getElementById(id);
    if (el) el.textContent = v;
  }

  /* Canvas that keeps itself sharp on HiDPI screens */
  function hiDPI(canvas) {
    var ctx = canvas.getContext("2d");
    var state = { ctx: ctx, w: 0, h: 0 };
    function fit() {
      var r = canvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      state.w = r.width; state.h = r.height;
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    fit();
    window.addEventListener("resize", fit);
    return state;
  }

  /* Run `step(dt, t)` with rAF only while `el` is visible */
  function loop(el, step) {
    var running = false, visible = false, last = 0, t = 0;
    function frame(now) {
      if (!running) return;
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
      last = now; t += dt;
      step(dt, t);
      requestAnimationFrame(frame);
    }
    function start() {
      if (running || !visible || document.hidden) return;
      running = true; last = 0;
      requestAnimationFrame(frame);
    }
    function stop() { running = false; }

    if (reduceMotion) {
      // settle the simulation, then draw one still frame
      for (var i = 0; i < 90; i++) { t += 0.05; step(0.05, t); }
      return;
    }
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) start(); else stop();
    }, { threshold: 0.1 }).observe(el);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop(); else start();
    });
  }

  /* -------------------------------------------------------
     1. MPPT — Perturb & Observe climbing the P-V curve
     ------------------------------------------------------- */
  (function () {
    var canvas = document.getElementById("viz-mppt");
    if (!canvas) return;
    var s = hiDPI(canvas);
    var G = 1, V = 6, dir = 1, lastP = 0, acc = 0;
    var trail = [];
    var VMAX = 23;

    function voc(g) { return 19.2 + 2.2 * g; }
    function current(v, g) {
      var i = 5 * g * (1 - Math.exp((v - voc(g)) / 1.25));
      return Math.max(0, i);
    }
    function power(v, g) { return v * current(v, g); }
    function pmax(g) {
      var best = 0, bv = 0;
      for (var v = 0; v <= VMAX; v += 0.05) {
        var p = power(v, g);
        if (p > best) { best = p; bv = v; }
      }
      return { p: best, v: bv };
    }

    loop(canvas, function (dt, t) {
      // irradiance drifts, with a periodic "dust gust" dip
      var gust = Math.max(0, Math.sin(t * 0.35 - 1.2)) ** 6;
      G = 0.72 + 0.22 * Math.sin(t * 0.21) - 0.38 * gust;

      // P&O step every 90 ms
      acc += dt;
      if (acc > 0.09) {
        acc = 0;
        var p = power(V, G);
        if (p < lastP) dir = -dir;
        lastP = p;
        V = Math.min(VMAX - 0.5, Math.max(1, V + dir * 0.35));
        trail.push({ v: V, p: p });
        if (trail.length > 14) trail.shift();
      }

      var ctx = s.ctx, w = s.w, h = s.h;
      var pad = { l: 40, r: 14, t: 16, b: 28 };
      var pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
      var PMAXAX = 95;
      var X = function (v) { return pad.l + (v / VMAX) * pw; };
      var Y = function (p) { return pad.t + ph - (p / PMAXAX) * ph; };

      ctx.clearRect(0, 0, w, h);

      // grid
      ctx.strokeStyle = C.line; ctx.lineWidth = 1;
      ctx.font = MONO; ctx.fillStyle = C.dim;
      for (var gv = 0; gv <= 20; gv += 5) {
        ctx.beginPath(); ctx.moveTo(X(gv), pad.t); ctx.lineTo(X(gv), pad.t + ph); ctx.stroke();
        ctx.fillText(gv + "V", X(gv) - 6, h - 10);
      }
      for (var gp = 0; gp <= 90; gp += 30) {
        ctx.beginPath(); ctx.moveTo(pad.l, Y(gp)); ctx.lineTo(pad.l + pw, Y(gp)); ctx.stroke();
        ctx.fillText(gp + "W", 4, Y(gp) + 3);
      }

      // I-V curve (secondary, teal dashed, scaled to axis)
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = "rgba(95,158,160,0.55)";
      ctx.beginPath();
      for (var v1 = 0; v1 <= VMAX; v1 += 0.2) {
        var yv = Y(current(v1, G) * 15);
        if (v1 === 0) ctx.moveTo(X(v1), yv); else ctx.lineTo(X(v1), yv);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // P-V curve with soft fill
      var grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + ph);
      grad.addColorStop(0, "rgba(180,103,77,0.28)");
      grad.addColorStop(1, "rgba(180,103,77,0)");
      ctx.beginPath();
      ctx.moveTo(X(0), Y(0));
      for (var v2 = 0; v2 <= VMAX; v2 += 0.1) ctx.lineTo(X(v2), Y(power(v2, G)));
      ctx.lineTo(X(VMAX), Y(0));
      ctx.closePath();
      ctx.fillStyle = grad; ctx.fill();

      ctx.beginPath();
      for (var v3 = 0; v3 <= VMAX; v3 += 0.1) {
        var yp = Y(power(v3, G));
        if (v3 === 0) ctx.moveTo(X(v3), yp); else ctx.lineTo(X(v3), yp);
      }
      ctx.strokeStyle = C.rustLight; ctx.lineWidth = 2; ctx.stroke();

      // true maximum power point marker
      var mpp = pmax(G);
      ctx.fillStyle = C.sand;
      ctx.beginPath();
      ctx.moveTo(X(mpp.v), Y(mpp.p) - 10);
      ctx.lineTo(X(mpp.v) - 4, Y(mpp.p) - 16);
      ctx.lineTo(X(mpp.v) + 4, Y(mpp.p) - 16);
      ctx.closePath(); ctx.fill();
      ctx.fillText("MPP", X(mpp.v) - 9, Y(mpp.p) - 20);

      // trail + operating point
      for (var k = 0; k < trail.length; k++) {
        ctx.globalAlpha = (k / trail.length) * 0.5;
        ctx.fillStyle = C.tealLight;
        ctx.beginPath(); ctx.arc(X(trail[k].v), Y(power(trail[k].v, G)), 2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      var P = power(V, G);
      ctx.strokeStyle = "rgba(127,188,189,0.35)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(X(V), Y(P)); ctx.lineTo(X(V), pad.t + ph); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pad.l, Y(P)); ctx.lineTo(X(V), Y(P)); ctx.stroke();
      ctx.shadowColor = C.tealLight; ctx.shadowBlur = 12;
      ctx.fillStyle = C.tealLight;
      ctx.beginPath(); ctx.arc(X(V), Y(P), 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

      setText("mppt-v", V.toFixed(1) + " V");
      setText("mppt-p", P.toFixed(1) + " W");
      setText("mppt-g", Math.round(G * 100) + "%");
      setText("mppt-eff", Math.min(100, (P / mpp.p) * 100).toFixed(1) + "%");
    });
  })();

  /* -------------------------------------------------------
     2. Dust mitigation — dust settles, piezo shakes it off
     ------------------------------------------------------- */
  (function () {
    var canvas = document.getElementById("viz-dust");
    if (!canvas) return;
    var s = hiDPI(canvas);
    var falling = [], settled = [], sliding = [];
    var shake = 0, spawn = 0;
    var MAX = 260;

    loop(canvas, function (dt, t) {
      var ctx = s.ctx, w = s.w, h = s.h;
      var panel = { x: w * 0.12, y: h * 0.42, w: w * 0.76, h: h * 0.34 };

      // spawn dust
      spawn += dt;
      if (shake <= 0 && spawn > 0.03) {
        spawn = 0;
        falling.push({ x: panel.x + Math.random() * panel.w, y: -4, vy: 30 + Math.random() * 40, vx: 8 + Math.random() * 10, r: 0.8 + Math.random() * 1.6 });
      }

      // trigger piezo when coverage is high
      var coverage = settled.length / MAX;
      if (shake <= 0 && coverage > 0.6) {
        shake = 1.6;
        settled.forEach(function (d) {
          sliding.push({ x: d.x, y: d.y, vx: (Math.random() - 0.5) * 60, vy: -20 - Math.random() * 40, r: d.r });
        });
        settled = [];
      }
      if (shake > 0) shake -= dt;

      ctx.clearRect(0, 0, w, h);

      var jx = shake > 0 ? Math.sin(t * 90) * 2.2 * Math.min(1, shake) : 0;
      var jy = shake > 0 ? Math.cos(t * 75) * 1.4 * Math.min(1, shake) : 0;

      // panel mount
      ctx.strokeStyle = C.lineStrong; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(w / 2, panel.y + panel.h); ctx.lineTo(w / 2, h - 6);
      ctx.moveTo(w / 2 - 40, h - 6); ctx.lineTo(w / 2 + 40, h - 6);
      ctx.stroke();

      // panel with cells
      ctx.save();
      ctx.translate(jx, jy);
      ctx.fillStyle = "#1a2328";
      ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
      var cols = 8, rows = 3, gap = 3;
      var cw = (panel.w - gap * (cols + 1)) / cols, ch = (panel.h - gap * (rows + 1)) / rows;
      for (var c = 0; c < cols; c++) {
        for (var r = 0; r < rows; r++) {
          var cg = ctx.createLinearGradient(0, panel.y, 0, panel.y + panel.h);
          cg.addColorStop(0, "rgba(95,158,160,0.38)");
          cg.addColorStop(1, "rgba(95,158,160,0.14)");
          ctx.fillStyle = cg;
          ctx.fillRect(panel.x + gap + c * (cw + gap), panel.y + gap + r * (ch + gap), cw, ch);
        }
      }
      ctx.strokeStyle = C.lineStrong; ctx.lineWidth = 1;
      ctx.strokeRect(panel.x, panel.y, panel.w, panel.h);

      // settled dust
      for (var i = 0; i < settled.length; i++) {
        var d = settled[i];
        ctx.fillStyle = i % 3 ? "rgba(201,184,154,0.85)" : "rgba(180,103,77,0.85)";
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();

      // piezo vibration waves
      if (shake > 0) {
        ctx.strokeStyle = "rgba(127,188,189," + (0.5 * Math.min(1, shake)) + ")";
        ctx.lineWidth = 1;
        for (var wv = 0; wv < 3; wv++) {
          var rr = ((t * 60 + wv * 20) % 60) + 10;
          ctx.beginPath();
          ctx.arc(w / 2, panel.y + panel.h + 8, rr, Math.PI * 1.1, Math.PI * 1.9);
          ctx.stroke();
        }
      }

      // falling dust
      for (var f = falling.length - 1; f >= 0; f--) {
        var p = falling[f];
        p.y += p.vy * dt; p.x += p.vx * dt;
        if (p.y >= panel.y + 2 && p.x > panel.x && p.x < panel.x + panel.w) {
          settled.push({ x: p.x, y: panel.y + 2 + Math.random() * (panel.h - 4), r: p.r });
          if (settled.length > MAX) settled.shift();
          falling.splice(f, 1);
          continue;
        }
        if (p.y > h) { falling.splice(f, 1); continue; }
        ctx.fillStyle = "rgba(201,184,154,0.55)";
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }

      // dust being shaken off
      for (var q = sliding.length - 1; q >= 0; q--) {
        var sd = sliding[q];
        sd.vy += 220 * dt; sd.x += sd.vx * dt; sd.y += sd.vy * dt;
        if (sd.y > h + 10) { sliding.splice(q, 1); continue; }
        ctx.fillStyle = "rgba(201,184,154,0.7)";
        ctx.beginPath(); ctx.arc(sd.x, sd.y, sd.r, 0, Math.PI * 2); ctx.fill();
      }

      ctx.font = MONO; ctx.fillStyle = shake > 0 ? C.tealLight : C.dim;
      ctx.fillText(shake > 0 ? "PIEZO ▸ VIBRATING" : "PIEZO ▸ STANDBY", panel.x, panel.y - 12);

      var cov = Math.min(100, (settled.length / MAX) * 100);
      setText("dust-cov", cov.toFixed(0) + "%");
      setText("dust-out", (100 - cov * 0.45).toFixed(0) + "%");
      var st = document.getElementById("dust-state");
      if (st) st.textContent = shake > 0 ? "CLEARING" : "MONITORING";
    });
  })();

  /* -------------------------------------------------------
     3. Tiered survival mode — battery drains in a dust storm
     ------------------------------------------------------- */
  (function () {
    var host = document.getElementById("viz-survival");
    if (!host) return;
    var tiers = Array.prototype.slice.call(host.querySelectorAll(".tier"));
    var bar = host.querySelector(".battery-bar span");
    var LOADS = [62, 38, 17, 4]; // illustrative watts per tier
    var soc = 100, phase = "storm";

    function tierFor(v) {
      if (v > 60) return 0;
      if (v > 35) return 1;
      if (v > 15) return 2;
      return 3;
    }

    loop(host, function (dt) {
      if (phase === "storm") {
        soc -= dt * (4 + (3 - tierFor(soc)) * 2.2); // lower tiers drain slower
        if (soc <= 6) phase = "recover";
      } else {
        soc += dt * 16;
        if (soc >= 100) { soc = 100; phase = "storm"; }
      }
      var ti = tierFor(soc);
      tiers.forEach(function (el, i) { el.classList.toggle("is-active", i === ti); });
      if (bar) {
        bar.style.setProperty("--v", soc.toFixed(1) + "%");
        bar.className = soc < 15 ? "crit" : soc < 35 ? "low" : "";
      }
      setText("surv-soc", soc.toFixed(0) + "%");
      setText("surv-load", LOADS[ti] + " W");
      setText("surv-sun", phase === "storm" ? "DUST STORM" : "SUN RETURNING");
    });
  })();

  /* -------------------------------------------------------
     4. Dynamic load prioritization — power goes to P1 first
     ------------------------------------------------------- */
  (function () {
    var host = document.getElementById("viz-loads");
    if (!host) return;
    var rows = Array.prototype.slice.call(host.querySelectorAll(".load")).map(function (el) {
      return {
        el: el,
        need: parseFloat(el.getAttribute("data-need")),
        pri: parseInt(el.getAttribute("data-priority"), 10),
        got: el.querySelector(".got"),
        val: el.querySelector(".load-val")
      };
    });
    var SCALE = Math.max.apply(null, rows.map(function (r) { return r.need; }));
    rows.forEach(function (r) {
      var need = r.el.querySelector(".need");
      if (need) need.style.setProperty("--need", (r.need / SCALE) * 100 + "%");
    });
    var sorted = rows.slice().sort(function (a, b) { return a.pri - b.pri; });
    var acc = 0;

    function allocate(avail) {
      var left = avail, shed = 0, demand = 0;
      sorted.forEach(function (r) {
        demand += r.need;
        var g = Math.max(0, Math.min(r.need, left));
        left -= g;
        r.got.style.setProperty("--got", (g / SCALE) * 100 + "%");
        r.got.className = "got" + (g <= 0.01 ? " off" : g < r.need - 0.01 ? " short" : "");
        r.val.textContent = g.toFixed(0) + "W";
        if (g < r.need - 0.01) shed++;
      });
      setText("load-avail", avail.toFixed(0) + " W");
      setText("load-demand", demand.toFixed(0) + " W");
      setText("load-shed", String(shed));
    }

    loop(host, function (dt, t) {
      acc += dt;
      if (acc < 0.9) return;
      acc = 0;
      var avail = 62 + 36 * Math.sin(t * 0.4) + (Math.random() - 0.5) * 8;
      allocate(Math.max(10, avail));
    });
    allocate(60);
  })();

  /* -------------------------------------------------------
     5. Tilt assist — panel tracks the sun on uneven ground
     ------------------------------------------------------- */
  (function () {
    var svg = document.getElementById("viz-tilt");
    if (!svg) return;
    var sun = svg.querySelector("#tilt-sun");
    var ray = svg.querySelector("#tilt-ray");
    var panel = svg.querySelector("#tilt-panel");
    var BODY = -7;                 // rover sits on a 7° slope (svg degrees)
    var PIVOT = { x: 194, y: 140 }; // panel pivot (top of mast) in svg coords
    var current = 0;

    loop(svg, function (dt, t) {
      // sun sweeps across the sky and back (one Martian "day" ≈ 16 s here)
      var u = (Math.sin(t * 0.39 - Math.PI / 2) + 1) / 2;
      var th = (165 - u * 150) * Math.PI / 180;
      var sx = 200 + 175 * Math.cos(th), sy = 222 - 175 * Math.sin(th);
      sun.setAttribute("transform", "translate(" + sx.toFixed(1) + "," + sy.toFixed(1) + ")");

      var phi = Math.atan2(-(sy - PIVOT.y), sx - PIVOT.x) * 180 / Math.PI; // math angle to sun
      var target = Math.max(-50, Math.min(50, 90 - phi));                   // svg rotation for panel (mechanical limit ±50°)
      current += (target - current) * Math.min(1, dt * 2.5);
      panel.setAttribute("transform", "rotate(" + current.toFixed(2) + " " + PIVOT.x + " " + PIVOT.y + ")");
      ray.setAttribute("x1", sx.toFixed(1)); ray.setAttribute("y1", sy.toFixed(1));

      var trackNormal = 90 - current;
      var fixedNormal = 90 - BODY;
      var track = Math.max(0, Math.cos((phi - trackNormal) * Math.PI / 180));
      var fixed = Math.max(0, Math.cos((phi - fixedNormal) * Math.PI / 180));
      var thDeg = th * 180 / Math.PI;
      setText("tilt-elev", Math.min(thDeg, 180 - thDeg).toFixed(0) + "°");
      setText("tilt-angle", (-current).toFixed(1) + "°");
      setText("tilt-gain", fixed > 0.05 ? "+" + Math.max(0, (track / fixed - 1) * 100).toFixed(0) + "%" : "—");
    });
  })();

  /* -------------------------------------------------------
     6. Telemetry dashboard — scrolling power trace + rails
     ------------------------------------------------------- */
  (function () {
    var canvas = document.getElementById("viz-telemetry");
    if (!canvas) return;
    var s = hiDPI(canvas);
    var host = canvas.closest(".panel") || canvas;
    var rails = Array.prototype.slice.call(document.querySelectorAll("#telemetry-rails span"));
    var data = [], ideal = [];
    var dust = 0, acc = 0, slow = 0;
    var N = 160;

    loop(host, function (dt, t) {
      acc += dt; slow += dt;
      // ~60 samples per second, matching the planned dashboard refresh rate
      while (acc > 1 / 60) {
        acc -= 1 / 60;
        dust = (dust + 0.0009) % 0.32;                  // dust builds up, then is cleared
        var light = 0.8 + 0.15 * Math.sin(t * 0.5) - 0.25 * Math.max(0, Math.sin(t * 0.23)) ** 8;
        var id = 85 * light;
        var p = id * (1 - dust) + (Math.random() - 0.5) * 2.4;
        data.push(p); ideal.push(85);
        if (data.length > N) { data.shift(); ideal.shift(); }
      }

      var ctx = s.ctx, w = s.w, h = s.h;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = C.line; ctx.lineWidth = 1;
      for (var gy = 0; gy <= 4; gy++) {
        ctx.beginPath(); ctx.moveTo(0, (h / 4) * gy); ctx.lineTo(w, (h / 4) * gy); ctx.stroke();
      }
      var Y = function (v) { return h - (v / 100) * h; };
      var X = function (i) { return (i / (N - 1)) * w; };

      ctx.setLineDash([2, 4]);
      ctx.strokeStyle = "rgba(201,184,154,0.35)";
      ctx.beginPath(); ctx.moveTo(0, Y(85)); ctx.lineTo(w, Y(85)); ctx.stroke();
      ctx.setLineDash([]);

      var g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "rgba(95,158,160,0.3)"); g.addColorStop(1, "rgba(95,158,160,0)");
      ctx.beginPath();
      ctx.moveTo(X(0), h);
      for (var i = 0; i < data.length; i++) ctx.lineTo(X(i + N - data.length), Y(data[i]));
      ctx.lineTo(X(N - 1), h); ctx.closePath();
      ctx.fillStyle = g; ctx.fill();
      ctx.beginPath();
      for (var j = 0; j < data.length; j++) {
        var x = X(j + N - data.length), y = Y(data[j]);
        if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = C.tealLight; ctx.lineWidth = 1.5; ctx.stroke();

      if (slow > 0.25 && data.length) {
        slow = 0;
        var cur = data[data.length - 1];
        var eff = Math.max(0, Math.min(100, (cur / 85) * 100));
        setText("tel-power", cur.toFixed(1) + " W");
        setText("tel-eff", eff.toFixed(1) + "%");
        setText("tel-deg", (100 - eff).toFixed(1) + "%");
        setText("tel-soc", (72 + 6 * Math.sin(t * 0.1)).toFixed(1) + "%");
        rails.forEach(function (r, k) {
          r.classList.toggle("on", k < 3 || eff > 55 + k * 6);
        });
      }
    });
  })();
})();
