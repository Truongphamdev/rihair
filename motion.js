/**
 * Hiệu ứng dùng chung cho landing page: menu mobile, tách chữ tiêu đề,
 * ảnh lộ dần, số đếm, nút hút con trỏ, hero parallax theo chuột,
 * phần cuộn kể chuyện (scrolly). Không dùng scroll listener.
 */
(function () {
  "use strict";

  const REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FINE_POINTER = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const MAGNET_STRENGTH = 0.25;
  const MAGNET_MAX_PX = 10;
  const COUNT_DURATION_MS = 1600;
  /** Trên mobile stage dính phía trên, nên vạch kích hoạt phải nằm thấp hơn để thấy tiêu đề. */
  const MOBILE = window.matchMedia("(max-width: 960px)");

  /** Gọi cb một lần khi phần tử vào khung nhìn. */
  function onceInView(elements, cb, options) {
    if (!elements.length) return;
    if (REDUCE || !("IntersectionObserver" in window)) {
      elements.forEach(cb);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        cb(entry.target);
        io.unobserve(entry.target);
      });
    }, options || { threshold: 0.2 });
    elements.forEach((el) => io.observe(el));
  }

  /** Bọc từng từ trong mask để trượt lên lần lượt, giữ nguyên thẻ con như <em>. */
  function splitWords(root) {
    let index = 0;
    const wrapText = (node) => {
      const parts = node.textContent.split(/(\s+)/);
      const frag = document.createDocumentFragment();
      parts.forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          frag.appendChild(document.createTextNode(" "));
          return;
        }
        const outer = document.createElement("span");
        outer.className = "w";
        const inner = document.createElement("span");
        inner.className = "w__i";
        inner.style.setProperty("--i", String(index++));
        inner.textContent = part;
        outer.appendChild(inner);
        frag.appendChild(outer);
      });
      node.replaceWith(frag);
    };
    const walk = (el) => {
      Array.from(el.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) wrapText(child);
        else if (child.nodeType === Node.ELEMENT_NODE) walk(child);
      });
    };
    root.setAttribute("aria-label", root.textContent.trim());
    walk(root);
    root.classList.add("split");
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("is-in")));
  }

  function animateCount(el) {
    const target = Number(el.dataset.count);
    if (!Number.isFinite(target)) return;
    const format = (n) => Math.round(n).toLocaleString("vi-VN");
    if (REDUCE) {
      el.textContent = format(target);
      return;
    }
    const start = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const step = (now) => {
      const t = Math.min((now - start) / COUNT_DURATION_MS, 1);
      el.textContent = format(target * ease(t));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function initCounters() {
    const els = Array.from(document.querySelectorAll("[data-count]"));
    if (!REDUCE) els.forEach((el) => { el.textContent = "0"; });
    onceInView(els, animateCount, { threshold: 0.6 });
  }

  function initMagnetic() {
    if (!FINE_POINTER || REDUCE) return;
    document.querySelectorAll("[data-magnetic]").forEach((btn) => {
      const clamp = (v) => Math.max(-MAGNET_MAX_PX, Math.min(MAGNET_MAX_PX, v));
      btn.addEventListener("pointermove", (e) => {
        const r = btn.getBoundingClientRect();
        const dx = clamp((e.clientX - (r.left + r.width / 2)) * MAGNET_STRENGTH);
        const dy = clamp((e.clientY - (r.top + r.height / 2)) * MAGNET_STRENGTH);
        btn.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      });
      btn.addEventListener("pointerleave", () => { btn.style.transform = ""; });
    });
  }

  /** Hero parallax theo vị trí chuột: ghi --mx, --my (-1..1) lên phần tử hero. */
  function initHeroPointer() {
    if (!FINE_POINTER || REDUCE) return;
    const hero = document.querySelector("[data-pointer-parallax]");
    if (!hero) return;
    let frame = 0;
    hero.addEventListener("pointermove", (e) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        const r = hero.getBoundingClientRect();
        hero.style.setProperty("--mx", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
        hero.style.setProperty("--my", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
        frame = 0;
      });
    });
    hero.addEventListener("pointerleave", () => {
      hero.style.setProperty("--mx", "0");
      hero.style.setProperty("--my", "0");
    });
  }

  /** Phần cuộn kể chuyện: bước nào ở giữa màn hình thì đặt data-active cho stage. */
  function initScrolly() {
    document.querySelectorAll("[data-scrolly]").forEach((root) => {
      const stage = root.querySelector(".scrolly__stage");
      const steps = Array.from(root.querySelectorAll("[data-step]"));
      const activate = (step) => {
        steps.forEach((s) => s.classList.toggle("is-active", s === step));
        stage.dataset.active = step.dataset.step;
      };
      activate(steps[0]);
      if (!("IntersectionObserver" in window)) return;
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => { if (entry.isIntersecting) activate(entry.target); });
      }, { rootMargin: MOBILE.matches ? "-80% 0px -19% 0px" : "-45% 0px -45% 0px" });
      steps.forEach((s) => io.observe(s));
    });
  }

  function initMenu() {
    const btn = document.querySelector(".nav__burger");
    const menu = document.getElementById("menu");
    if (!btn || !menu) return;
    const setOpen = (open) => {
      btn.setAttribute("aria-expanded", String(open));
      btn.setAttribute("aria-label", open ? "Đóng menu" : "Mở menu");
      menu.classList.toggle("is-open", open);
      document.documentElement.classList.toggle("menu-open", open);
    };
    btn.addEventListener("click", () => setOpen(btn.getAttribute("aria-expanded") !== "true"));
    menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
  }

  function initStagger() {
    const groups = Array.from(document.querySelectorAll("[data-stagger]"));
    groups.forEach((g) => Array.from(g.children).forEach((c, i) => c.style.setProperty("--i", String(i))));
    onceInView(groups, (g) => g.classList.add("is-in"), { threshold: 0.15 });
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.documentElement.classList.add("js");
    document.querySelectorAll("[data-split]").forEach(splitWords);
    onceInView(Array.from(document.querySelectorAll("[data-clip]")), (el) => el.classList.add("is-in"), { threshold: 0.25 });
    initStagger();
    initCounters();
    initMagnetic();
    initHeroPointer();
    initScrolly();
    initMenu();
  });
})();
