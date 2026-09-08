// Private, single-recipe proof. Not a package API or a full JSON Schema engine.
const freeze = (value) => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const plainObject = (value) => value !== null && typeof value === 'object'
  && [Object.prototype, null].includes(Object.getPrototypeOf(value))
  && Reflect.ownKeys(value).every((key) => {
    const property = Object.getOwnPropertyDescriptor(value, key);
    return typeof key === 'string' && property?.enumerable && Object.hasOwn(property, 'value');
  });
const exactKeys = (value, keys) => plainObject(value)
  && Reflect.ownKeys(value).length === keys.length
  && keys.every((key) => Object.hasOwn(value, key));
// The final assertion avoids JavaScript's special "$ before final newline" case.
const slug = { type: 'string', pattern: '^[a-zA-Z][a-zA-Z0-9_-]*$(?![\\s\\S])' };
const text = (maxLength) => ({ type: 'string', minLength: 1, maxLength, pattern: '\\S' });

export const SEQUENCE_RECIPE = freeze({
  id: 'sequence',
  title: 'Sequence',
  purpose: 'Explore explicit selection and deterministic emphasis across ordered steps.',
  schema: {
    type: 'object', additionalProperties: false,
    required: ['schemaVersion', 'id', 'revision', 'recipe', 'title', 'steps'],
    properties: {
      schemaVersion: { const: 'press-lab/1' }, id: slug,
      revision: { type: 'integer', minimum: 1 }, recipe: { const: 'sequence' },
      title: text(200),
      // Optional named choices; the first entry is the presentation default.
      // Defaults are resolved by the view, never inserted into authored input.
      presentation: {
        type: 'object', additionalProperties: false,
        properties: {
          background: { type: 'string', enum: ['quiet', 'blueprint', 'field'] },
          treatment: { type: 'string', enum: ['registered', 'plain'] },
        },
      },
      steps: {
        type: 'array', minItems: 2, maxItems: 6,
        items: {
          type: 'object', additionalProperties: false, required: ['id', 'title', 'detail'],
          properties: { id: slug, title: text(120), detail: text(600) },
        },
      },
    },
  },
});
const catalogue = freeze([SEQUENCE_RECIPE]);
export const listRecipes = () => catalogue;
const pointer = (path, key) => `${path}/${String(key).replaceAll('~', '~0').replaceAll('/', '~1')}`;

// Only the descriptor's keywords are supported. This is deliberately private.
function check(schema, value, path, errors) {
  const fail = (keyword, message, at = path) => errors.push({ code: `schema.${keyword}`, path: at, message });
  if (Object.hasOwn(schema, 'const') && value !== schema.const) fail('const', `Expected ${schema.const}.`);
  if (schema.enum && !schema.enum.includes(value)) fail('enum', `Expected one of: ${schema.enum.join(', ')}.`);
  if (schema.type) {
    const valid = schema.type === 'object' ? plainObject(value)
      : schema.type === 'array' ? Array.isArray(value)
        : schema.type === 'integer' ? Number.isInteger(value) : typeof value === schema.type;
    if (!valid) { fail('type', `Expected ${schema.type}.`); return; }
  }
  if (schema.type === 'object') {
    for (const key of schema.required ?? []) {
      if (!Object.hasOwn(value, key)) fail('required', 'Required field is missing.', pointer(path, key));
    }
    for (const key of Reflect.ownKeys(value)) {
      if (!Object.hasOwn(schema.properties, key)) {
        if (schema.additionalProperties === false) fail('additionalProperties', 'Unknown field.', pointer(path, key));
      } else {
        check(schema.properties[key], value[key], pointer(path, key), errors);
      }
    }
  }
  if (schema.type === 'array') {
    if (value.length < schema.minItems) fail('minItems', `Expected at least ${schema.minItems} items.`);
    if (value.length > schema.maxItems) fail('maxItems', `Expected at most ${schema.maxItems} items.`);
    for (let index = 0; index < value.length; index++) check(schema.items, value[index], pointer(path, index), errors);
    for (const key of Reflect.ownKeys(value)) {
      if (key !== 'length' && !(typeof key === 'string' && /^(0|[1-9]\d*)$/.test(key) && Number(key) < value.length)) {
        fail('type', 'Expected a JSON array without custom fields.', pointer(path, key));
      }
    }
  }
  if (schema.type === 'string') {
    const length = [...value].length; // JSON Schema lengths count Unicode code points.
    if (length < schema.minLength) fail('minLength', `Expected at least ${schema.minLength} characters.`);
    if (length > schema.maxLength) fail('maxLength', `Expected at most ${schema.maxLength} characters.`);
    if (schema.pattern && !new RegExp(schema.pattern, 'u').test(value)) fail('pattern', 'Text does not match the required pattern.');
  }
  if (schema.minimum !== undefined && value < schema.minimum) fail('minimum', `Expected at least ${schema.minimum}.`);
}

