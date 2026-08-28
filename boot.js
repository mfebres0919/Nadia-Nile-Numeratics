/* ==========================================================================
   NILE NUMERATICS — BOOT SCRIPT
   Loaded SYNCHRONOUSLY from <head>, deliberately not deferred.

   Everything here has to run before the browser paints its first frame:
   `is-loading` arms the preloader curtain, and `js` gates the scroll-reveal
   styles that hide their content up front. Deferred (like main.js) both
   would land after the first paint, so the page would flash its unstyled
   hero before the curtain dropped over it.

   Keep this file tiny for the same reason — it blocks rendering.
   ========================================================================== */
(function () {
    var seen = false;
    try { seen = window.sessionStorage.getItem("nn-intro") === "1"; } catch (e) { seen = false; }
    document.documentElement.className += seen ? " js" : " js is-loading";
  }());
