"use strict";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Hero reel: never autoplays for reduced motion or data saver. */
(function hero() {
  const v = $(".hero video"), b = $(".motion");
  if (!v) return;
  const save = navigator.connection && navigator.connection.saveData;
  const set = (on) => {
    if (on) v.play().catch(() => {}); else v.pause();
    b.textContent = on ? "Pause video" : "Play video";
    b.setAttribute("aria-pressed", on ? "false" : "true");
  };
  if (calm || save) set(false); else set(true);
  b.addEventListener("click", () => set(v.paused));
})();

/* The two-player clip plays once in view, unless motion or data is being saved. */
(function coopClip() {
  const v = $(".coop-clip");
  if (!v || matchMedia("(prefers-reduced-motion: reduce)").matches || (navigator.connection && navigator.connection.saveData)) return;
  new IntersectionObserver((en) => { if (en[0].isIntersecting) v.play().catch(() => {}); else v.pause(); }, { threshold: .4 }).observe(v);
})();

/* Reel chapters: jump to a part of the video; the current one lights up with a line on what is showing. */
(function chapters() {
  const v = $(".hero video"), box = $(".chapters"), src = $("#reel-data");
  if (!v || !box || !src) return;
  const shots = JSON.parse(src.textContent).shots, now = $("#reel-now"), chips = $$("[data-chapter]", box);
  function show() {
    let cur = shots[0];
    for (const s of shots) { if (s.t <= v.currentTime + 0.05) cur = s; else break; }
    now.textContent = cur.caption;
    for (const c of chips) c.setAttribute("aria-pressed", String(c.dataset.chapter === cur.chapter));
  }
  v.addEventListener("timeupdate", show);
  v.addEventListener("seeked", show);
  for (const c of chips) c.addEventListener("click", () => {
    v.currentTime = shots.find((s) => s.chapter === c.dataset.chapter).t;
    if (v.paused) { const b = $(".motion"); if (b) b.click(); else v.play().catch(() => {}); }
    show();
  });
  show();
})();

/* Boss gallery and dialog. */
(function gallery() {
  const dlg = $("#boss-dialog");
  if (!dlg) return;
  const data = JSON.parse($("#boss-data").textContent);
  const root = dlg.dataset.root;
  let filter = "all", spoil = false, cur = null;
  const cards = $$(".boss");
  const visible = () => cards.filter((c) => !c.hidden);
  function apply() {
    for (const c of cards) {
      const d = data[c.dataset.id];
      const secret = d.kind === "hidden" || d.kind === "final";
      let on = !secret || spoil;
      if (filter === "free") on = on && d.sector <= 3;
      else if (filter !== "all") on = on && String(d.sector) === filter;
      c.hidden = !on;
    }
    const n = visible().length, out = $("#boss-count");
    if (out) out.textContent = n + (n === 1 ? " boss shown" : " bosses shown");
  }
  function open(id, focus) {
    const d = data[id];
    cur = id;
    $("#dlg-name").textContent = d.name;
    $("#dlg-sub").textContent = d.sub;
    $("#dlg-atk").innerHTML = d.attacks.map((a) => "<li><b>" + a[0] + "</b>" + a[1] + "</li>").join("");
    $("#dlg-link").href = root + "wiki/bosses/#" + id;
    const v = $("#dlg-video");
    v.poster = root + "assets/clips/" + id + ".webp";
    v.src = root + "assets/clips/" + id + ".mp4";
    if (calm) { v.controls = true; } else { v.controls = false; v.play().catch(() => {}); }
    if (!dlg.open) dlg.showModal();
    if (focus) $("#dlg-close").focus();
    history.replaceState(null, "", "#boss/" + id);
  }
  function step(n) {
    const list = visible().map((c) => c.dataset.id);
    const i = list.indexOf(cur);
    open(list[(i + n + list.length) % list.length]);
  }
  cards.forEach((c) => c.addEventListener("click", () => open(c.dataset.id, true)));
  $("#dlg-close").addEventListener("click", () => dlg.close());
  $("#dlg-prev").addEventListener("click", () => step(-1));
  $("#dlg-next").addEventListener("click", () => step(1));
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
  });
  dlg.addEventListener("close", () => {
    const v = $("#dlg-video"); v.pause(); v.removeAttribute("src"); v.load();
    history.replaceState(null, "", location.pathname + location.search);
    const c = cards.find((x) => x.dataset.id === cur); if (c) c.focus();
  });
  $$("[data-filter]").forEach((b) => b.addEventListener("click", () => {
    filter = b.dataset.filter;
    $$("[data-filter]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    apply();
  }));
  const sb = $("#spoil");
  if (sb) sb.addEventListener("click", () => {
    spoil = !spoil;
    sb.setAttribute("aria-pressed", String(spoil));
    sb.textContent = spoil ? "Hide the hidden bosses" : "Show the hidden bosses (spoilers)";
    apply();
  });
  apply();
  const m = location.hash.match(/^#boss\/([a-z_]+)$/);
  if (m && data[m[1]]) { if (data[m[1]].kind === "hidden" || data[m[1]].kind === "final") sb.click(); open(m[1]); }
})();

