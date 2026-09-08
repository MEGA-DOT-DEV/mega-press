import test from 'node:test';
import assert from 'node:assert/strict';
import { SEQUENCE_RECIPE, listRecipes, validateDocument, createController, sampleTransition } from './model.mjs';

const makeDocument = () => ({
  schemaVersion: 'press-lab/1', id: 'sequence_demo', revision: 1, recipe: 'sequence', title: 'A sequence',
  steps: [
    { id: 'start', title: 'Start', detail: 'First step' },
    { id: 'finish', title: 'Finish', detail: 'Last step' },
  ],
});
const controller = (instanceId = 'instance-a') => createController(makeDocument(), { instanceId });
const select = (targetId) => ({ type: 'focus.select', targetId });
const state = (selectedId) => ({ selectedId });
function assertFrozen(value) {
  if (value && typeof value === 'object') {
    assert.ok(Object.isFrozen(value));
    Object.values(value).forEach(assertFrozen);
  }
}
function invalid(mutator, code, path) {
  const document = makeDocument();
  mutator(document);
  const result = validateDocument(document);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.code === code && error.path === path), JSON.stringify(result));
  result.errors.forEach((error) => assert.deepEqual(Object.keys(error), ['code', 'path', 'message']));
}

test('authoritative, deterministic and immutable single-recipe catalogue', () => {
  assert.equal(SEQUENCE_RECIPE.id, 'sequence');
  assert.ok(SEQUENCE_RECIPE.title && SEQUENCE_RECIPE.purpose);
  assert.deepEqual(listRecipes(), [SEQUENCE_RECIPE]);
  assert.equal(listRecipes()[0], SEQUENCE_RECIPE);
  assert.equal(JSON.stringify(listRecipes()), JSON.stringify(listRecipes()));
  assertFrozen(listRecipes());
  assert.equal(SEQUENCE_RECIPE.schema.additionalProperties, false);
  assert.equal(SEQUENCE_RECIPE.schema.properties.steps.items.additionalProperties, false);
});

test('strict envelope, types, required fields and stable IDs', () => {
  for (const key of SEQUENCE_RECIPE.schema.required) invalid((d) => { delete d[key]; }, 'schema.required', `/${key}`);
  for (const key of ['id', 'title', 'detail']) invalid((d) => { delete d.steps[0][key]; }, 'schema.required', `/steps/0/${key}`);
  invalid((d) => { d.extra = true; }, 'schema.additionalProperties', '/extra');
  invalid((d) => { d.steps[0].extra = true; }, 'schema.additionalProperties', '/steps/0/extra');
  invalid((d) => { d.schemaVersion = 'press-lab/2'; }, 'schema.const', '/schemaVersion');
  invalid((d) => { d.recipe = 'other'; }, 'schema.const', '/recipe');
  for (const revision of [0, -1, 1.5, '1', null]) {
    invalid((d) => { d.revision = revision; }, typeof revision === 'number' && Number.isInteger(revision) ? 'schema.minimum' : 'schema.type', '/revision');
  }
  for (const id of ['', '1start', 'has space', 'éclair', 'a/b', 'a\n']) {
    invalid((d) => { d.id = id; }, 'schema.pattern', '/id');
    invalid((d) => { d.steps[0].id = id; }, 'schema.pattern', '/steps/0/id');
  }
  invalid((d) => { d.steps = {}; }, 'schema.type', '/steps');
  invalid((d) => { d.steps[0] = null; }, 'schema.type', '/steps/0');
  invalid((d) => { d.title = 12; }, 'schema.type', '/title');
  for (const input of [null, undefined, [], new Date(), NaN, Infinity, () => {}]) assert.equal(validateDocument(input).ok, false);
});

test('schema-derived count and text bounds, including blank-only rejection', () => {
  const { minItems, maxItems } = SEQUENCE_RECIPE.schema.properties.steps;
  for (const count of [minItems - 1, minItems, maxItems, maxItems + 1]) {
    const document = makeDocument();
    document.steps = Array.from({ length: count }, (_, i) => ({ ...document.steps[0], id: `step_${i}` }));
    assert.equal(validateDocument(document).ok, count >= minItems && count <= maxItems);
  }
  for (const [path, max, set] of [
    ['/title', 200, (d, value) => { d.title = value; }],
    ['/steps/0/title', 120, (d, value) => { d.steps[0].title = value; }],
    ['/steps/0/detail', 600, (d, value) => { d.steps[0].detail = value; }],
  ]) {
    for (const blank of ['', ' \n\t ', '\u2003']) invalid((d) => set(d, blank), 'schema.pattern', path);
    invalid((d) => set(d, 'x'.repeat(max + 1)), 'schema.maxLength', path);
    const document = makeDocument();
    set(document, '𝌆'.repeat(max));
    assert.equal(validateDocument(document).ok, true);
  }
  invalid((d) => { d.steps[1].id = d.steps[0].id; }, 'document.duplicateStepId', '/steps/1/id');
});

