/* Start wspólnych elementów po wczytaniu wszystkich modułów. */
(function () {
  "use strict";
  if (!window.BondUI) return;
  window.BondUI.initTabs();
  window.BondUI.initHeaderActions();
  window.BondUI.initTooltips();
  window.BondUI.initPwa();
})();
