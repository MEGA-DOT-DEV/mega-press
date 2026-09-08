// Experimental, JSON-only rich composition contract. Not a package export.
import { WAVE_REGIONS } from "./assets.mjs";
export const TONES = Object.freeze(["green", "violet", "cyan", "blue", "amber", "red", "neutral"]);
const fields = {
  stack: ["children"], columns: ["count", "children"],
  panel: ["title", "label", "children"],
  schema: ["title", "subtitle", "fields", "footer"],
  text: ["text", "runs"], code: ["text", "lang", "label"],
  table: ["headers", "rows"], metrics: ["items"], callout: ["text"],
  graph: ["rows", "edges"], trace: ["rounds"],
  asset: ["asset", "caption", "bindings"],
};
const fail = (message) => { throw new Error(message); };
const object = (value) => value && Object.getPrototypeOf(value) === Object.prototype;
const text = (value, label) => typeof value === "string" && value.trim() ? value : fail(`${label} needs text.`);
const array = (value, label) => Array.isArray(value) && value.length ? value : fail(`${label} needs items.`);
const exact = (value, keys, label) => {
  if (!object(value)) fail(`${label} must be an object.`);
  for (const key of Object.keys(value)) if (!keys.includes(key)) fail(`${label}: unsupported field ${key}.`);
};
function walk(value, fn) {
  if (!value || typeof value !== "object") return;
  fn(value);
  Object.values(value).forEach((child) => walk(child, fn));
}
export function deepFreeze(value) {
  walk(value, Object.freeze);
  return value;
}
export function validateExample(input) {
  let count = 0;
  const inspect = (value, depth = 0) => {
    if (++count > 16000 || depth > 30) fail("Composition resource limit exceeded.");
    if (["string", "boolean"].includes(typeof value) || value === null) return;
    if (typeof value === "number" && Number.isFinite(value)) return;
    if (!Array.isArray(value) && !object(value)) fail("Only plain JSON values are allowed.");
    const descriptors = Object.getOwnPropertyDescriptors(value);
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (Array.isArray(value) && key === "length") continue;
      if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) fail("Accessors/non-JSON properties are not allowed.");
      inspect(descriptor.value, depth + 1);
    }
    if (Object.getOwnPropertySymbols(value).length) fail("Symbols are not allowed.");
    if (Array.isArray(value) && Object.keys(value).length !== value.length) fail("Sparse or decorated arrays are not allowed.");
  };
  inspect(input);
  const value = structuredClone(input);
  exact(value, ["id", "title", "eyebrow", "description", "categories", "body", "proofs"], "Example");
  text(value.title, "Title"); text(value.description, "Description");
  const ids = new Set();
  const categories = new Set(array(value.categories, "Categories").map((category) => {
    exact(category, ["id", "label", "tone"], "Category");
    text(category.id, "Category ID"); text(category.label, "Category label");
    if (!TONES.includes(category.tone)) fail("Unknown category tone.");
    return category.id;
  }));
  if (categories.size !== value.categories.length) fail("Duplicate category ID.");
  walk(value.body, (node) => {
    if (node.id !== undefined) {
      if (!/^[a-z][a-z0-9-]*$/.test(node.id) || ids.has(node.id)) fail(`Invalid/duplicate target ID: ${node.id}`);
      ids.add(node.id);
    }
    if (node.category !== undefined && !categories.has(node.category)) fail(`Unknown category ${node.category}.`);
  });
  const runs = (items) => array(items, "Text runs").forEach((run) => {
    exact(run, ["text", "id", "category"], "Text run");
    if (typeof run.text !== "string") fail("A text run must preserve a string.");
  });
  const block = (node) => {
    if (!fields[node?.type]) fail(`Unsupported block ${node?.type}.`);
    exact(node, ["type", "id", "category", ...fields[node.type]], node.type);
    if (["stack", "columns", "panel"].includes(node.type)) array(node.children, node.type).forEach(block);
    if (node.type === "columns" && ![2, 3].includes(node.count)) fail("Columns must be 2 or 3.");
    if (node.type === "panel") text(node.title, "Panel title");
    if (node.type === "text") {
      if ((node.text !== undefined) === (node.runs !== undefined)) fail("Text needs exactly one source representation.");
      if (node.runs) runs(node.runs); else text(node.text, "Text");
    }
    if (["code", "callout"].includes(node.type)) text(node.text, node.type);
    if (node.type === "schema") {
      text(node.title, "Schema title");
      array(node.fields, "Schema fields").forEach((field) => {
        exact(field, ["id", "name", "type", "key", "nullable", "description"], "Schema field");
        text(field.id, "Field ID"); text(field.name, "Field name"); text(field.type, "Field type");
        if (field.key !== undefined && !["primary", "foreign"].includes(field.key)) fail("Unknown key kind.");
        if (field.nullable !== undefined && typeof field.nullable !== "boolean") fail("Nullable must be boolean.");
        if (field.key === "primary" && field.nullable) fail("Primary keys cannot be nullable in this study.");
      });
    }
    if (node.type === "table") {
      array(node.headers, "Table headers").forEach((v) => text(v, "Header"));
      array(node.rows, "Table rows").forEach((row) => {
        if (!Array.isArray(row) || row.length !== node.headers.length || row.some((v) => typeof v !== "string")) fail("Table rows must match their headers.");
      });
    }
    if (node.type === "metrics") array(node.items, "Metrics").forEach((item) => {
      exact(item, ["label", "value", "unit"], "Metric"); text(item.label, "Metric label"); text(item.unit, "Metric unit");
      if (!["number", "string"].includes(typeof item.value)) fail("Metric needs a value.");
    });
    if (node.type === "asset") {
      if (!["waveform", "gallery-capture"].includes(node.asset)) fail("Only registered local assets are available.");
      if (node.asset === "waveform") {
        exact(node.bindings, WAVE_REGIONS.map((region) => region.id), "SVG region bindings");
        for (const region of WAVE_REGIONS) {
          if (!categories.has(node.bindings[region.id])) fail("Every SVG region needs a known category.");
          const target = `${node.id}-${region.id}`;
          if (ids.has(target)) fail("SVG target collides with another authored ID.");
          ids.add(target);
        }
      }
    }
    if (node.type === "graph") {
      const targets = new Set();
      array(node.rows, "Graph rows").forEach((row) => array(row, "Graph row").forEach((child) => {
        if (!child.id) fail("Graph nodes need IDs.");
        block(child); walk(child, (entry) => { if (entry.id) targets.add(entry.id); });
      }));
      array(node.edges, "Graph edges").forEach((edge) => {
        exact(edge, ["id", "from", "to", "label", "category", "fromSide", "toSide"], "Edge");
        if (!targets.has(edge.from) || !targets.has(edge.to)) fail(`Dangling graph endpoint on ${edge.id}.`);
        if (edge.from === edge.to) fail("Self-loop routing is not implemented by this study.");
        text(edge.label, "Relation label");
        for (const side of [edge.fromSide, edge.toSide]) if (side !== undefined && !["left", "right", "top", "bottom"].includes(side)) fail("Unknown port face.");
      });
    }
    if (node.type === "trace") {
      const seen = new Set();
      array(node.rounds, "Trace rounds").forEach((round) => {
        exact(round, ["id", "title", "blocks", "note"], "Round"); text(round.title, "Round title");
        array(round.blocks, "Actor runs").forEach((run) => {
          exact(run, ["id", "actor", "outcome", "events"], "Actor run");
          if (!categories.has(run.actor)) fail("Unknown trace actor.");
          array(run.events, "Events").forEach((event) => {
            exact(event, ["id", "seq", "runs"], "Event"); runs(event.runs);
            const [start, end] = event.seq ?? [];
            if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start || end - start > 100) fail("Invalid event range.");
            for (let i = start; i <= end; i++) { if (seen.has(i)) fail("Overlapping event ranges."); seen.add(i); }
          });
        });
      });
    }
  };
  block(value.body);
  text(value.id, "Example ID");
  return deepFreeze(value);
}

export function targetsOf(example) {
  const ids = new Set(example.categories.map((category) => `category:${category.id}`));
  walk(example.body, (node) => {
    if (node.id) ids.add(node.id);
    if (node.type === "asset" && node.asset === "waveform") WAVE_REGIONS.forEach((region) => ids.add(`${node.id}-${region.id}`));
  });
  return ids;
}
export function transition(selectedId, targetId, targets) {
  if (targetId !== null && !targets.has(targetId)) return { ok: false, code: "UNKNOWN_TARGET" };
  return { ok: true, changed: selectedId !== targetId, previous: selectedId, next: targetId };
}
export function textOfRuns(runs) { return runs.map((run) => run.text).join(""); }
