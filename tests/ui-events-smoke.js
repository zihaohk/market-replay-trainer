const events = require("../ui/events.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function makeTarget(matches = {}) {
  return {
    closest(selector) {
      return matches[selector] || null;
    },
  };
}

const calls = [];
const exportButton = { dataset: {} };
const event = { target: makeTarget({ "[data-export-review]": exportButton }) };
const handled = events.delegateAction(event, [
  { selector: "[data-start-remediation]", handler: () => calls.push("wrong") },
  { selector: "[data-export-review]", handler: (target) => calls.push(target === exportButton ? "export" : "bad-target") },
]);
assert(handled, "delegateAction should report handled events");
assert(calls.join(",") === "export", "delegateAction should call the matching route");

const first = { dataset: { action: "first" } };
const second = { dataset: { action: "second" } };
events.delegateAction({ target: makeTarget({ ".first": first, ".second": second }) }, [
  { selector: ".first", handler: (target) => calls.push(events.datasetValue(target, "action")) },
  { selector: ".second", handler: (target) => calls.push(events.datasetValue(target, "action")) },
]);
assert(calls.at(-1) === "first", "delegateAction should use the first matching route");

const missingHandled = events.delegateAction({ target: makeTarget({}) }, [
  { selector: ".missing", handler: () => calls.push("missing") },
]);
assert(!missingHandled, "delegateAction should return false when no route matches");
assert(events.datasetValue({}, "none", "fallback") === "fallback", "datasetValue should use fallback for missing values");

let listener = null;
const element = {
  addEventListener(type, handler) {
    if (type === "click") listener = handler;
  },
};
assert(events.bindDelegatedClick(element, [{ selector: ".run", handler: () => calls.push("bound") }]), "bindDelegatedClick should bind valid elements");
listener({ target: makeTarget({ ".run": { dataset: {} } }) });
assert(calls.at(-1) === "bound", "bound delegated click should route actions");
assert(!events.bindDelegatedClick(null, []), "bindDelegatedClick should reject missing elements");
