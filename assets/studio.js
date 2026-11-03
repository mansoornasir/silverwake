// The studio page: a wall that rests when out of sight, a wisp that looks at you, and the games' stages.
(() => {
  // Links to the old one-game home keep working: its sections live under /silverwake/ now.
  if (["#bosses", "#guns", "#together", "#try"].includes(location.hash)) location.replace("/silverwake/" + location.hash);
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = matchMedia("(hover: hover) and (pointer: fine)").matches;
  // A batch can hold several changes for one element: the last entry is where it is now.
  const seenBy = (el, fn, threshold = .25) => new IntersectionObserver((seen) => fn(seen[seen.length - 1].isIntersecting), { threshold }).observe(el);
  const hop = (soul) => {
    if (still) return;
    soul.classList.add("hop");
    setTimeout(() => soul.classList.remove("hop"), 520);
  };

  // The bar: a sticker slides to the section you are in, or the link you are on; the line under it is how far down the page you are, with a wisp riding it.
  const bar = document.querySelector(".top");
  const nav = bar.querySelector("nav");
  const links = [...nav.querySelectorAll("a")];
  const places = links.map((a) => document.getElementById(a.hash.slice(1)));
  let here = null, over = null, due = false;
  const light = () => {
    const a = over || here;
    links.forEach((l) => l.classList.toggle("lit", l === a));
    nav.classList.toggle("has", !!a);
    if (!a) return;
    nav.style.setProperty("--bx", a.offsetLeft + "px");
    nav.style.setProperty("--bw", a.offsetWidth + "px");
    nav.style.setProperty("--tilt", a.dataset.tilt + "deg");
    bar.style.setProperty("--tint", a.dataset.tint);
  };
  const read = () => {
    due = false;
    const top = document.documentElement;
    const done = scrollY / Math.max(1, top.scrollHeight - innerHeight);
    bar.style.setProperty("--read", done.toFixed(4));
    bar.classList.toggle("reading", done > .01);
    let now = null;
    links.forEach((a, n) => { if (places[n] && places[n].getBoundingClientRect().top <= innerHeight * .45) now = a; });
    if (now === here) return;
    here = now;
    links.forEach((l) => { if (l === here) l.setAttribute("aria-current", "true"); else l.removeAttribute("aria-current"); });
    light();
    hop(bar.querySelector(".soul"));
  };
  addEventListener("scroll", () => {
    if (due) return;
    due = true;
    requestAnimationFrame(read);
  }, { passive: true });
  addEventListener("resize", () => { read(); light(); });
  links.forEach((a) => {
    const on = () => { over = a; light(); };
    const off = () => { over = null; light(); };
    if (canHover) {
      a.addEventListener("pointerenter", on);
      a.addEventListener("pointerleave", off);
    }
    a.addEventListener("focus", () => { if (a.matches(":focus-visible")) on(); });
    a.addEventListener("blur", off);
  });
  read();

  const band = document.querySelector(".band");
  if (band) seenBy(band, (on) => band.classList.toggle("paused", !on), 0);

  // The headline: letters on stage, a new ending every few seconds, and the wisp hops when it changes.
  const spell = (el) => {
    const text = el.textContent;
    el.textContent = "";
    [...text].forEach((c, i) => {
      const ch = document.createElement("span");
      ch.className = "ch";
      ch.textContent = c === " " ? "\u00a0" : c;
      ch.style.setProperty("--i", i);
      ch.style.setProperty("--r", String(Math.round(Math.random() * 60 - 30)));
      el.append(ch);
    });
  };
  const lines = [...document.querySelectorAll(".slot .line")];
  if (lines.length && !still) {
    spell(document.querySelector(".lead"));
    lines.forEach(spell);
    let at = 0;
    setInterval(() => {
      if (document.hidden || band.classList.contains("paused")) return;
      const was = lines[at];
      at = (at + 1) % lines.length;
      was.classList.replace("on", "out");
      setTimeout(() => {
        was.classList.remove("out");
        lines[at].classList.add("on");
        hop(document.querySelector(".logo .soul"));
      }, 320);
    }, 2900);
  }

  // Every wisp on the page watches the pointer and blinks.
  const souls = [...document.querySelectorAll(".soul")];
  if (!still) {
    addEventListener("pointermove", (ev) => {
      for (const soul of souls) {
        const box = soul.getBoundingClientRect();
        const dx = ev.clientX - (box.left + box.width / 2), dy = ev.clientY - (box.top + box.height / 2);
        soul.style.setProperty("--lx", Math.abs(dx) < 30 ? 0 : Math.sign(dx));
        soul.style.setProperty("--ly", Math.abs(dy) < 30 ? 0 : Math.sign(dy));
      }
    }, { passive: true });
    const blink = () => {
      for (const soul of souls) {
        soul.classList.add("blink");
        setTimeout(() => soul.classList.remove("blink"), 130);
      }
      setTimeout(blink, 2600 + Math.random() * 3800);
    };
    setTimeout(blink, 2200);
  }

  // The footer: rests when out of sight, and its wisp answers back when poked.
  const foot = document.querySelector(".foot");
  if (foot) seenBy(foot, (on) => foot.classList.toggle("paused", !on), 0);
  const pal = document.querySelector(".pal");
  if (pal) {
    const says = JSON.parse(pal.dataset.says);
    const bubble = pal.querySelector(".bubble");
    const soul = pal.querySelector(".soul");
    let said = 0;
    pal.addEventListener("click", () => {
      said = (said + 1) % says.length;
      bubble.textContent = says[said];
      bubble.classList.remove("said");
      void bubble.offsetWidth;
      bubble.classList.add("said");
      hop(soul);
    });
  }

  // About: "We did." lands when it comes into view, the camera goes off once, and the suspect answers questions.
  const suspect = document.querySelector(".suspect");
  if (suspect) {
    const flash = document.querySelector(".flash");
    const fire = () => { if (!still && !flash.classList.contains("fired")) flash.classList.add("fired"); };
    flash.addEventListener("animationend", () => flash.classList.remove("fired"));
    const says = JSON.parse(suspect.dataset.says);
    const bubble = suspect.querySelector(".bubble");
    const soul = suspect.querySelector(".soul");
    let said = 0;
    suspect.addEventListener("click", () => {
      said = (said + 1) % says.length;
      bubble.textContent = says[said];
      bubble.classList.remove("said");
      void bubble.offsetWidth;
      bubble.classList.add("said");
      fire();
      hop(soul);
    });
    if (!still) {
      new IntersectionObserver((seen, watcher) => {
        if (!seen[seen.length - 1].isIntersecting) return;
        fire();
        watcher.disconnect();
      }, { threshold: .6 }).observe(flash);
      const head = document.querySelector(".case-head");
      head.classList.add("waiting");
      new IntersectionObserver((seen, watcher) => {
        if (!seen[seen.length - 1].isIntersecting) return;
        head.classList.remove("waiting");
        watcher.disconnect();
      }, { threshold: .5 }).observe(head);
    }
  }

  // Copy and share buttons say what happened beside them; if the clipboard refuses, the text is selected instead.
  const tell = (button, words) => {
    const note = button.parentElement.querySelector(".said");
    note.textContent = words;
    setTimeout(() => { if (note.textContent === words) note.textContent = ""; }, 3500);
  };
  const copy = (button, text, target) => {
    const selectIt = () => {
      if (!target) { tell(button, text); return; }
      const range = document.createRange();
      range.selectNodeContents(target);
      getSelection().removeAllRanges();
      getSelection().addRange(range);
      tell(button, "Selected: copy it from here.");
    };
    if (!navigator.clipboard) { selectIt(); return; }
    navigator.clipboard.writeText(text).then(() => tell(button, "Copied!"), selectIt);
  };
  document.querySelectorAll("[data-copy]").forEach((b) => b.addEventListener("click", () => copy(b, b.dataset.copy, document.querySelector(b.dataset.target))));
  document.querySelectorAll("[data-share]").forEach((b) => b.addEventListener("click", () => {
    if (navigator.share) navigator.share({ title: "Souls Indie Studio", url: b.dataset.share }).catch(() => {});
    else copy(b, b.dataset.share);
  }));

  const countUp = (el) => {
    const to = Number(el.dataset.n), start = performance.now();
    const step = (t) => {
      const f = Math.min(1, (t - start) / 900);
      el.textContent = String(Math.round(to * (1 - (1 - f) ** 3)));
      if (f < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  for (const stage of document.querySelectorAll(".stage")) {
    const screen = stage.querySelector(".screen");
    let clip = screen.querySelector("video");
    let pic = screen.querySelector("img");
    const dim = stage.classList.contains("dim");
    const look = dim ? "px bright" : "";
    const glow = stage.querySelector(".glow");
    const thumbs = [...stage.querySelectorAll(".thumb")];
    let shown = false;

    const show = (thumb) => {
      thumbs.forEach((t) => t.setAttribute("aria-pressed", String(t === thumb)));
      screen.querySelector(".cap").textContent = thumb.dataset.label;
      const next = new Image();
      next.src = thumb.dataset.poster;
      next.alt = "";
      const tint = next.cloneNode();
      tint.addEventListener("animationend", () => { while (glow.children.length > 1) glow.firstElementChild.remove(); }, { once: true });
      glow.append(tint);
      // One game can mix films and pictures, so the screen holds whichever the thumbnail asks for.
      const film = thumb.dataset.src.endsWith(".mp4");
      const swap = () => {
        if (film) {
          if (!clip) {
            clip = document.createElement("video");
            clip.className = look;
            clip.muted = clip.loop = clip.playsInline = true;
            clip.tabIndex = -1;
            clip.setAttribute("aria-hidden", "true");
            pic.replaceWith(clip);
            pic = null;
          }
          clip.poster = thumb.dataset.poster;
          clip.src = thumb.dataset.src;
          if (shown && !still) clip.play().catch(() => {});
        } else {
          if (!pic) {
            pic = new Image();
            pic.className = look;
            clip.pause();
            clip.replaceWith(pic);
            clip = null;
          }
          pic.src = thumb.dataset.src;
          pic.alt = stage.querySelector("h3").textContent + ": " + thumb.dataset.label;
        }
      };
      if (still) { glow.firstElementChild.remove(); swap(); return; }
      next.className = "veil " + look;
      next.addEventListener("animationend", () => { swap(); setTimeout(() => next.remove(), film ? 250 : 0); }, { once: true });
      screen.insertBefore(next, screen.querySelector(".cap"));
    };
    thumbs.forEach((t) => t.addEventListener("click", () => show(t)));

    if (still) continue;
    // The picture moves on by itself when its progress bar fills; hovering the thumbnails, keyboard focus on them or scrolling away holds the bar.
    stage.classList.add("runs");
    stage.addEventListener("animationend", (ev) => {
      if (ev.animationName === "fill") show(thumbs[(thumbs.indexOf(ev.target) + 1) % thumbs.length]);
    });
    stage.classList.add("waiting");
    new IntersectionObserver((seen, watcher) => {
      if (!seen[seen.length - 1].isIntersecting) return;
      stage.classList.remove("waiting");
      stage.querySelectorAll("[data-n]").forEach(countUp);
      watcher.disconnect();
    }, { threshold: .15 }).observe(stage);
    seenBy(stage, (on) => {
      shown = on;
      stage.classList.toggle("idle", !on);
      if (clip) { if (on) clip.play().catch(() => {}); else clip.pause(); }
    }, .2);
    if (canHover) {
      const phone = stage.querySelector(".phone");
      const sheen = stage.querySelector(".sheen");
      stage.addEventListener("pointermove", (ev) => {
        const box = phone.getBoundingClientRect();
        const x = Math.max(-1, Math.min(1, (ev.clientX - box.left - box.width / 2) / (box.width / 2 + 160)));
        const y = Math.max(-1, Math.min(1, (ev.clientY - box.top - box.height / 2) / (box.height / 2 + 160)));
        phone.style.setProperty("--ry", (x * 12).toFixed(2) + "deg");
        phone.style.setProperty("--rx", (-y * 8).toFixed(2) + "deg");
        sheen.style.setProperty("--sx", (x * 50 + 50).toFixed(1) + "%");
        sheen.style.setProperty("--sy", (y * 50 + 50).toFixed(1) + "%");
        sheen.style.setProperty("--shine", "1");
      }, { passive: true });
      stage.addEventListener("pointerleave", () => {
        phone.style.removeProperty("--ry");
        phone.style.removeProperty("--rx");
        sheen.style.setProperty("--shine", "0");
      });
    }
  }

})();
