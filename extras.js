/**
 * Hiệu ứng bổ sung: hạt bay, nhảy số đếm ngược, nghiêng thẻ theo chuột,
 * pháo giấy khi đăng ký thành công, vẽ đường mốc 3-6-9, đồng hồ mini ở thanh dính.
 * Tất cả tắt khi người dùng bật "giảm chuyển động".
 */
(function () {
  "use strict";

  const REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FINE = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const PARTICLE_COUNT = 18;
  const CONFETTI_COUNT = 140;
  const CONFETTI_MS = 2600;
  const TILT_MAX_DEG = 7;

  /** Rải hạt trang trí (cánh hoa / bong bóng) vào hero, vị trí và nhịp ngẫu nhiên. */
  function initParticles() {
    const host = document.querySelector("[data-particles]");
    if (!host || REDUCE) return;
    const layer = document.createElement("div");
    layer.className = "particles";
    layer.setAttribute("aria-hidden", "true");
    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      const p = document.createElement("span");
      p.className = "particle";
      p.style.setProperty("--x", (Math.random() * 100).toFixed(1) + "%");
      p.style.setProperty("--s", (0.5 + Math.random() * 0.9).toFixed(2));
      p.style.setProperty("--d", (9 + Math.random() * 9).toFixed(1) + "s");
      p.style.setProperty("--delay", (-Math.random() * 18).toFixed(1) + "s");
      p.style.setProperty("--o", (0.35 + Math.random() * 0.5).toFixed(2));
      layer.appendChild(p);
    }
    host.appendChild(layer);
  }

  /** Số đếm ngược đổi giá trị thì nảy nhẹ. */
  function initCountdownTick() {
    if (REDUCE) return;
    document.querySelectorAll("[data-unit]").forEach((el) => {
      new MutationObserver(() => {
        el.classList.remove("tick");
        void el.offsetWidth;
        el.classList.add("tick");
      }).observe(el, { childList: true, characterData: true, subtree: true });
    });
  }

  /** Thẻ nghiêng 3D theo vị trí con trỏ, chỉ trên máy có chuột. */
  function initTilt() {
    if (!FINE || REDUCE) return;
    document.querySelectorAll("[data-tilt]").forEach((card) => {
      let frame = 0;
      card.addEventListener("pointermove", (e) => {
        if (frame) return;
        frame = requestAnimationFrame(() => {
          const r = card.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          card.style.setProperty("--rx", (-py * TILT_MAX_DEG).toFixed(2) + "deg");
          card.style.setProperty("--ry", (px * TILT_MAX_DEG).toFixed(2) + "deg");
          card.style.setProperty("--gx", ((px + 0.5) * 100).toFixed(1) + "%");
          card.style.setProperty("--gy", ((py + 0.5) * 100).toFixed(1) + "%");
          frame = 0;
        });
      });
      card.addEventListener("pointerleave", () => {
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
      });
    });
  }

  /** Pháo giấy bằng canvas, bắn một lần khi form chuyển sang trạng thái thành công. */
  function fireConfetti(origin) {
    const canvas = document.createElement("canvas");
    canvas.className = "confetti";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);
    const colors = getComputedStyle(document.documentElement).getPropertyValue("--confetti").split(",").map((c) => c.trim()).filter(Boolean);
    const bits = Array.from({ length: CONFETTI_COUNT }, () => {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      const speed = 7 + Math.random() * 9;
      return {
        x: origin.x, y: origin.y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        w: 6 + Math.random() * 6, h: 4 + Math.random() * 6,
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
        color: colors[Math.floor(Math.random() * colors.length)] || "#e2187d",
      };
    });
    const start = performance.now();
    const draw = (now) => {
      const t = (now - start) / CONFETTI_MS;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      bits.forEach((b) => {
        b.vy += 0.28; b.vx *= 0.99; b.x += b.vx; b.y += b.vy; b.rot += b.vr;
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot);
        ctx.globalAlpha = Math.max(0, 1 - t * 1.1);
        ctx.fillStyle = b.color; ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); ctx.restore();
      });
      if (t < 1) requestAnimationFrame(draw); else canvas.remove();
    };
    requestAnimationFrame(draw);
  }

  function initConfetti() {
    if (REDUCE) return;
    document.querySelectorAll("form[data-lead-form]").forEach((form) => {
      new MutationObserver(() => {
        if (form.dataset.state !== "success") return;
        const r = form.getBoundingClientRect();
        fireConfetti({ x: r.left + r.width / 2, y: r.top + r.height * 0.4 });
      }).observe(form, { attributes: true, attributeFilter: ["data-state"] });
    });
  }

  /** Thanh dính đáy trên mobile: hiện đồng hồ mini lấy từ countdown chính. */
  function initStickyClock() {
    const bar = document.querySelector(".sticky-cta");
    const main = document.querySelector("[data-countdown]");
    if (!bar || !main) return;
    const mini = document.createElement("span");
    mini.className = "sticky-cta__clock";
    bar.prepend(mini);
    const sync = () => {
      const d = main.querySelector("[data-unit=days]"), h = main.querySelector("[data-unit=hours]"), m = main.querySelector("[data-unit=minutes]");
      mini.textContent = main.dataset.live === "true" ? "Đã đóng" : `Còn ${d.textContent}n ${h.textContent}g ${m.textContent}p`;
    };
    new MutationObserver(sync).observe(main, { childList: true, characterData: true, subtree: true, attributes: true });
    sync();
  }

  function initMilestoneLine() {
    const el = document.querySelector(".milestones");
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { el.classList.add("is-in"); io.disconnect(); } });
    }, { threshold: 0.8 });
    io.observe(el);
  }

  document.addEventListener("DOMContentLoaded", () => {
    initParticles();
    initCountdownTick();
    initTilt();
    initConfetti();
    initStickyClock();
    initMilestoneLine();
  });
})();
