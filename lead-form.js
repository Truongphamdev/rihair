/**
 * Lead form + countdown + reveal dùng chung cho các landing page.
 * Cấu hình qua window.LP_CONFIG = { brand, endpoint, liveAt }.
 * endpoint rỗng => chế độ demo: không gửi đi đâu, chỉ giả lập thành công.
 */
(function () {
  "use strict";

  const CONFIG = Object.freeze(Object.assign({ brand: "unknown", endpoint: "", liveAt: "" }, window.LP_CONFIG || {}));
  const PHONE_RE = /^(0|\+?84)(3|5|7|8|9)\d{8}$/;
  const SUBMIT_TIMEOUT_MS = 15000;
  const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

  /** Đọc UTM từ URL, lưu lại trong phiên để không mất khi khách chuyển anchor. */
  function readUtm() {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = Object.fromEntries(UTM_KEYS.map((k) => [k, params.get(k) || ""]));
    const hasAny = UTM_KEYS.some((k) => fromUrl[k]);
    try {
      if (hasAny) sessionStorage.setItem("lp_utm", JSON.stringify(fromUrl));
      const saved = JSON.parse(sessionStorage.getItem("lp_utm") || "null");
      return saved || fromUrl;
    } catch (_) {
      return fromUrl;
    }
  }

  function normalizePhone(raw) {
    return String(raw || "").replace(/[\s.\-()]/g, "");
  }

  function validate(data) {
    const errors = {};
    if (data.ho_ten.trim().length < 2) errors.ho_ten = "Vui lòng nhập họ và tên.";
    if (!PHONE_RE.test(normalizePhone(data.so_dien_thoai))) errors.so_dien_thoai = "Số điện thoại chưa đúng, ví dụ 0912 345 678.";
    if (!data.tinh_thanh) errors.tinh_thanh = "Vui lòng chọn tỉnh/thành.";
    if (data.dong_y !== "yes") errors.dong_y = "Bạn cần đồng ý để chúng tôi liên hệ.";
    return errors;
  }

  function showErrors(form, errors) {
    form.querySelectorAll("[data-error-for]").forEach((el) => {
      const msg = errors[el.dataset.errorFor] || "";
      el.textContent = msg;
      const input = form.elements[el.dataset.errorFor];
      if (input && input.setAttribute) input.setAttribute("aria-invalid", msg ? "true" : "false");
    });
    const firstKey = Object.keys(errors)[0];
    if (firstKey && form.elements[firstKey] && form.elements[firstKey].focus) form.elements[firstKey].focus();
  }

  function setState(form, state, message) {
    form.dataset.state = state;
    const status = form.querySelector("[data-form-status]");
    if (status) status.textContent = message || "";
    const btn = form.querySelector("[type=submit]");
    if (btn) btn.disabled = state === "loading";
  }

  async function send(payload) {
    if (!CONFIG.endpoint) {
      console.info("[lead-form] Demo mode, payload:", payload);
      return new Promise((resolve) => setTimeout(resolve, 700));
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);
    try {
      const res = await fetch(CONFIG.endpoint, {
        method: "POST",
        body: new URLSearchParams(payload),
        signal: controller.signal,
      });
      const json = await res.json().catch(() => ({ ok: res.ok }));
      if (!json.ok) throw new Error(json.error || "Server từ chối dữ liệu");
    } finally {
      clearTimeout(timer);
    }
  }

  function initForm(form) {
    const utm = readUtm();
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (form.dataset.state === "loading") return;

      const fd = new FormData(form);
      if (fd.get("website")) return; // honeypot: bot điền trường ẩn

      const data = {
        ho_ten: String(fd.get("ho_ten") || ""),
        so_dien_thoai: String(fd.get("so_dien_thoai") || ""),
        tinh_thanh: String(fd.get("tinh_thanh") || ""),
        san_pham: String(fd.get("san_pham") || ""),
        dong_y: fd.get("dong_y") ? "yes" : "",
        tinh_trang: String(fd.get("tinh_trang") || ""),
      };
      const errors = validate(data);
      showErrors(form, errors);
      if (Object.keys(errors).length) return setState(form, "error", "Vui lòng kiểm tra lại các ô được đánh dấu.");

      const payload = Object.assign({}, data, utm, {
        so_dien_thoai: normalizePhone(data.so_dien_thoai),
        brand: CONFIG.brand,
        page_url: window.location.href.split("#")[0],
        referrer: document.referrer,
        submitted_at: new Date().toISOString(),
      });

      setState(form, "loading", "Đang gửi thông tin...");
      try {
        await send(payload);
        setState(form, "success", "");
        form.reset();
        if (typeof window.fbq === "function") window.fbq("track", "Lead");
        if (typeof window.gtag === "function") window.gtag("event", "generate_lead", { brand: CONFIG.brand });
      } catch (err) {
        console.error("[lead-form] submit failed", err);
        setState(form, "error", "Chưa gửi được, bạn thử lại sau ít phút hoặc kiểm tra kết nối mạng.");
      }
    });

    const again = form.querySelector("[data-form-again]");
    if (again) again.addEventListener("click", () => setState(form, "idle", ""));
  }

  function initCountdown(el) {
    const target = new Date(el.dataset.target || CONFIG.liveAt).getTime();
    if (Number.isNaN(target)) return;
    const parts = ["days", "hours", "minutes", "seconds"].map((k) => el.querySelector(`[data-unit=${k}]`));
    const pad = (n) => String(n).padStart(2, "0");
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        el.dataset.live = "true";
        clearInterval(timer);
        return;
      }
      const s = Math.floor(diff / 1000);
      [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60].forEach((v, i) => {
        if (parts[i]) parts[i].textContent = pad(v);
      });
    };
    const timer = setInterval(tick, 1000);
    tick();
  }

  function initReveal() {
    const items = document.querySelectorAll("[data-reveal]");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      }),
      { threshold: 0.18, rootMargin: "0px 0px -40px 0px" }
    );
    items.forEach((el) => io.observe(el));
  }

  /** Ẩn nút CTA dính đáy màn hình khi hero hoặc form đang hiển thị (đã có nút CTA khác trong tầm mắt). */
  function initStickyCta() {
    const cta = document.querySelector(".sticky-cta");
    const targets = [document.querySelector(".hero"), document.getElementById("dang-ky")].filter(Boolean);
    if (!cta || !targets.length || !("IntersectionObserver" in window)) return;
    const visible = new Set();
    cta.classList.add("is-hidden");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
      cta.classList.toggle("is-hidden", visible.size > 0);
    }, { threshold: 0.1 });
    targets.forEach((t) => io.observe(t));
  }

  /** ?draft=1 viền nét đứt các nội dung đang chờ brand xác nhận. */
  function initDraftMode() {
    if (new URLSearchParams(window.location.search).has("draft")) document.documentElement.classList.add("is-draft");
  }

  document.addEventListener("DOMContentLoaded", () => {
    initDraftMode();
    document.querySelectorAll("form[data-lead-form]").forEach(initForm);
    document.querySelectorAll("[data-countdown]").forEach(initCountdown);
    initReveal();
    initStickyCta();
  });
})();
