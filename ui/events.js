(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.MarketReplayEvents = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  function delegateAction(event, routes = []) {
    if (!event?.target || typeof event.target.closest !== "function") return false;
    for (const route of routes) {
      if (!route?.selector || typeof route.handler !== "function") continue;
      const target = event.target.closest(route.selector);
      if (!target) continue;
      route.handler(target, event);
      return true;
    }
    return false;
  }

  function datasetValue(target, key, fallback = "") {
    const value = target?.dataset?.[key];
    return value === undefined || value === null ? fallback : value;
  }

  function bindDelegatedClick(element, routes = []) {
    if (!element || typeof element.addEventListener !== "function") return false;
    element.addEventListener("click", (event) => delegateAction(event, routes));
    return true;
  }

  return {
    delegateAction,
    datasetValue,
    bindDelegatedClick,
  };
});
