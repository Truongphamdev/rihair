/**
 * Bài tự kiểm tra tình trạng tóc: gợi ý sản phẩm và điền sẵn vào form lead.
 * Logic gợi ý là bản nháp, chờ brand xác nhận cách phân loại.
 */
(function () {
  "use strict";

  const PRODUCTS = Object.freeze({
    strong: { name: "RiHair Strong Spray", img: "assets/strong-spray.webp", why: "Hỗ trợ nuôi dưỡng nang tóc và thúc đẩy tóc mọc, phù hợp tóc thưa và mọc chậm." },
    bubble: { name: "RiHair Bubble Spray", img: "assets/bubble-spray.webp", why: "Dạng bọt mịn giúp giảm và ngăn ngừa rụng tóc, phù hợp người rụng tóc nhiều." },
    care: { name: "RiHair Scalp Shampoo + Conditioner", img: "assets/scalp-shampoo.webp", why: "Làm sạch, cân bằng da đầu dầu và ngứa, nên dùng cùng bộ xịt." },
  });

  /** Chọn sản phẩm có nhiều dấu hiệu khớp nhất; hòa thì ưu tiên theo thứ tự strong, bubble, care. */
  function pickProduct(checked) {
    const score = { strong: 0, bubble: 0, care: 0 };
    checked.forEach((el) => { score[el.dataset.weight] += 1; });
    return Object.keys(score).reduce((best, key) => (score[key] > score[best] ? key : best), "strong");
  }

  function init(root) {
    const boxes = Array.from(root.querySelectorAll("input[type=checkbox]"));
    const empty = root.querySelector(".check-hair__empty");
    const rec = root.querySelector(".check-hair__rec");
    const form = document.querySelector("form[data-lead-form]");

    const render = () => {
      const checked = boxes.filter((b) => b.checked);
      const hasAny = checked.length > 0;
      empty.hidden = hasAny;
      rec.hidden = !hasAny;
      if (form) form.elements.tinh_trang.value = checked.map((b) => b.value).join("; ");
      if (!hasAny) return;
      const product = PRODUCTS[pickProduct(checked)];
      rec.querySelector("[data-rec-img]").src = product.img;
      rec.querySelector("[data-rec-name]").textContent = product.name;
      rec.querySelector("[data-rec-why]").textContent = product.why;
      rec.dataset.product = product.name;
    };

    boxes.forEach((b) => b.addEventListener("change", render));
    root.querySelector("[data-rec-cta]").addEventListener("click", () => {
      if (form && rec.dataset.product) form.elements.san_pham.value = rec.dataset.product;
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-hair-check]").forEach(init);
  });
})();
