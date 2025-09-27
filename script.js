/* =========================
   Musicala · Inducción
   script.js (tabs + flechas + render desde JSON)
   ========================= */

(() => {
  const qs  = (sel, el = document) => el.querySelector(sel);
  const qsa = (sel, el = document) => [...el.querySelectorAll(sel)];

  const config = window.INDUCCION_CONFIG || {
    jsonUrl: "induccion.json",
    themeColor: "#0C41C4"
  };

  /* ---------- Theme / Año ---------- */
  const setTheme = (color) => {
    if (!color) return;
    // Compatibilidad con CSS: exponemos dos variables
    document.documentElement.style.setProperty("--color-primary", color);
    document.documentElement.style.setProperty("--primary", color);
    let meta = qs('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", color);
  };
  const setYear = () => { const y = qs("#year"); if (y) y.textContent = String(new Date().getFullYear()); };
  setTheme(config.themeColor); setYear();

  /* ---------- Tabs (ARIA + teclado + hash) ---------- */
  const tabButtons = qsa('[role="tab"]');
  const tabPanels  = qsa('[role="tabpanel"]');

  const tabsRail   = qs(".tabs-rail");
  const tabsScroll = qs(".tabs");
  const prevBtn    = qs(".tabs-arrow.prev");
  const nextBtn    = qs(".tabs-arrow.next");

  const getBtnByControls = (controlsId) =>
    tabButtons.find((b) => b.getAttribute("aria-controls") === controlsId);

  const scrollTabIntoView = (btn) => {
    if (!tabsScroll || !btn) return;
    const rBtn  = btn.getBoundingClientRect();
    const rCont = tabsScroll.getBoundingClientRect();
    const pad = 16;
    if (rBtn.left < rCont.left) {
      tabsScroll.scrollBy({ left: rBtn.left - rCont.left - pad, behavior: "smooth" });
    } else if (rBtn.right > rCont.right) {
      tabsScroll.scrollBy({ left: rBtn.right - rCont.right + pad, behavior: "smooth" });
    }
  };

  const activateTab = (btn, { focus = true, pushHash = true } = {}) => {
    if (!btn) return;
    const controlsId = btn.getAttribute("aria-controls");
    const panel = qs(`#${controlsId}`);

    tabButtons.forEach((b) => { b.classList.remove("is-active"); b.setAttribute("aria-selected", "false"); b.tabIndex = -1;});
    tabPanels.forEach((p) => p.classList.remove("is-active"));

    btn.classList.add("is-active");
    btn.setAttribute("aria-selected", "true");
    btn.tabIndex = 0;
    panel.classList.add("is-active");

    if (focus) btn.focus({ preventScroll: true });
    scrollTabIntoView(btn);

    if (pushHash) {
      const id = panel.id.replace(/^tab-/, "");
      history.replaceState(null, "", `#${id}`);
    }
  };

  const activateById = (idFromHash) => {
    const panelId = idFromHash.startsWith("tab-") ? idFromHash : `tab-${idFromHash}`;
    const btn = getBtnByControls(panelId);
    if (btn) activateTab(btn, { focus: false, pushHash: false });
  };

  tabButtons.forEach((btn) => btn.addEventListener("click", () => activateTab(btn)));
  document.addEventListener("keydown", (e) => {
    const cur = document.activeElement;
    if (!cur || cur.getAttribute("role") !== "tab") return;
    const idx = tabButtons.indexOf(cur); if (idx < 0) return;
    let nextIdx = idx;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown": nextIdx = (idx + 1) % tabButtons.length; e.preventDefault(); break;
      case "ArrowLeft":
      case "ArrowUp":   nextIdx = (idx - 1 + tabButtons.length) % tabButtons.length; e.preventDefault(); break;
      case "Home":      nextIdx = 0; e.preventDefault(); break;
      case "End":       nextIdx = tabButtons.length - 1; e.preventDefault(); break;
      default: return;
    }
    activateTab(tabButtons[nextIdx]);
  });

  const initialHash = (location.hash || "").replace("#", "");
  if (initialHash) activateById(initialHash);
  else activateTab(qs('.tab.is-active') || tabButtons[0], { focus: false, pushHash: false });

  window.addEventListener("hashchange", () => {
    const h = (location.hash || "").replace("#", "");
    if (h) activateById(h);
  });

  /* ---------- Flechas para desplazar la barra de tabs ---------- */
  if (tabsRail && tabsScroll && prevBtn && nextBtn) {
    const updateArrows = () => {
      const max = Math.max(0, tabsScroll.scrollWidth - tabsScroll.clientWidth);
      const x   = tabsScroll.scrollLeft;
      const show = max > 0;
      prevBtn.style.display = show ? "" : "none";
      nextBtn.style.display = show ? "" : "none";
      prevBtn.disabled = x <= 0;
      nextBtn.disabled = x >= max - 1;
    };

    const scrollByStep = (dir) => {
      const step = Math.max(120, Math.round(tabsScroll.clientWidth * 0.6));
      tabsScroll.scrollBy({ left: dir * step, behavior: "smooth" });
    };

    prevBtn.addEventListener("click", () => scrollByStep(-1));
    nextBtn.addEventListener("click", () => scrollByStep(1));

    // Rueda vertical desplaza horizontal:
    tabsScroll.addEventListener("wheel", (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        tabsScroll.scrollLeft += e.deltaY;
      }
    }, { passive: false });

    tabsScroll.addEventListener("scroll", updateArrows);
    window.addEventListener("resize", updateArrows);
    updateArrows();
  }

  /* ---------- Render helpers ---------- */

  const getByPath = (obj, path) =>
    path.split(".").reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);

  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };

  const renderBadges = (arr) => {
    const wrap = el("div", "badges");
    arr.forEach((b) => {
      const chip = el("span", `badge ${b.base ? "base" : ""}`);
      chip.textContent = b.label || String(b);
      wrap.appendChild(chip);
    });
    return wrap;
  };

  const renderTimeline = (items) => {
    const wrap = el("div", "timeline");
    let total = 0;
    items.forEach(i => total += Number(i.min || 0));
    items.forEach((i) => {
      const seg = el("div", "t-seg");
      const width = total > 0 ? (Number(i.min) / total) * 100 : 0;
      seg.style.width = `${width}%`;
      seg.appendChild(el("div", "t-title", i.title || ""));
      seg.appendChild(el("div", "t-min", `${i.min || 0} min`));
      wrap.appendChild(seg);
    });
    return wrap;
  };

  const renderValue = (elTarget, value) => {
    if (value == null) return;

    // 1) Si el target es <li>, solo texto
    if (elTarget.tagName === "LI") {
      elTarget.textContent = typeof value === "string" ? value : String(value);
      return;
    }

    // 2) Strings simples o HTML
    if (typeof value === "string") { elTarget.innerHTML = value; return; }

    // 3) Arrays
    if (Array.isArray(value)) {
      const isStringArray  = value.every(v => typeof v === "string");
      const isObjectArray  = value.every(v => typeof v === "object" && v !== null);

      if (isStringArray) {
        const ul = el("ul", "bullets");
        value.forEach((t) => ul.appendChild(el("li", "", t)));
        elTarget.replaceChildren(ul);
        return;
      }

      if (isObjectArray) {
        // Subcards (título + texto + lista interna opcional)
        const frag = document.createDocumentFragment();
        value.forEach((obj) => {
          const block = el("div", "subcard");
          if (obj.title) block.appendChild(el("h3", "", obj.title));
          if (obj.text)  block.appendChild(el("p", "", obj.text));
          if (Array.isArray(obj.items) && obj.items.length) {
            const ul = el("ul", "bullets");
            obj.items.forEach((it) => ul.appendChild(el("li", "", it)));
            block.appendChild(ul);
          }
          frag.appendChild(block);
        });
        elTarget.replaceChildren(frag);
        return;
      }

      // Fallback
      elTarget.textContent = JSON.stringify(value);
      return;
    }

    // 4) Objetos con estructura conocida
    if (typeof value === "object") {
      const { title, lead, text, items, badges, timeline, link } = value;
      const frag = document.createDocumentFragment();

      if (title) frag.appendChild(el("h3", "", title));
      if (lead)  frag.appendChild(el("p", "lead", lead));
      if (text)  frag.appendChild(el("div", "", text));
      if (Array.isArray(badges) && badges.length) frag.appendChild(renderBadges(badges));

      // 🔧 FIX: 'items' puede ser array de strings o de objetos
      if (Array.isArray(items) && items.length) {
        const areObjects = items.every(it => typeof it === "object" && it !== null);
        const lookLikeSubcards = areObjects && items.every(it => it.title || it.text || it.items);

        if (lookLikeSubcards) {
          const innerFrag = document.createDocumentFragment();
          items.forEach(obj => {
            const block = el("div", "subcard");
            if (obj.title) block.appendChild(el("h3", "", obj.title));
            if (obj.text)  block.appendChild(el("p", "", obj.text));
            if (Array.isArray(obj.items) && obj.items.length) {
              const ul = el("ul", "bullets");
              obj.items.forEach(it => ul.appendChild(el("li", "", it)));
              block.appendChild(ul);
            }
            innerFrag.appendChild(block);
          });
          frag.appendChild(innerFrag);
        } else {
          const ul = el("ul", "bullets");
          items.forEach((it) => ul.appendChild(el("li", "", typeof it === "string" ? it : String(it))));
          frag.appendChild(ul);
        }
      }

      if (Array.isArray(timeline) && timeline.length) frag.appendChild(renderTimeline(timeline));
      if (link && link.href) {
        const a = el("a", "ext-link", link.text || link.href);
        a.href = link.href; a.target = "_blank"; a.rel = "noopener";
        frag.appendChild(a);
      }

      if (frag.childNodes.length) { elTarget.replaceChildren(frag); return; }
    }

    // 5) Fallback final
    elTarget.textContent = typeof value === "string" ? value : JSON.stringify(value);
  };

  const hydrateWithData = (data) => {
    qsa("[data-key]").forEach((node) => {
      const path = node.getAttribute("data-key");
      const val = getByPath(data, path);
      if (val === undefined) return;
      const slot = qs(".js-slot", node);
      renderValue(slot || node, val);
    });
    qsa("[data-fill]").forEach((node) => {
      const path = node.getAttribute("data-fill");
      const val = getByPath(data, path);
      if (typeof val === "string") node.textContent = val;
    });
  };

  const loadJSON = async (url) => {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn("[Inducción] No se pudo cargar el JSON:", err.message);
      return null;
    }
  };

  (async () => {
    const data = await loadJSON(config.jsonUrl);
    if (data) hydrateWithData(data);
  })();
})();