/* Gun explorer. */
(function guns() {
  const list = $(".gun-list");
  if (!list) return;
  const data = JSON.parse($("#gun-data").textContent);
  const panel = $(".gun-panel");
  const top = Math.max(...data.map((g) => g.dps));
  function show(i, focus) {
    const g = data[i];
    $$("button", list).forEach((b, k) => { b.setAttribute("aria-selected", String(k === i)); b.tabIndex = k === i ? 0 : -1; if (k === i && focus) b.focus(); });
    panel.innerHTML = "<h3>" + g.name + "</h3><p>" + g.text + "</p>" +
      '<div class="meter"><label>Top damage a second, every shot landing <span>' + g.dps_label + '</span></label><i style="--v:' + Math.round(g.dps / top * 100) + '%"></i></div>' +
      '<p class="note"><b>How you get it:</b> ' + g.how + "</p>";
  }
  $$("button", list).forEach((b, i) => {
    b.addEventListener("click", () => show(i));
    b.addEventListener("keydown", (e) => {
      const n = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (n) { e.preventDefault(); show((i + n + data.length) % data.length, true); }
    });
  });
  show(0);
})();

/* Wiki: sidebar on phones, search over the page index. */
(function wiki() {
  const t = $(".toggle-side");
  if (t) t.addEventListener("click", () => { const s = $(".side"); s.classList.toggle("open"); t.setAttribute("aria-expanded", s.classList.contains("open")); });
  const q = $("#wiki-search"), res = $("#wiki-results");
  if (!q) return;
  const root = q.dataset.root;
  let index = null;
  const load = () => index ? Promise.resolve(index) : fetch(root + "wiki/search.json").then((r) => r.json()).then((j) => index = j);
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  q.addEventListener("input", () => {
    const words = q.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (!words.length) { res.classList.remove("open"); return; }
    load().then((all) => {
      const hits = [];
      for (const e of all) {
        const hay = e.text.toLowerCase(), head = e.title.toLowerCase();
        if (!words.every((w) => hay.includes(w) || head.includes(w))) continue;
        hits.push([words.reduce((s, w) => s + (head.includes(w) ? 10 : 0), 0), e]);
      }
      hits.sort((a, b) => b[0] - a[0]);
      res.innerHTML = hits.slice(0, 12).map(([, e]) => {
        const at = e.text.toLowerCase().indexOf(words[0]);
        const snip = at < 0 ? e.text.slice(0, 90) : e.text.slice(Math.max(0, at - 30), at + 70);
        return '<a href="' + root + e.url + '">' + esc(e.title) + "<small>" + esc(e.page) + " · …" + esc(snip) + "…</small></a>";
      }).join("") || "<p>Nothing found.</p>";
      res.classList.add("open");
    });
  });
  document.addEventListener("click", (e) => { if (!e.target.closest(".search")) res.classList.remove("open"); });
  q.addEventListener("keydown", (e) => { if (e.key === "Escape") { q.value = ""; res.classList.remove("open"); } });
})();