test('verbatim detached roundtrip, deep freezing without mutating original', () => {
  const original = makeDocument();
  original.title = '  Żółć — x-y / 10 ms  ';
  original.steps[0].detail = '  const x = "π";\n10px / 3.5 kg -- unchanged\t';
  const before = JSON.stringify(original);
  const result = validateDocument(original);
  assert.equal(result.ok, true);
  assert.deepEqual(result.document, original);
  assert.equal(JSON.stringify(result.document), before);
  assert.equal(JSON.stringify(original), before);
  assertFrozen(result.document);
  assert.equal(Object.isFrozen(original), false);
  assert.equal(Object.isFrozen(original.steps[0]), false);
  assert.notEqual(result.document.steps, original.steps);
  assert.notEqual(result.document.steps[0], original.steps[0]);
  original.steps[0].detail = 'caller can still edit';
  assert.notEqual(result.document.steps[0].detail, original.steps[0].detail);
  assert.throws(() => { result.document.steps[0].id = 'new'; }, TypeError);
});

test('named presentation choices share the schema, preserve source, and reject raw styling', () => {
  const fields = SEQUENCE_RECIPE.schema.properties.presentation.properties;
  for (const background of fields.background.enum) {
    for (const treatment of fields.treatment.enum) {
      const document = { ...makeDocument(), presentation: { background, treatment } };
      const result = validateDocument(document);
      assert.equal(result.ok, true);
      assert.deepEqual(result.document, document);
      assertFrozen(result.document.presentation);
    }
  }
  assert.equal(Object.hasOwn(validateDocument(makeDocument()).document, 'presentation'), false);
  for (const [key, value] of [['background', '#ff00ff'], ['background', 'url(https://example.com)'], ['treatment', 'anything']]) {
    invalid((d) => { d.presentation = { [key]: value }; }, 'schema.enum', `/presentation/${key}`);
  }
  for (const key of ['color', 'fontSize', 'x', 'halo', 'css']) {
    invalid((d) => { d.presentation = { [key]: 0 }; }, 'schema.additionalProperties', `/presentation/${key}`);
  }
});

test('non-JSON properties, holes, cycles and serialization hooks fail closed', () => {
  for (const mutate of [
    (d) => { d.self = d; }, (d) => { d.steps[0].extra = undefined; },
    (d) => { d[Symbol('hidden')] = 1; }, (d) => { d.steps.extra = true; },
    (d) => { delete d.steps[0]; }, (d) => { d.toJSON = () => makeDocument(); },
    (d) => { Object.defineProperty(d, 'title', { get() { throw new Error('must not run'); } }); },
  ]) {
    const document = makeDocument(); mutate(document);
    assert.equal(validateDocument(document).ok, false);
  }
});

test('no events on mount, subscription, reads, no-ops or invalid dispatch', () => {
  const c = controller(); const events = [];
  c.subscribe((event) => events.push(event));
  assert.deepEqual(c.getState(), state(null)); assertFrozen(c.getState());
  assert.deepEqual(c.dispatch({ type: 'focus.clear' }), { ok: true, changed: false });
  for (const action of [null, {}, { type: 'bogus' }, select('missing'), select(null), select(1),
    { type: 'focus.select' }, { type: 'step.next', extra: 1 }, { type: 'focus.clear', targetId: 'start' }]) {
    assert.equal(c.dispatch(action).ok, false);
  }
  for (const metadata of [null, {}, { source: 'unknown' }, { source: 'host', extra: true }]) {
    assert.equal(c.dispatch(select('start'), metadata).code, 'action.invalidSource');
  }
  assert.equal(c.dispatch({ get type() { throw new Error('must not run'); } }).ok, false);
  assert.equal(c.dispatch(select('start'), { get source() { throw new Error('must not run'); } }).ok, false);
  assert.deepEqual(events, []);
  c.dispatch(select('start'));
  assert.deepEqual(c.dispatch(select('start')), { ok: true, changed: false });
  assert.equal(events.length, 1);
});

test('exact events, commit-before-notify, sequence/source order and next cycling', () => {
  const c = controller(); const events = [];
  c.subscribe((event) => { assert.equal(c.getState(), event.next); events.push(event); });
  const first = c.dispatch({ type: 'step.next' }, { source: 'keyboard' });
  assert.deepEqual(first.event, {
    eventVersion: 1, schemaVersion: 'press-lab/1', artifactId: 'sequence_demo', revision: 1,
    instanceId: 'instance-a', sequence: 1, type: 'step.next', targetId: 'start', source: 'keyboard',
    previous: state(null), next: state('start'),
  });
  c.dispatch(select('finish'), { source: 'pointer' });
  c.dispatch({ type: 'step.next' }, { source: 'playback' });
  c.dispatch({ type: 'focus.clear' });
  assert.deepEqual(events.map((e) => [e.sequence, e.targetId, e.source]), [
    [1, 'start', 'keyboard'], [2, 'finish', 'pointer'], [3, 'start', 'playback'], [4, null, 'host'],
  ]);
  events.forEach(assertFrozen);
});

