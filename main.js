/* ==========================================================================
   NILE NUMERATICS — SITE SCRIPT
   Loaded with `defer` from the bottom of <body>: never render-blocking.
   No libraries, no polyfills — vanilla only.
   ========================================================================== */
(function () {
  "use strict";

  var header   = document.getElementById("header");
  var toggle   = document.getElementById("nav-toggle");
  var nav      = document.getElementById("nav");
  var backdrop = document.getElementById("nav-backdrop");
  var DESKTOP  = window.matchMedia("(min-width: 64rem)");

  /* ------------------------------------------------------------------
     Header: swap to the solid state once the page leaves the hero top.
     rAF-throttled + passive so it never blocks scrolling.
     ------------------------------------------------------------------ */
  var toTop = document.getElementById("to-top");

  /* Nav link paired with the section it points at. Links whose target is not
     on this page are dropped, so a menu item for a section that does not
     exist yet cannot break the highlighting. */
  var spy = [].slice.call(document.querySelectorAll(".nav__link[href^='#']"))
    .map(function (link) {
      var target = document.querySelector(link.getAttribute("href"));
      return target ? { link: link, target: target } : null;
    })
    .filter(Boolean);

  /* Marks the section currently under the header as the active one. Measured
     from getBoundingClientRect rather than offsetTop: several sections sit
     inside wrappers, and offsetTop is relative to the nearest positioned
     ancestor, which would give the wrong figure for those. */
  var setActiveLink = function () {
    if (!spy.length) { return; }

    var offset  = header ? header.getBoundingClientRect().height : 0;
    var line    = window.scrollY + offset + 12;
    var current = spy[0];

    spy.forEach(function (pair) {
      var top = pair.target.getBoundingClientRect().top + window.scrollY;
      if (top <= line) { current = pair; }
    });

    /* Pin to the last section once the page bottom is reached — a short
       final section can never cross the line on its own, so without this the
       last link would never light up. */
    if (window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2) {
      current = spy[spy.length - 1];
    }

    spy.forEach(function (pair) {
      if (pair === current) {
        pair.link.setAttribute("aria-current", "true");
      } else {
        pair.link.removeAttribute("aria-current");
      }
    });
  };

  var ticking = false;

  var onScroll = function () {
    if (header) { header.classList.toggle("is-scrolled", window.scrollY > 40); }
    if (toTop)  { toTop.classList.toggle("is-visible", window.scrollY > 600); }
    setActiveLink();
    ticking = false;
  };

  window.addEventListener("scroll", function () {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(onScroll);
    }
  }, { passive: true });

  /* Section offsets move when the layout reflows, so recompute on resize. */
  window.addEventListener("resize", setActiveLink, { passive: true });
  onScroll();

  /* ------------------------------------------------------------------
     Back to top
     ------------------------------------------------------------------ */
  if (toTop) {
    toTop.addEventListener("click", function () {
      /* No behavior option: html has scroll-behavior: smooth, and the
         reduced-motion block overrides it to auto. Passing "smooth" here
         would ignore that preference. */
      window.scrollTo({ top: 0 });

      /* Move focus with the viewport, or a keyboard user carries on tabbing
         from the footer they just left. */
      if (header) {
        header.tabIndex = -1;
        header.focus({ preventScroll: true });
      }
    });
  }

  /* ------------------------------------------------------------------
     Mobile navigation drawer
     ------------------------------------------------------------------ */
  if (toggle && nav && backdrop) {

    var openMenu = function () {
      nav.classList.add("is-open");
      backdrop.hidden = false;
      /* Next frame, so the transition has a starting state to animate from. */
      window.requestAnimationFrame(function () {
        backdrop.classList.add("is-open");
      });
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Close menu");
      document.body.classList.add("scroll-lock");
    };

    var closeMenu = function (returnFocus) {
      nav.classList.remove("is-open");
      backdrop.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
      document.body.classList.remove("scroll-lock");
      if (returnFocus) { toggle.focus(); }
    };

    var isOpen = function () {
      return toggle.getAttribute("aria-expanded") === "true";
    };

    /* Hide the backdrop from the a11y tree only after it has faded out. */
    backdrop.addEventListener("transitionend", function (e) {
      if (e.propertyName === "opacity" && !backdrop.classList.contains("is-open")) {
        backdrop.hidden = true;
      }
    });

    toggle.addEventListener("click", function () {
      isOpen() ? closeMenu(false) : openMenu();
    });

    backdrop.addEventListener("click", function () { closeMenu(true); });

    /* Close after tapping a link so anchor scrolling is visible. */
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a") && isOpen()) { closeMenu(false); }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen()) { closeMenu(true); }
    });

    /* Keep tab focus inside the drawer while it is open. */
    nav.addEventListener("keydown", function (e) {
      if (e.key !== "Tab" || !isOpen()) { return; }

      var items = nav.querySelectorAll("a[href], button:not([disabled])");
      if (!items.length) { return; }

      var first = items[0];
      var last  = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });

    /* Reset cleanly if the viewport grows past the mobile breakpoint. */
    var onBreakpoint = function (e) {
      if (e.matches && isOpen()) { closeMenu(false); }
    };

    if (DESKTOP.addEventListener) {
      DESKTOP.addEventListener("change", onBreakpoint);
    } else if (DESKTOP.addListener) {
      DESKTOP.addListener(onBreakpoint);
    }
  }

  /* ------------------------------------------------------------------
     Curriculum tabs

     Standard ARIA tab pattern. Only the selected tab is in the tab order
     (roving tabindex) — the arrow keys move between tabs, which is what a
     screen reader user expects here and is why Tab does not cycle all five.
     The markup ships with the first panel open, so with this script absent
     the section still reads as a complete block of content.
     ------------------------------------------------------------------ */
  var tablist = document.querySelector(".tracks");
  var selectTrack = null;   /* Assigned below; used by the footer links. */

  if (tablist) {
    var tabs = [].slice.call(tablist.querySelectorAll("[role='tab']"));

    var panelFor = function (tab) {
      return document.getElementById(tab.getAttribute("aria-controls"));
    };

    var select = function (tab, moveFocus) {
      tabs.forEach(function (item) {
        var current = item === tab;
        var panel   = panelFor(item);

        item.classList.toggle("is-active", current);
        item.setAttribute("aria-selected", current ? "true" : "false");
        item.tabIndex = current ? 0 : -1;
        if (panel) { panel.hidden = !current; }
      });

      if (moveFocus) { tab.focus(); }
    };

    selectTrack = select;

    tablist.addEventListener("click", function (e) {
      var tab = e.target.closest("[role='tab']");
      if (tab) { select(tab, false); }
    });

    tablist.addEventListener("keydown", function (e) {
      var index = tabs.indexOf(e.target);
      if (index === -1) { return; }

      var next = null;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        next = tabs[(index + 1) % tabs.length];
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        next = tabs[(index - 1 + tabs.length) % tabs.length];
      } else if (e.key === "Home") {
        next = tabs[0];
      } else if (e.key === "End") {
        next = tabs[tabs.length - 1];
      }

      if (next) {
        e.preventDefault();
        select(next, true);
      }
    });
  }

  /* ------------------------------------------------------------------
     Footer curriculum links

     Each carries data-track naming the tab it should open. The href stays
     #curriculum so the anchor still scrolls on its own — this only opens the
     matching panel on the way, and still degrades to a plain jump link if
     the tablist is missing.
     ------------------------------------------------------------------ */
  document.addEventListener("click", function (e) {
    var link = e.target.closest("[data-track]");
    if (!link || !selectTrack) { return; }

    var tab = document.getElementById("tab-" + link.getAttribute("data-track"));
    if (tab) { selectTrack(tab, false); }
  });

  /* ------------------------------------------------------------------
     Footer year

     The markup ships with the current year hard-coded, so this only has to
     correct it once the calendar rolls over — with the script absent the
     footer still reads sensibly rather than showing an empty gap.
     ------------------------------------------------------------------ */
  var year = document.getElementById("footer-year");
  if (year) { year.textContent = String(new Date().getFullYear()); }

  /* ------------------------------------------------------------------
     Scroll reveal

     Any [data-reveal-group] hands its children a .is-revealed class as the
     group scrolls into view; the stagger itself is a CSS transition-delay
     keyed off each child's --i. Elements are unobserved once shown, so the
     motion plays once rather than replaying on every pass.

     The hidden start state lives behind html.js AND a no-preference media
     query, so if either the script or the observer is missing the content is
     simply visible from the outset.
     ------------------------------------------------------------------ */
  var groups = document.querySelectorAll("[data-reveal-group]");

  if (groups.length) {
    var CALM = window.matchMedia("(prefers-reduced-motion: reduce)");

    var revealAll = function () {
      Array.prototype.forEach.call(groups, function (group) {
        Array.prototype.forEach.call(group.children, function (child) {
          child.classList.add("is-revealed");
        });
      });
    };

    if (CALM.matches || !("IntersectionObserver" in window)) {
      revealAll();
    } else {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) { return; }
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        });
      }, { rootMargin: "0px 0px -12% 0px", threshold: 0.1 });

      Array.prototype.forEach.call(groups, function (group) {
        Array.prototype.forEach.call(group.children, function (child) {
          observer.observe(child);
        });
      });
    }
  }
}());
