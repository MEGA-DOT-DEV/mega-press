import test from "node:test";
import assert from "node:assert/strict";
import { FIXTURES } from "./fixtures.mjs";
import { createController, validateDocument } from "./model.mjs";

for (const fixture of FIXTURES) {
  test(`fixture: ${fixture.document.id} validates and preserves every authored field`, () => {
    const before = JSON.stringify(fixture.document);
    const validated = validateDocument(fixture.document);
    assert.equal(validated.ok, true, JSON.stringify(validated.errors));
    assert.equal(JSON.stringify(validated.document), before);
    assert.equal(JSON.stringify(fixture.document), before);
  });
}

test("the same recipe covers technical and nontechnical subjects", () => {
  assert.equal(new Set(FIXTURES.map((fixture) => fixture.document.recipe)).size, 1);
  assert.equal(new Set(FIXTURES.map((fixture) => fixture.document.id)).size, FIXTURES.length);
});

test("fixture interaction events carry stable targets but not source prose", () => {
  for (const fixture of FIXTURES) {
    const { document } = validateDocument(fixture.document);
    const controller = createController(document, { instanceId: `test-${document.id}` });
    const events = [];
    controller.subscribe((event) => events.push(event));
    for (const step of document.steps) controller.dispatch({ type: "step.next" }, { source: "keyboard" });
    assert.deepEqual(events.map((event) => event.targetId), document.steps.map((step) => step.id));
    assert.deepEqual(events.map((event) => event.sequence), [1, 2, 3, 4]);
    assert.ok(events.every((event) => event.source === "keyboard"));
    const serialized = JSON.stringify(events);
    for (const step of document.steps) assert.equal(serialized.includes(step.detail), false);
    controller.dispose();
  }
});