test('instance isolation, document snapshot and fail-closed construction', () => {
  const original = makeDocument();
  const a = createController(original, { instanceId: 'a' }); const b = controller('b');
  original.steps[0].id = 'mutated'; original.id = 'changed';
  assert.equal(a.dispatch(select('start')).event.artifactId, 'sequence_demo');
  assert.deepEqual(b.getState(), state(null));
  const event = b.dispatch(select('finish')).event;
  assert.equal(event.sequence, 1); assert.equal(event.instanceId, 'b');
  assert.deepEqual(a.getState(), state('start'));
  assert.throws(() => createController({}, { instanceId: 'a' }), { name: 'ControllerInputError', code: 'controller.invalidDocument' });
  for (const options of [undefined, {}, { instanceId: '' }, { instanceId: '  ' }, { instanceId: 1 }]) {
    assert.throws(() => createController(makeDocument(), options), { code: 'controller.invalidInstanceId' });
  }
});

test('unsubscribe and disposal are idempotent; post-disposal refusals are explicit', () => {
  const c = controller(); const events = [];
  const unsubscribe = c.subscribe((e) => events.push(e));
  c.dispatch(select('start')); unsubscribe(); unsubscribe();
  c.dispatch(select('finish')); c.dispose(); c.dispose();
  assert.equal(events.length, 1);
  assert.equal(c.dispatch({ type: 'step.next' }).code, 'controller.disposed');
  assert.deepEqual(c.getState(), state('finish'));
  assert.throws(() => c.subscribe(() => {}), { name: 'ControllerDisposedError', code: 'controller.disposed' });
  assert.throws(() => controller().subscribe(null), { name: 'ObserverInputError' });
});

test('reentrant dispatch is refused; throwing observers do not suppress others', () => {
  const c = controller(); const seen = []; const failures = []; const boom = new Error('observer broke');
  c.subscribe((e) => { seen.push(`a${e.sequence}`); failures.push(c.dispatch({ type: 'step.next' })); throw boom; });
  c.subscribe((e) => seen.push(`b${e.sequence}`));
  for (const id of ['start', 'finish']) {
    const result = c.dispatch(select(id));
    assert.equal(result.ok, true); assert.equal(result.changed, true);
    assert.deepEqual(result.observerErrors, [boom]);
    assert.deepEqual(c.getState(), state(id));
  }
  assert.deepEqual(seen, ['a1', 'b1', 'a2', 'b2']);
  assert.ok(failures.every((failure) => !failure.ok && failure.code === 'controller.reentrantDispatch'));
});

test('deterministic frozen emphasis samples, clamping and reduced motion', () => {
  const from = state(null); const to = state('start');
  for (const [input, progress] of [[-1, 0], [0, 0], [0.25, 0.25], [1, 1], [2, 1]]) {
    const expected = { fromId: null, toId: 'start', progress, settled: progress === 1 };
    assert.deepEqual(sampleTransition(from, to, input), expected);
    assert.deepEqual(sampleTransition(from, to, input), sampleTransition(from, to, input));
    assertFrozen(sampleTransition(from, to, input));
    assert.deepEqual(sampleTransition(from, to, input, { reducedMotion: true }), { ...expected, progress: 1, settled: true });
  }
  assert.deepEqual(sampleTransition(to, to, 0), { fromId: 'start', toId: 'start', progress: 0, settled: false });
  assert.equal(Object.isFrozen(from), false); assert.equal(Object.isFrozen(to), false);
  for (const progress of [NaN, Infinity, -Infinity, '0', undefined]) {
    assert.throws(() => sampleTransition(from, to, progress, { reducedMotion: true }), { name: 'TransitionInputError', code: 'transition.invalidInput' });
  }
  for (const bad of [null, {}, state(''), state('unknown target'), { selectedId: null, extra: true }]) {
    assert.throws(() => sampleTransition(bad, to, 0), { name: 'TransitionInputError' });
    assert.throws(() => sampleTransition(from, bad, 0), { name: 'TransitionInputError' });
  }
  for (const options of [null, { reducedMotion: 'true' }, { extra: true }, { get reducedMotion() { throw new Error('must not run'); } }]) {
    assert.throws(() => sampleTransition(from, to, 0, options), { name: 'TransitionInputError' });
  }
});