export function validateDocument(input) {
  const errors = [];
  // Snapshot first so validation and the returned document describe identical data.
  // Reject non-JSON data instead of allowing JSON.stringify to silently drop it.
  function clone(value, path = '', ancestors = new Set()) {
    if (value === null || ['string', 'boolean'].includes(typeof value)) return value;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if ((!plainObject(value) && !Array.isArray(value)) || ancestors.has(value)) throw new Error(`Non-JSON data at ${path || '/'}.`);
    const next = new Set(ancestors).add(value);
    const copy = Array.isArray(value) ? new Array(value.length) : {};
    for (const key of Reflect.ownKeys(value)) {
      if (Array.isArray(value) && key === 'length') continue;
      const property = Object.getOwnPropertyDescriptor(value, key);
      if (typeof key !== 'string' || !property.enumerable || !Object.hasOwn(property, 'value')) throw new Error(`Non-JSON property at ${path || '/'}.`);
      Object.defineProperty(copy, key, { value: clone(property.value, pointer(path, key), next), enumerable: true, writable: true, configurable: true });
    }
    return copy;
  }
  let document;
  try { document = clone(input); }
  catch (error) { return { ok: false, errors: [{ code: 'document.nonJson', path: '', message: error.message }] }; }
  check(SEQUENCE_RECIPE.schema, document, '', errors);
  if (errors.length === 0) {
    const ids = new Set();
    document.steps.forEach((step, index) => {
      if (ids.has(step.id)) errors.push({ code: 'document.duplicateStepId', path: `/steps/${index}/id`, message: 'Step IDs must be unique.' });
      ids.add(step.id);
    });
  }
  return errors.length ? { ok: false, errors } : { ok: true, document: freeze(document) };
}

const refusal = (code, message) => ({ ok: false, code, message });
function namedError(name, code, message) {
  return Object.assign(new Error(message), { name, code });
}

export function createController(validatedDocument, options) {
  const result = validateDocument(validatedDocument);
  if (!result.ok) throw namedError('ControllerInputError', 'controller.invalidDocument', 'A valid sequence document is required.');
  if (!exactKeys(options, ['instanceId']) || typeof options.instanceId !== 'string' || !/\S/u.test(options.instanceId)) {
    throw namedError('ControllerInputError', 'controller.invalidInstanceId', 'An explicit nonblank instanceId is required.');
  }
  const { document } = result;
  const { instanceId } = options;
  const ids = document.steps.map((step) => step.id);
  const listeners = new Set();
  let state = freeze({ selectedId: null });
  let sequence = 0;
  let disposed = false;
  let notifying = false;
  return Object.freeze({
    getState: () => state,
    dispatch(action, metadata = { source: 'host' }) {
      if (disposed) return refusal('controller.disposed', 'Controller has been disposed.');
      if (notifying) return refusal('controller.reentrantDispatch', 'Dispatch during observer notification is refused.');
      if (!plainObject(action) || !['focus.select', 'focus.clear', 'step.next'].includes(action.type)) {
        return refusal('action.unknownType', 'Unknown action type.');
      }
      if (!exactKeys(action, action.type === 'focus.select' ? ['type', 'targetId'] : ['type'])) {
        return refusal('action.invalidShape', 'Unexpected or missing action fields.');
      }
      if (!exactKeys(metadata, ['source']) || !['pointer', 'keyboard', 'host', 'playback'].includes(metadata.source)) {
        return refusal('action.invalidSource', 'An explicit supported source is required.');
      }
      if (action.type === 'focus.select' && !ids.includes(action.targetId)) {
        return refusal('action.unknownTarget', 'Target must identify a step in this document.');
      }
      const selectedId = action.type === 'focus.clear' ? null
        : action.type === 'focus.select' ? action.targetId : ids[(ids.indexOf(state.selectedId) + 1) % ids.length];
      if (selectedId === state.selectedId) return { ok: true, changed: false };
      const previous = state;
      state = freeze({ selectedId });
      const event = freeze({
        eventVersion: 1, schemaVersion: document.schemaVersion, artifactId: document.id,
        revision: document.revision, instanceId, sequence: ++sequence,
        type: action.type, targetId: selectedId, source: metadata.source, previous, next: state,
      });
      const observerErrors = [];
      notifying = true;
      try {
        for (const listener of [...listeners]) {
          if (!listeners.has(listener)) continue;
          try { listener(event); } catch (error) { observerErrors.push(error); }
        }
      } finally { notifying = false; }
      // Synchronous observers only; failures never roll back or stop observers.
      return { ok: true, changed: true, event, ...(observerErrors.length ? { observerErrors } : {}) };
    },
    subscribe(listener) {
      if (disposed) throw namedError('ControllerDisposedError', 'controller.disposed', 'Cannot subscribe after disposal.');
      if (typeof listener !== 'function') throw namedError('ObserverInputError', 'observer.invalidListener', 'Listener must be a function.');
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    dispose() { disposed = true; listeners.clear(); },
  });
}

// Emphasis progress only: no layout, geometry, timing loop, or video renderer.
// Settled means sampled progress is 1, even when fromId and toId are identical.
export function sampleTransition(fromState, toState, progress, options = {}) {
  const validState = (state) => exactKeys(state, ['selectedId']) && (state.selectedId === null
    || (typeof state.selectedId === 'string' && new RegExp(slug.pattern, 'u').test(state.selectedId)));
  if (!validState(fromState) || !validState(toState) || !Number.isFinite(progress)
    || !plainObject(options) || Reflect.ownKeys(options).some((key) => key !== 'reducedMotion')
    || (options.reducedMotion !== undefined && typeof options.reducedMotion !== 'boolean')) {
    throw namedError('TransitionInputError', 'transition.invalidInput', 'Expected selection states, finite progress, and optional boolean reducedMotion.');
  }
  const sampled = options.reducedMotion === true ? 1 : Math.max(0, Math.min(1, progress));
  return freeze({ fromId: fromState.selectedId, toId: toState.selectedId, progress: sampled, settled: sampled === 1 });
}