/* BitCoffee: copy the address, or select it where the clipboard is refused. */
(function bitcoffee() {
  const b = $("#btc-copy");
  if (!b) return;
  const code = $("#btc-address"), out = $("#btc-status");
  const selectIt = () => {
    const r = document.createRange(); r.selectNodeContents(code);
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
    out.textContent = "Selected: copy it from here.";
  };
  b.addEventListener("click", () => {
    if (!navigator.clipboard) { selectIt(); return; }
    navigator.clipboard.writeText(code.textContent).then(() => { out.textContent = "Address copied."; }, selectIt);
  });
})();

/* Achievements: filter by status, reach or words; hidden ones only on request. */
(function ach() {
  const rows = $$("tr.ach");
  if (!rows.length) return;
  const find = $("#ach-find"), count = $("#ach-count"), sb = $("#ach-spoil");
  let mode = "all", spoil = false;
  function apply() {
    const words = find.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    let n = 0;
    for (const r of rows) {
      let on = spoil || !("secret" in r.dataset);
      if (mode === "now") on = on && r.dataset.now === "1";
      if (mode === "soon") on = on && r.dataset.now === "0";
      if (mode === "free") on = on && r.dataset.free === "1";
      const hay = r.textContent.toLowerCase();
      on = on && words.every((w) => hay.includes(w));
      r.hidden = !on;
      if (on) n++;
    }
    for (const g of $$(".ach-group")) g.hidden = !$$("tr.ach", g).some((r) => !r.hidden);
    count.textContent = n + " shown";
  }
  $$("[data-ach]").forEach((b) => b.addEventListener("click", () => {
    mode = b.dataset.ach;
    $$("[data-ach]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    apply();
  }));
  find.addEventListener("input", apply);
  const label = sb.textContent;
  sb.addEventListener("click", () => {
    spoil = !spoil;
    sb.setAttribute("aria-pressed", String(spoil));
    sb.textContent = spoil ? "Hide the hidden ones" : label;
    apply();
  });
  apply();
})();

/* Try the controls: a small sketch of how the Vanguard handles, in the game's own world size. */
(function demo() {
  const host = $(".demo");
  if (!host) return;
  const cv = $("canvas", host), g = cv.getContext("2d"), W = 512, H = 224;
  cv.width = W; cv.height = H;
  const startBox = $(".demo-start", host), msg = $("#demo-msg"), go = $("#demo-go");
  const hero = new Image(); hero.src = host.dataset.hero;
  const steps = $$("#demo-steps li");
  let s = null, running = false, seen = false, raf = 0;
  const stepDone = [false, false, false, false];
  function mark(i) {
    if (stepDone[i]) return;
    stepDone[i] = true;
    steps[i].classList.add("done");
    const n = stepDone.indexOf(false);
    steps.forEach((l, k) => l.classList.toggle("now", k === n));
  }
  function fresh() {
    s = {
      x: 256, y: 176, hx: 0, hy: -1, hull: 6, inv: 0, dash: 0, dashCd: 0, parry: 0, parryCd: 0, strike: 0, strikeCd: 0,
      sx: 0, sy: 0, bossX: 256, bossY: 52, bossHp: 260, t: 0, next: 90, shots: [], bolts: [], marks: [], fx: [], fire: 0, kind: 0, drift: 1,
    };
  }
  const tell = (t) => { msg.textContent = t; };
  function end(text) {
    running = false; host.classList.remove("live");
    startBox.hidden = false; tell(text); go.textContent = "Try again"; go.focus({ preventScroll: true });
  }
  function fan() {
    const a = Math.atan2(s.y - s.bossY, s.x - s.bossX);
    for (let i = -3; i <= 3; i++) s.shots.push({ x: s.bossX, y: s.bossY + 12, vx: Math.cos(a + i * .24) * 1.25, vy: Math.sin(a + i * .24) * 1.25, r: 3 });
  }
  function ring() {
    const gap = Math.atan2(s.y - s.bossY, s.x - s.bossX);
    for (let i = 0; i < 26; i++) {
      const a = i / 26 * Math.PI * 2;
      const d = Math.abs(Math.atan2(Math.sin(a - gap), Math.cos(a - gap)));
      if (d < .42) continue;
      s.shots.push({ x: s.bossX, y: s.bossY, vx: Math.cos(a) * 1, vy: Math.sin(a) * 1, r: 3 });
    }
  }
  function marks() { for (let i = 0; i < 3; i++) s.marks.push({ x: s.x + (i - 1) * 34, y: Math.max(40, s.y - (i === 1 ? 0 : 18)), t: 0, r: 22 }); }
  function tick() {
    s.t++;
    /* the boss drifts and speaks in turn: a fan with gaps, a ring with an opening, floor marks */
    s.bossX += s.drift * .45;
    if (s.bossX < 90 || s.bossX > 422) s.drift = -s.drift;
    if (--s.next <= 0) { [fan, ring, marks][s.kind++ % 3](); s.next = 150; }
    if (s.inv > 0) s.inv--; if (s.dash > 0) s.dash--; if (s.dashCd > 0) s.dashCd--;
    if (s.parry > 0) s.parry--; if (s.parryCd > 0) s.parryCd--; if (s.strikeCd > 0) s.strikeCd--;
    /* keyboard flight */
    let kx = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0);
    let ky = (keys.ArrowDown || keys.s ? 1 : 0) - (keys.ArrowUp || keys.w ? 1 : 0);
    if (kx || ky) { const l = Math.hypot(kx, ky); fly(kx / l * 3, ky / l * 3); }
    if (s.dash > 0) fly(s.hx * 6, s.hy * 6, true);
    if (s.strike > 0) {
      s.strike--;
      const p = s.strike > 8 ? .34 : 0;
      s.x += (s.sx - s.x) * p; s.y += (s.sy - s.y) * p;
    }
    /* auto-fire along the heading, with the same small bend the game gives a near miss */
    if (++s.fire >= 6) {
      s.fire = 0;
      let a = Math.atan2(s.hy, s.hx);
      const to = Math.atan2(s.bossY - s.y, s.bossX - s.x);
      const d = Math.atan2(Math.sin(to - a), Math.cos(to - a));
      if (Math.abs(d) < 8.4 * Math.PI / 180) a = to;
      s.bolts.push({ x: s.x, y: s.y, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3 });
    }
    for (const b of s.bolts) {
      b.x += b.vx; b.y += b.vy;
      if (Math.hypot(b.x - s.bossX, b.y - s.bossY) < 18) { b.dead = true; s.bossHp -= 1; }
      if (b.x < 0 || b.x > W || b.y < 0 || b.y > H) b.dead = true;
    }
    s.bolts = s.bolts.filter((b) => !b.dead);
    const hurt = () => {
      if (s.inv > 0 || s.dash > 0 || s.strike > 0) return;
      s.hull--; s.inv = 60; s.fx.push({ x: s.x, y: s.y, t: 0, r: 14 });
      if (s.hull <= 0) end("Vanguard down. In the game you wake at your last Lantern Dock.");
    };
    for (const b of s.shots) {
      b.x += b.vx; b.y += b.vy;
      if (b.x < -8 || b.x > W + 8 || b.y < -8 || b.y > H + 8) b.dead = true;
      if (s.parry > 0 && Math.hypot(b.x - s.x, b.y - s.y) < 34) { b.dead = true; s.bossHp -= .3; continue; }
      if (Math.hypot(b.x - s.x, b.y - s.y) < 6) {
        const near = s.dash > 0 || s.strike > 0 || s.inv > 0;
        if (!near) { b.dead = true; hurt(); }
      }
    }
    s.shots = s.shots.filter((b) => !b.dead);
    for (const m of s.marks) {
      m.t++;
      if (m.t === 70) { s.fx.push({ x: m.x, y: m.y, t: 0, r: m.r }); if (Math.hypot(m.x - s.x, m.y - s.y) < m.r) hurt(); }
    }
    s.marks = s.marks.filter((m) => m.t < 70);
    for (const f of s.fx) f.t++;
    s.fx = s.fx.filter((f) => f.t < 14);
    if (Math.hypot(s.x - s.bossX, s.y - s.bossY) < 18) hurt();
    if (s.bossHp <= 0) end("The bell is silent. You have the idea: the game has eleven guns, not one.");
  }
  function fly(dx, dy, keepHeading) {
    s.x = Math.max(10, Math.min(W - 10, s.x + dx));
    s.y = Math.max(14, Math.min(H - 12, s.y + dy));
    const l = Math.hypot(dx, dy);
    if (!keepHeading && l > .01) { s.hx = dx / l; s.hy = dy / l; mark(0); }
  }
  function draw() {
    g.fillStyle = "#10141d"; g.fillRect(0, 0, W, H);
    g.fillStyle = "#171d29";
    for (let y = 0; y < H; y += 32) for (let x = (y / 32 % 2) * 32; x < W; x += 64) g.fillRect(x, y, 32, 32);
    g.fillStyle = "#2a3343"; g.fillRect(0, 0, W, 6); g.fillRect(0, H - 6, W, 6);
    for (const m of s.marks) {
      g.fillStyle = "rgba(242,182,94,.16)"; g.beginPath(); g.arc(m.x, m.y, m.r, 0, 7); g.fill();
      g.strokeStyle = "#f2b65e"; g.lineWidth = 1; g.beginPath(); g.arc(m.x, m.y, m.r * m.t / 70, 0, 7); g.stroke();
      g.beginPath(); g.arc(m.x, m.y, m.r, 0, 7); g.stroke();
    }
    /* the training bell */
    const bx = Math.round(s.bossX), by = Math.round(s.bossY);
    g.fillStyle = "#07090e"; g.beginPath(); g.ellipse(bx, by + 20, 20, 5, 0, 0, 7); g.fill();
    g.fillStyle = "#c9913f"; g.fillRect(bx - 11, by - 14, 22, 8); g.fillRect(bx - 15, by - 6, 30, 14); g.fillRect(bx - 19, by + 8, 38, 6);
    g.fillStyle = "#f2c877"; g.fillRect(bx - 8, by - 13, 5, 7); g.fillRect(bx - 12, by - 5, 5, 12); g.fillRect(bx - 16, by + 9, 8, 4);
    g.fillStyle = "#7b5724"; g.fillRect(bx - 3, by - 19, 6, 5); g.fillRect(bx - 4, by + 14, 8, 4);
    g.fillStyle = "#8fdcf0";
    for (const b of s.bolts) g.fillRect(b.x - 1, b.y - 1, 3, 3);
    for (const b of s.shots) {
      g.fillStyle = "#7d2030"; g.beginPath(); g.arc(b.x, b.y, b.r + 1, 0, 7); g.fill();
      g.fillStyle = "#ffe2a8"; g.beginPath(); g.arc(b.x, b.y, b.r - 1, 0, 7); g.fill();
    }
    /* parry and its recharge ring, as in the game */
    if (s.parry > 0) { g.strokeStyle = "#ffffff"; g.lineWidth = 2; g.beginPath(); g.arc(s.x, s.y, 34, 0, 7); g.stroke(); }
    else if (s.parryCd > 0) { g.strokeStyle = "#86e4f3"; g.lineWidth = 1; g.beginPath(); g.arc(s.x, s.y, 13, -1.57, -1.57 + (1 - s.parryCd / 240) * 6.283); g.stroke(); }
    if (s.dash > 0) { g.fillStyle = "rgba(134,228,243,.35)"; g.fillRect(s.x - s.hx * 14 - 3, s.y - s.hy * 14 - 3, 6, 6); }
    if (!(s.inv > 0 && s.inv % 8 < 4)) {
      g.strokeStyle = "#86e4f3"; g.lineWidth = 1; g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(s.x + s.hx * 14, s.y + s.hy * 14); g.stroke();
      g.imageSmoothingEnabled = false;
      if (hero.complete && hero.naturalWidth) g.drawImage(hero, Math.round(s.x - hero.naturalWidth / 2), Math.round(s.y - hero.naturalHeight / 2));
      else { g.fillStyle = "#dfe6f2"; g.fillRect(s.x - 5, s.y - 7, 10, 14); }
    }
    for (const f of s.fx) { g.strokeStyle = "rgba(255,255,255," + (1 - f.t / 14) + ")"; g.beginPath(); g.arc(f.x, f.y, f.r * (.5 + f.t / 20), 0, 7); g.stroke(); }
    /* hull plates and the bell's health */
    for (let i = 0; i < 6; i++) { g.fillStyle = i < s.hull ? "#86e4f3" : "#2a3343"; g.fillRect(8 + i * 9, 10, 7, 10); }
    g.fillStyle = "#2a3343"; g.fillRect(W - 138, 12, 130, 6);
    g.fillStyle = "#f2b65e"; g.fillRect(W - 138, 12, 130 * Math.max(0, s.bossHp) / 260, 6);
  }
  function loop() {
    raf = 0;
    if (!running) { draw(); return; }
    if (!document.hidden && seen) { tick(); draw(); }
    raf = requestAnimationFrame(loop);
  }
  /* input: one finger or the mouse drags to fly; a quick tap dashes, or strikes toward a close enemy; two fingers parry */
  const keys = {};
  const pts = new Map();
  let lastTwo = 0;
  const toWorld = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
  function tap(wx, wy) {
    const d = Math.hypot(wx - s.x, wy - s.y), toBell = Math.hypot(s.bossX - s.x, s.bossY - s.y);
    const a = Math.atan2(wy - s.y, wx - s.x), b = Math.atan2(s.bossY - s.y, s.bossX - s.x);
    const off = Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
    if (toBell < 64 && off < .6 && s.strikeCd <= 0) {
      s.strike = 14; s.strikeCd = 72; s.sx = s.bossX; s.sy = s.bossY + 18; s.bossHp -= 9;
      s.fx.push({ x: s.bossX, y: s.bossY, t: 0, r: 18 }); mark(2); return;
    }
    if (s.dashCd <= 0) { s.dash = 9; s.dashCd = 42; if (d > 2) { s.hx = Math.cos(a); s.hy = Math.sin(a); } mark(1); }
  }
  function parry() {
    if (s.parryCd > 0) return;
    s.parry = 10; s.parryCd = 240; mark(3);
  }
  cv.addEventListener("pointerdown", (e) => {
    if (!running) return;
    e.preventDefault();
    if (e.button === 2) { parry(); return; }
    cv.setPointerCapture(e.pointerId);
    const [x, y] = toWorld(e);
    pts.set(e.pointerId, { x, y, sx: x, sy: y, t: performance.now(), moved: 0 });
    if (pts.size === 2) lastTwo = performance.now();
  });
  cv.addEventListener("pointermove", (e) => {
    const p = pts.get(e.pointerId);
    if (!p || !running) return;
    const [x, y] = toWorld(e), dx = x - p.x, dy = y - p.y;
    p.x = x; p.y = y; p.moved += Math.hypot(dx, dy);
    if (pts.size === 1 && p.moved > 3) fly(dx, dy);
  });
  const lift = (e) => {
    const p = pts.get(e.pointerId);
    if (!p) return;
    pts.delete(e.pointerId);
    if (!running) return;
    const quick = performance.now() - p.t < 240 && p.moved < 6;
    if (lastTwo && performance.now() - lastTwo < 300 && quick) { parry(); lastTwo = 0; return; }
    if (quick && !lastTwo) tap(p.sx, p.sy);
    if (!pts.size) lastTwo = 0;
  };
  cv.addEventListener("pointerup", lift);
  cv.addEventListener("pointercancel", (e) => pts.delete(e.pointerId));
  cv.addEventListener("contextmenu", (e) => e.preventDefault());
  addEventListener("keydown", (e) => {
    if (!running) return;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "w", "a", "s", "d", "p"].includes(e.key)) {
      if (e.target.tagName === "INPUT") return;
      e.preventDefault();
      if (e.key === " " && !e.repeat) tap(s.x + s.hx * 30, s.y + s.hy * 30);
      else if (e.key === "p" && !e.repeat) parry();
      else keys[e.key] = true;
    }
  });
  addEventListener("keyup", (e) => { delete keys[e.key]; });
  new IntersectionObserver((en) => { seen = en[0].isIntersecting; }, { threshold: .2 }).observe(cv);
  go.addEventListener("click", () => {
    fresh(); running = true; startBox.hidden = true; host.classList.add("live");
    steps.forEach((l, k) => l.classList.toggle("now", k === stepDone.indexOf(false)));
    if (!raf) raf = requestAnimationFrame(loop);
  });
  fresh(); draw();
  hero.onload = draw;
})();
