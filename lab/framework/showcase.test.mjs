import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createCanvas } from "@napi-rs/canvas";
import { evaluateSpec } from "../../src/evaluate.js";
import { withPressTheme } from "../../src/theme.js";
import { FRAME } from "../../src/tokens.js";
import { createController, validateDocument } from "./model.mjs";
import { SHOWCASE, exampleChrome, exampleSpec, sequenceDocument } from "./showcase-fixtures.mjs";

// Match the producer's headless geometry test environment; no browser renderer
// is mocked into a passing result. Screenshot/browser checks are separate.
const previousCanvas = globalThis.OffscreenCanvas;
globalThis.OffscreenCanvas = class {
  constructor(width, height) { this.canvas = createCanvas(width, height); }
  getContext(type) { return this.canvas.getContext(type); }
};
after(() => {
  if (previousCanvas === undefined) delete globalThis.OffscreenCanvas;
  else globalThis.OffscreenCanvas = previousCanvas;
});
const texts = (result) => result.plate.nodes.filter((node) => node.kind === "text");
const prepare = (example, title = !example.hideTitle, selected = null) =>
  withPressTheme({ chrome: exampleChrome(example, title) }, () => evaluateSpec(exampleSpec(example, selected)));

for (const example of SHOWCASE) {
  for (const showTitle of [true, false]) {
    test(`${example.id}: exact ${example.spec.frame}, title ${showTitle ? "visible" : "hidden"}`, () => {
      const before = JSON.stringify(example);
      const result = prepare(example, showTitle);
      assert.equal(result.ok, true, JSON.stringify(result.errors));
      assert.equal(result.plate.frame.w, FRAME[example.spec.frame].w);
      assert.equal(result.plate.frame.h, FRAME[example.spec.frame].h);
      assert.equal(texts(result).some((node) => node.isTitle), showTitle);
      if (showTitle) assert.ok(texts(result).some((node) => node.isTitle && node.text === example.spec.title));
      assert.equal(JSON.stringify(example), before);
      assert.equal(Object.isFrozen(example.spec.body), true);
    });
  }
}

test("the collection covers four inherited frames and three genuinely different combinations", () => {
  assert.equal(SHOWCASE.filter((example) => example.origin).length, 4);
  assert.equal(SHOWCASE.filter((example) => !example.origin).length, 3);
  assert.equal(new Set(SHOWCASE.map((example) => example.id)).size, 7);
  assert.deepEqual([...new Set(SHOWCASE.map((example) => example.spec.frame))].sort(), ["landscape", "portrait", "square"]);
  assert.equal(SHOWCASE.find((example) => example.id === "free-hour").hideTitle, true);
});

test("authored labels, prose, units and values survive component preparation verbatim", () => {
  const authoredKeys = new Set(["name", "detail", "title", "label", "content", "text", "attribution", "caption", "unit", "x", "y", "value"]);
  function collect(node, values = []) {
    if (!node || typeof node !== "object") return values;
    for (const [key, value] of Object.entries(node)) {
      if (authoredKeys.has(key) && ["string", "number"].includes(typeof value)) values.push(String(value));
      else if (value && typeof value === "object") collect(value, values);
    }
    return values;
  }
  for (const example of SHOWCASE) {
    const rendered = texts(prepare(example, true)).map((node) => String(node.text));
    for (const value of [...collect(example.spec.body), ...collect(example.spec.aside)]) {
      assert.ok(rendered.includes(value), `${example.id}: missing or altered ${JSON.stringify(value)}`);
    }
  }
});

test("garden selection uses the existing strict sequence document and never rewrites copy", () => {
  const example = SHOWCASE.find((entry) => entry.id === "garden");
  const document = sequenceDocument(example);
  assert.equal(validateDocument(document).ok, true);
  const original = JSON.stringify(example.spec);
  const originalTexts = texts(prepare(example)).map((node) => node.text);
  for (const id of [null, ...example.stepIds]) {
    const candidate = exampleSpec(example, id);
    assert.equal(candidate.body.children[0].activeTo, example.stepIds.indexOf(id));
    for (const title of [true, false]) {
      const result = prepare(example, title, id);
      assert.equal(result.ok, true, JSON.stringify(result.errors));
      if (title) assert.deepEqual(texts(result).map((node) => node.text), originalTexts);
    }
  }
  assert.equal(JSON.stringify(example.spec), original);
  assert.throws(() => exampleSpec(example, "missing"), /Unknown step ID/);
});

test("two gallery instances remain independent; paint/title changes and no-ops emit nothing", () => {
  const example = SHOWCASE.find((entry) => entry.id === "garden");
  const first = createController(sequenceDocument(example), { instanceId: "gallery-a" });
  const second = createController(sequenceDocument(example), { instanceId: "gallery-b" });
  const events = [];
  first.subscribe((event) => events.push(event));
  assert.equal(events.length, 0);
  first.dispatch({ type: "focus.select", targetId: "choose" }, { source: "keyboard" });
  assert.equal(second.getState().selectedId, null);
  prepare(example, false, first.getState().selectedId);
  prepare(example, true, first.getState().selectedId);
  first.dispatch({ type: "focus.select", targetId: "choose" }, { source: "pointer" });
  assert.equal(events.length, 1);
  assert.equal(events[0].instanceId, "gallery-a");
  assert.equal(events[0].targetId, "choose");
  assert.equal(events[0].source, "keyboard");
  first.dispose(); second.dispose();
  assert.equal(first.dispatch({ type: "step.next" }).code, "controller.disposed");
});
