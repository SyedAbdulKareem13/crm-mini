/**
 * Manzil One — mobile shim (over-the-air updatable).
 *
 * This file is the SINGLE SOURCE OF TRUTH for every mobile UI fix layered on
 * top of the live web app. The Android shell fetches the latest copy of this
 * file from the repo at runtime (falling back to the copy bundled in the APK
 * when offline), so shipping a UI fix = pushing this file — NO new APK.
 *
 * Rules: everything here must be IDEMPOTENT (guarded by element ids /
 * data-attributes) because the shell re-injects it periodically.
 */
/* mz-shim-version: 2 */
(function () {
  try {
    /* ── 1. Global mobile CSS ─────────────────────────────────────────── */
    if (!document.getElementById("mz-style")) {
      var css = ""
        /* layout guards for all sub-desktop widths */
        + "@media (max-width:1023px){"
        +   "html,body{overflow-x:hidden !important;max-width:100% !important}"
        +   "[role=dialog]{width:calc(100vw - 24px) !important;max-width:32rem !important;"
        +     "max-height:86dvh !important;overflow-y:auto !important;overscroll-behavior:contain !important}"
        +   "main{padding-bottom:7.5rem !important;overflow-x:clip !important}"
        +   "main table{min-width:640px}"                       /* tables scroll inside their card */
        + "}"
        /* phone-specific */
        + "@media (max-width:640px){"
        +   "header > button:first-child{flex:1 1 auto !important;min-width:0 !important;max-width:none !important}"
        +   "header > div:last-child{flex:0 0 auto !important}"
        +   "input,textarea,select{font-size:16px !important}"  /* no focus zoom */
        + "}"
        /* Manz AI: stop the spinning halo border (read as a stray diagonal line) */
        + ".manz-halo::before{animation:none !important;opacity:.25 !important}"
        /* ── navigation drawer (FAB + bottom sheet) ── */
        + "#mz-fab{position:fixed;right:16px;bottom:calc(88px + env(safe-area-inset-bottom));z-index:2147483000;"
        +   "width:54px;height:54px;border:0;border-radius:17px;background:linear-gradient(180deg,#ff8a65,#ff5c5c);"
        +   "color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 14px 30px -8px rgba(255,92,92,.6)}"
        + "#mz-fab:active{transform:scale(.94)}"
        + "#mz-fab svg{width:24px;height:24px;stroke:#fff;stroke-width:2.4;fill:none;stroke-linecap:round}"
        + "#mz-ov{position:fixed;inset:0;z-index:2147483001;display:none;flex-direction:column;justify-content:flex-end;"
        +   "background:rgba(20,21,26,.40);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}"
        + "#mz-ov.mz-open{display:flex}"
        + "#mz-sheet{background:#f7f7f0;border-radius:24px 24px 0 0;max-height:84vh;overflow-y:auto;"
        +   "padding:14px 14px calc(22px + env(safe-area-inset-bottom));box-shadow:0 -22px 54px -22px rgba(20,21,26,.45);"
        +   "animation:mzup .28s cubic-bezier(.16,1,.3,1)}"
        + "@keyframes mzup{from{transform:translateY(40px);opacity:.4}to{transform:none;opacity:1}}"
        + "#mz-sheet .mz-h{display:flex;align-items:center;justify-content:space-between;margin:6px 6px 12px}"
        + "#mz-sheet .mz-h b{font:700 17px/1 -apple-system,Roboto,system-ui,sans-serif;color:#14151a}"
        + "#mz-x{border:0;background:#ecebe4;color:#14151a;border-radius:10px;width:34px;height:34px;font-size:19px;line-height:1}"
        + "#mz-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}"
        + "#mz-grid a{display:flex;align-items:center;gap:10px;padding:13px 12px;border-radius:14px;background:#fff;"
        +   "border:1px solid rgba(20,21,26,.08);color:#14151a;text-decoration:none;"
        +   "font:600 13.5px/1.15 -apple-system,Roboto,system-ui,sans-serif}"
        + "#mz-grid a:active{background:#fff2ec}"
        + "#mz-grid .mz-e{font-size:17px;width:22px;text-align:center}";
      var st = document.createElement("style");
      st.id = "mz-style";
      st.appendChild(document.createTextNode(css));
      (document.head || document.documentElement).appendChild(st);
    }

    /* Everything below only applies inside the product. */
    if (location.pathname.indexOf("/app") !== 0) return;

    /* ── 2. "All sections" drawer — full navigation on phones ─────────── */
    var ITEMS = [
      ["/app", "Dashboard", "📊"],
      ["/app/ai", "Manz AI", "✨"],
      ["/app/leads", "Leads", "👥"],
      ["/app/opportunities", "Opportunities", "🎯"],
      ["/app/pipeline", "Pipeline", "🗂"],
      ["/app/rfqs", "RFQs", "📄"],
      ["/app/quotations", "Quotations", "🧾"],
      ["/app/customers", "Customers", "🏢"],
      ["/app/activities", "Activities", "📅"],
      ["/app/rate-cards", "Rate Cards", "💲"],
      ["/app/approvals", "Approvals", "✅"],
      ["/app/reports", "Reports", "📈"],
      ["/app/audit", "Audit Log", "🕒"],
      ["/app/releases", "What is New", "🚀"],
      ["/app/admin", "Admin", "⚙️"],
      ["/app/settings", "Settings", "🔧"]
    ];

    function buildDrawer() {
      if (location.pathname.indexOf("/app") !== 0) return;
      if (document.getElementById("mz-fab")) return;
      if (window.innerWidth >= 1024) return;

      var fab = document.createElement("button");
      fab.id = "mz-fab";
      fab.setAttribute("aria-label", "All sections");
      fab.innerHTML = '<svg viewBox="0 0 24 24"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>';

      var ov = document.createElement("div"); ov.id = "mz-ov";
      var sheet = document.createElement("div"); sheet.id = "mz-sheet";
      var head = document.createElement("div"); head.className = "mz-h";
      var title = document.createElement("b"); title.textContent = "All sections";
      var x = document.createElement("button"); x.id = "mz-x"; x.innerHTML = "×";
      head.appendChild(title); head.appendChild(x);
      var grid = document.createElement("div"); grid.id = "mz-grid";
      ITEMS.forEach(function (it) {
        var a = document.createElement("a"); a.href = it[0];
        var e = document.createElement("span"); e.className = "mz-e"; e.textContent = it[2];
        var t = document.createElement("span"); t.textContent = it[1];
        a.appendChild(e); a.appendChild(t);
        a.addEventListener("click", function (ev) {
          ev.preventDefault();
          ov.classList.remove("mz-open");
          location.href = it[0];
        });
        grid.appendChild(a);
      });
      sheet.appendChild(head); sheet.appendChild(grid); ov.appendChild(sheet);

      function close() { ov.classList.remove("mz-open"); }
      fab.addEventListener("click", function () { ov.classList.add("mz-open"); });
      x.addEventListener("click", close);
      ov.addEventListener("click", function (ev) { if (ev.target === ov) close(); });

      document.body.appendChild(fab);
      document.body.appendChild(ov);
    }

    buildDrawer();

    /* ── 3. Manz AI composer: static placeholder, no overlay bleed ─────── */
    try {
      var ai = document.querySelector('input[aria-label="Ask Manz AI"]');
      if (ai && ai.getAttribute("data-mzph") !== "1") {
        ai.setAttribute("placeholder", "Ask Manz AI...");
        ai.setAttribute("data-mzph", "1");
        var pp = ai.parentElement;
        var ovl = pp ? pp.querySelector("[aria-hidden]") : null;
        if (ovl) ovl.style.display = "none";
      }
    } catch (e) { /* noop */ }

    /* ── 4. Rebuild the drawer after client-side route changes ─────────── */
    if (!window.__mzWrap) {
      window.__mzWrap = 1;
      var _ps = history.pushState;
      history.pushState = function () { _ps.apply(this, arguments); setTimeout(buildDrawer, 60); };
      window.addEventListener("popstate", function () { setTimeout(buildDrawer, 60); });
    }
  } catch (e) { /* never break the host page */ }
})();
