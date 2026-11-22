/* ============================================================================
   script.js — Progressive Enhancement (kein Rendering!)
   Das ausgelieferte HTML ist vollständig statisch. Dieses Skript reichert nur an:
   Header-Zustand, mobile Navigation, Scroll-Reveal, Karten-Consent,
   „heute“-Markierung, Live-Status „geöffnet/geschlossen“ und (nur im Entwurf)
   die Angebots-Pille. Ohne JavaScript bleibt alles lesbar und nutzbar.
   ============================================================================ */
(function () {
  "use strict";

  document.documentElement.classList.add("js");
  var TAGE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

  document.addEventListener("DOMContentLoaded", function () {
    initHeaderScroll();
    initNav();
    initReveal();
    initMapConsent();
    highlightToday();
    initOpenStatus();
    initDemoPill();
  });

  /* ---- Header: fester Hintergrund nach dem Scrollen --------------------- */
  function initHeaderScroll() {
    var header = document.querySelector("[data-header]");
    if (!header) return;
    var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 24); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---- Mobile-Navigation ----------------------------------------------- */
  function initNav() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.getElementById("primary-nav");
    if (!toggle || !nav) return;
    var label = toggle.querySelector(".visually-hidden");

    var open = function () {
      document.body.setAttribute("data-nav-open", "");
      toggle.setAttribute("aria-expanded", "true");
      label.textContent = "Menü schließen";
      var first = nav.querySelector("a, button");
      if (first) first.focus();
    };
    var close = function (returnFocus) {
      document.body.removeAttribute("data-nav-open");
      toggle.setAttribute("aria-expanded", "false");
      label.textContent = "Menü öffnen";
      if (returnFocus) toggle.focus();
    };
    var isOpen = function () { return document.body.hasAttribute("data-nav-open"); };

    toggle.addEventListener("click", function () { isOpen() ? close(true) : open(); });
    nav.addEventListener("click", function (e) { if (e.target.closest("a") && isOpen()) close(false); });
    document.addEventListener("click", function (e) {
      if (isOpen() && !nav.contains(e.target) && !toggle.contains(e.target)) close(false);
    });
    document.addEventListener("keydown", function (e) {
      if (!isOpen()) return;
      if (e.key === "Escape") { close(true); return; }
      if (e.key === "Tab") {
        var items = [toggle].concat(Array.prototype.slice.call(nav.querySelectorAll("a, button")));
        var first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ---- Scroll-Reveal ---------------------------------------------------- */
  function initReveal() {
    var items = document.querySelectorAll("[data-reveal]");
    if (!items.length) return;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("is-visible"); io.unobserve(entry.target); }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -6% 0px" });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---- DSGVO: Karte erst nach Klick laden ------------------------------ */
  function initMapConsent() {
    document.querySelectorAll("[data-map]").forEach(function (map) {
      var btn = map.querySelector("[data-map-load]");
      var tpl = map.querySelector("[data-map-embed]");
      if (!btn || !tpl) return;
      btn.addEventListener("click", function () {
        map.appendChild(tpl.content.cloneNode(true));
        map.classList.add("is-loaded");
        var frame = map.querySelector("iframe");
        if (frame) frame.focus();
      });
    });
  }

  /* ---- Öffnungszeiten: heutigen Tag markieren -------------------------- */
  function highlightToday() {
    var heute = TAGE[new Date().getDay()];
    document.querySelectorAll('.hours__row[data-day="' + heute + '"]').forEach(function (row) {
      row.classList.add("is-today");
      row.setAttribute("aria-current", "date");
      var day = row.querySelector(".hours__day");
      if (day && !day.querySelector(".hours__badge")) {
        var badge = document.createElement("span");
        badge.className = "hours__badge";
        badge.textContent = "heute";
        day.appendChild(badge);
      }
    });
  }

  /* ---- Live-Status: „Jetzt geöffnet · bis 22:00 Uhr“ -------------------- */
  // Liest die Zeiten aus der Öffnungszeiten-Liste („11:30 – 14:00, 17:30 – 22:00“,
  // „Ruhetag“ …). Zeiten über Mitternacht (z. B. 18:00 – 01:00) werden berücksichtigt.
  function initOpenStatus() {
    var el = document.querySelector("[data-open-status]");
    var label = el && el.querySelector("[data-open-label]");
    var rows = document.querySelectorAll(".hours__row");
    if (!el || !label || !rows.length) return;

    var plan = {}, irgendwas = false;
    rows.forEach(function (r) {
      var txt = (r.querySelector(".hours__time") || {}).textContent || "";
      var re = /(\d{1,2})[:.](\d{2})\s*(?:–|-|—|bis)\s*(\d{1,2})[:.](\d{2})/g, m, spannen = [];
      while ((m = re.exec(txt))) {
        var a = +m[1] * 60 + +m[2], b = +m[3] * 60 + +m[4];
        if (b <= a) b += 1440;
        spannen.push([a, b]);
      }
      if (spannen.length) irgendwas = true;
      plan[r.getAttribute("data-day")] = spannen;
    });
    if (!irgendwas) return;

    var uhr = function (min) {
      min = ((min % 1440) + 1440) % 1440;
      return (min < 600 ? "0" : "") + Math.floor(min / 60) + ":" + (min % 60 < 10 ? "0" : "") + (min % 60);
    };
    var jetzt = new Date(), d = jetzt.getDay(), min = jetzt.getHours() * 60 + jetzt.getMinutes();
    var heute = plan[TAGE[d]] || [], gestern = plan[TAGE[(d + 6) % 7]] || [];
    var setze = function (zustand, text) { el.setAttribute("data-state", zustand); label.textContent = text; };

    var offenBis = null;
    heute.forEach(function (s) { if (min >= s[0] && min < s[1]) offenBis = s[1]; });
    gestern.forEach(function (s) { if (s[1] > 1440 && min + 1440 < s[1]) offenBis = s[1]; });
    if (offenBis !== null) {
      return offenBis - min <= 60
        ? setze("bald", "Schließt bald · um " + uhr(offenBis) + " Uhr")
        : setze("offen", "Jetzt geöffnet · bis " + uhr(offenBis) + " Uhr");
    }
    for (var i = 0; i < heute.length; i++) {
      if (heute[i][0] > min) {
        return heute[i][0] - min <= 60
          ? setze("bald", "Öffnet bald · um " + uhr(heute[i][0]) + " Uhr")
          : setze("zu", "Geschlossen · öffnet heute um " + uhr(heute[i][0]) + " Uhr");
      }
    }
    for (var k = 1; k <= 7; k++) {
      var tag = plan[TAGE[(d + k) % 7]] || [];
      if (tag.length) {
        return setze("zu", "Geschlossen · öffnet " + (k === 1 ? "morgen" : TAGE[(d + k) % 7]) + " um " + uhr(tag[0][0]) + " Uhr");
      }
    }
  }

  /* ---- Entwurf: Angebots-Pille nach dem Hero einblenden ----------------- */
  function initDemoPill() {
    var pill = document.querySelector("[data-demo-pill]");
    if (!pill) return;
    var hero = document.querySelector(".hero"), offer = document.getElementById("angebot");
    if (!("IntersectionObserver" in window) || !hero) { pill.classList.add("is-shown"); return; }
    var heroSichtbar = true, angebotSichtbar = false;
    var update = function () { pill.classList.toggle("is-shown", !heroSichtbar && !angebotSichtbar); };
    new IntersectionObserver(function (e) { heroSichtbar = e[0].isIntersecting; update(); }, { threshold: 0.2 }).observe(hero);
    if (offer) new IntersectionObserver(function (e) { angebotSichtbar = e[0].isIntersecting; update(); }).observe(offer);
  }
})();
