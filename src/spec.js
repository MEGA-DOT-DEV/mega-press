/**
 * PRESS / spec
 *
 * A plate declared as JSON, compiled into the same node tree an author would
 * write by hand.
 *
 * This exists because an agent should not have to write JavaScript to make a
 * slide. It emits JSON, and every constraint in the system still applies,
 * because the compiler does nothing except call the same component functions.
 * There is no second code path and therefore no second set of rules: a spec
 * that would produce an invalid plate fails in exactly the same place, with
 * exactly the same message, as hand-written source.
 *
 * The shape:
 *
 *   {
 *     "id": "01-migration-sequence",
 *     "frame": "landscape",              // landscape | portrait | square
 *     "kicker": "optional utility label above the title",
 *     "number": "optional frame number, upper right",
 *     "title": "optional claim; hosts may keep it and not paint it",
 *     "lead": "optional single line under the title",
 *     "footnote": "optional, prints right of the mega.dev footer",
 *     "gap": 4,                          // optional root rhythm, space step
 *     "layout": "stacked",               // optional named composition
 *     "background": { ... },             // optional ground behind the content
 *     "aside": { ... },                  // optional attachment beside the body
 *     "body": { "type": "railSteps", "items": [ ... ] }
 *   }
 *
 * `body` is one node. A node is `{ "type": "<component>", ...its params }`, and
 * any parameter that takes nodes takes nodes of the same shape, so two
 * components compose through `stack` or `row`.
 */

import { definePlate } from "./plate.js";
import { COMPONENT_NAMES, lookup } from "./registry.js";
import { CATEGORY_TONES, categoryColor, categoryGround } from "./theme.js";
import { CATEGORY_EXCLUSIONS, PressError } from "./tokens.js";

/** Fields the chase owns. Anything else at the top level is a mistake. */
const PLATE_FIELDS = new Set([
	"schemaVersion",
	"categories",
	"id",
	"frame",
	"kicker",
	"number",
	"title",
	"lead",
	"footnote",
	"gap",
	"layout",
	"ratio",
	"align",
	"asideSide",
	"readout",
	"background",
	"aside",
	"body",
	"marks",
	"notes",
	"steppedFrom",
]);

import { ANNOTATION_TREATMENTS } from "./annotation.js";

export class SpecError extends Error {
	constructor(message, path) {
		super(path ? `${path}: ${message}` : message);
		this.name = "SpecError";
		this.code = "BAD_SPEC";
		this.path = path;
	}
}

export const COMPOSITION_VERSION = "press-composition/1";

/** The composition envelope uses the existing component registry, not a second
 * recipe catalogue. Constructors still own their domain-specific validation.
 */
export function validateComposition(spec) {
	let visited = 0;
	function json(value, depth = 0) {
		if (++visited > 20000 || depth > 32) throw new SpecError("composition resource limit exceeded.");
		if (value === null || typeof value === "string" || typeof value === "boolean") return;
		if (typeof value === "number" && Number.isFinite(value)) return;
		if (!value || typeof value !== "object" || (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype)) throw new SpecError("composition must contain plain JSON values.");
		if (Object.getOwnPropertySymbols(value).length) throw new SpecError("symbols are not JSON.");
		const descriptors = Object.getOwnPropertyDescriptors(value);
		for (const [key, entry] of Object.entries(descriptors)) {
			if (Array.isArray(value) && key === "length") continue;
			if (!entry.enumerable || !("value" in entry)) throw new SpecError("accessors/non-JSON properties are not allowed.");
			json(entry.value, depth + 1);
		}
		if (Array.isArray(value) && Object.keys(value).length !== value.length) throw new SpecError("sparse/decorated arrays are not JSON arrays.");
	}
	json(spec);
	if (spec.schemaVersion !== COMPOSITION_VERSION) throw new SpecError(`unsupported composition version "${spec.schemaVersion}".`);
	if (typeof spec.id !== "string" || !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(spec.id)) throw new SpecError("composition id must be a stable slug.");
	if (spec.frame !== undefined && !["landscape", "square", "portrait", "reading"].includes(spec.frame)) throw new SpecError("unknown composition frame.");
	const categories = new Set();
	if (spec.categories !== undefined && !Array.isArray(spec.categories)) throw new SpecError("categories must be an array.");
	for (const c of spec.categories || []) {
		if (!c || Object.keys(c).some(k => !["id", "label", "tone", "treatment", "description"].includes(k)) || typeof c.id !== "string" || !c.id || categories.has(c.id) || typeof c.label !== "string" || !c.label.trim() || !Object.hasOwn(CATEGORY_TONES, c.tone)) throw new SpecError("categories need unique IDs, labels and named tones.");
		if (c.treatment !== undefined && !ANNOTATION_TREATMENTS.includes(c.treatment)) throw new SpecError("unknown category treatment.");
		if (c.description !== undefined && (typeof c.description !== "string" || !c.description.trim())) throw new SpecError("category descriptions must be nonempty text.");
		categories.add(c.id);
	}
	const tones = new Set((spec.categories || []).map(category => category.tone));
	for (const pair of CATEGORY_EXCLUSIONS) if (pair.every(tone => tones.has(tone))) {
		throw new PressError("CATEGORY_CONFLICT", `${pair.join(" and ")} must not share one composition. Choose a distinct named category; no tone was remapped.`, { tones: [...pair] });
	}
	const ids = new Set();
	function claimId(id, path) {
		if (typeof id !== "string" || !id.trim() || ids.has(id)) throw new SpecError("component and occurrence IDs must be unique nonempty strings.", path);
		ids.add(id);
	}
	function node(value, path) {
		if (!value || Array.isArray(value) || typeof value !== "object") throw new SpecError("expected a component node.", path);
		const component = lookup(value.type);
		if (!component.composition) throw new SpecError(`component "${value.type}" is not in the bounded composition surface yet.`, path);
		const allowed = new Set(["type", "id", "category", "grow", ...Object.keys(component.params)]);
		for (const key of Object.keys(value)) if (!allowed.has(key) || ["color", "fill", "width", "height", "size"].includes(key)) throw new SpecError(`unsupported authored parameter "${key}". Geometry and styling belong to the engine.`, path);
		if (value.id !== undefined) {
			claimId(value.id, path);
		}
		if (value.category !== undefined && !categories.has(value.category)) throw new SpecError(`unknown category "${value.category}".`, path);
		if (value.grow !== undefined && typeof value.grow !== "boolean") throw new SpecError("grow must be boolean.", path);
		const occurrences=value.type==='text'?value.runs:value.type==='code'?value.annotations:undefined;
		if (occurrences !== undefined) {
			if (!Array.isArray(occurrences)) throw new SpecError("text runs and code annotations must be arrays.", path);
			for (const occurrence of occurrences) {
				if (!occurrence || typeof occurrence.text !== 'string') throw new SpecError("an occurrence needs literal text.", path);
				if (occurrence.id !== undefined) claimId(occurrence.id,path);
				if (occurrence.category !== undefined && !categories.has(occurrence.category)) throw new SpecError("unknown occurrence category.",path);
			}
		}
		for (const [key, rule] of Object.entries(component.params)) {
			const input = value[key];
			if (rule.required && input === undefined) throw new SpecError(`missing parameter "${key}".`, path);
			if (input === undefined) continue;
			if (rule.of && typeof rule.of === "object" && Array.isArray(input)) for (const item of input) {
				if (!item || typeof item !== "object" || Array.isArray(item)) throw new SpecError(`${key} needs objects.`, path);
				for (const field of Object.keys(item)) if (!Object.hasOwn(rule.of, field)) throw new SpecError(`unsupported ${key} field "${field}".`, path);
			}
			if (rule.fields && input && typeof input === "object" && !Array.isArray(input)) for (const field of Object.keys(input)) if (!rule.fields.includes(field)) throw new SpecError(`unsupported ${key} field "${field}".`, path);
		}
		if (value.type === "grid" && (!Number.isInteger(value.cols) || value.cols < 1 || value.cols > 6)) throw new SpecError("grid cols must be 1..6.", path);
		if (value.type === "table" && Array.isArray(value.rows) && Array.isArray(value.columns)) {
			const keys = new Set(value.columns.map(c => c.key));
			for (const row of value.rows) if (!row || Object.keys(row).some(k => !keys.has(k))) throw new SpecError("table row has no matching column.", path);
		}
		function slots(object, at, fields = {}) {
			if (!object || typeof object !== "object") return;
			for (const [key, child] of Object.entries(object)) {
				const rule = fields[key];
				if (NODE_SLOTS.has(key)) {
					// A data record may use the same name as a component slot.
					// The registry declares quadrant cell bodies as literal text.
					if (rule === "string") {
						if (typeof child !== "string") throw new SpecError("expected literal text.", `${at}.${key}`);
						continue;
					}
					if (Array.isArray(child)) child.forEach((v, i) => node(v, `${at}.${key}[${i}]`));
					else if (child != null) node(child, `${at}.${key}`);
				} else if (Array.isArray(child) && rule?.of && typeof rule.of === "object") {
					child.forEach((item, i) => slots(item, `${at}.${key}[${i}]`, rule.of));
				} else if (child && typeof child === "object") slots(child, `${at}.${key}`);
			}
		}
		slots(value, path, component.params);
	}
	node(spec.body, "body");
	if (spec.aside) node(spec.aside, "aside");
	return spec;
}

/* --------------------------------------------------------------------------
 * Node compilation
 * ------------------------------------------------------------------------ */

function compileNode(node, path = "body", context = {}) {
	if (node === null || node === undefined) return null;

	if (Array.isArray(node)) {
		throw new SpecError(
			"an array was found where one node was expected. Wrap several nodes in " +
				'{"type":"stack","children":[...]} so the layout is explicit.',
			path,
		);
	}

	if (typeof node !== "object") {
		throw new SpecError(`expected a node object, got ${typeof node}.`, path);
	}

	if (!node.type) {
		throw new SpecError(`a node needs a "type". Available: ${COMPONENT_NAMES.join(", ")}.`, path);
	}

	const component = lookup(node.type);

	/* Recurse into anything that holds nodes, so composition works at any depth
     without the compiler knowing which components nest. */
	const params = {};
	for (const [key, value] of Object.entries(node)) {
		if (key === "type" || (context.composition && ["id", "category", "grow"].includes(key))) continue;
		params[key] = compileValue(value, key, `${path}.${key}`, context);
	}

	try {
		const built = component.fn(params, context);
		if (!built || typeof built !== "object") {
			throw new SpecError(`"${node.type}" did not produce a node.`, path);
		}
		if (node.id !== undefined) built.semanticId = node.id;
		if (node.grow !== undefined) built.grow = node.grow;
		if (node.category !== undefined) {
			const category = context.categories?.get(node.category);
			if (!category) throw new SpecError(`unknown category "${node.category}".`, path);
			built.category = node.category;
			built.categoryColor = categoryColor(category.tone);
			if (built.kind === "box") {
				built.borderColor = built.categoryColor;
				if (built.fill) built.fill = categoryGround(category.tone);
			}
			if (built.kind === "text") built.color = built.categoryColor;
		}
		return built;
	} catch (err) {
		if (err instanceof SpecError) throw err;
		// Component errors are the good ones: they explain the boundary that was
		// crossed. Keep the message, add the path so a big spec is navigable.
		const e = new Error(`${path} (${node.type}): ${err.message}`);
		e.code = err.code || "COMPONENT_REFUSED";
		e.path = path;
		e.component = node.type;
		throw e;
	}
}

/**
 * Keys whose values are nodes.
 *
 * This is a whitelist, and it has to be, because `type` is overloaded. A node
 * says `{"type": "text"}` meaning a component; a table column says
 * `{"type": "text"}` meaning a data type. Sniffing for a component name turned
 * every text column in a table into a text node, and the table then reported
 * that its columns had no type, which is a true statement about a nonsense
 * object and a baffling thing to read.
 *
 * No component takes a node in an arbitrary parameter. They take them in named
 * slots, and these are the slots.
 */
const NODE_SLOTS = new Set(["children", "body", "aside"]);

function compileValue(value, key, path, context) {
	if (Array.isArray(value)) {
		return value.map((v, i) => compileValue(v, key, `${path}[${i}]`, context));
	}
	if (value && typeof value === "object") {
		if (NODE_SLOTS.has(key)) return compileNode(value, path, context);
		// Everything else is plain data: an item in a list, a column definition,
		// a track, a background. It may carry a `type` of its own, and that type
		// belongs to it rather than to this compiler.
		const out = {};
		for (const [k, v] of Object.entries(value)) out[k] = compileValue(v, k, `${path}.${k}`, context);
		return out;
	}
	return value;
}

/* --------------------------------------------------------------------------
 * Plate compilation
 * ------------------------------------------------------------------------ */

export function compileSpec(spec) {
	if (!spec || typeof spec !== "object") {
		throw new SpecError("a spec must be a JSON object.");
	}
	if (!spec.id) throw new SpecError('a spec needs an "id". It becomes the PNG filename.');
	if (!spec.body) throw new SpecError('a spec needs a "body".');

	const unknown = Object.keys(spec).filter((k) => !PLATE_FIELDS.has(k));
	if (unknown.length) {
		throw new SpecError(
			`unknown top level field(s): ${unknown.join(", ")}. ` +
				`The chase owns: ${[...PLATE_FIELDS].join(", ")}. ` +
				`Component parameters belong inside "body", not beside it.`,
		);
	}

	if (spec.schemaVersion !== undefined) validateComposition(spec);
	const context = { composition: spec.schemaVersion === COMPOSITION_VERSION, categories: new Map((spec.categories || []).map(c => [c.id, c])) };

	/* The body is compiled inside build() rather than here, because the node
     constructors must run fresh on every solve: the lab rebuilds a plate on
     every control change, and reusing node objects would carry stale rects. */
	return definePlate({
		id: spec.id,
		schemaVersion: spec.schemaVersion,
		categories: spec.categories,
		frame: spec.frame || "landscape",
		kicker: spec.kicker,
		number: spec.number,
		title: spec.title,
		lead: spec.lead,
		footnote: spec.footnote,
		gap: spec.gap,
		layout: spec.layout,
		ratio: spec.ratio,
		align: spec.align,
		asideSide: spec.asideSide,
		readout: spec.readout,
		background: spec.background,
		marks: spec.marks,
		aside: spec.aside ? () => compileNode(spec.aside, "aside", context) : undefined,
		build: () => compileNode(spec.body, "body", context),
		__spec: spec,
	});
}

/* --------------------------------------------------------------------------
 * Transport
 *
 * The CLI hands a spec to a headless browser through the URL, so it needs to
 * survive base64 with non-ASCII content intact. A slide is a few kilobytes;
 * Chrome's URL limit is orders of magnitude larger.
 * ------------------------------------------------------------------------ */

export function encodeSpec(spec) {
	const json = JSON.stringify(spec);
	const bytes = new TextEncoder().encode(json);
	let binary = "";
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary);
}

export function decodeSpec(encoded) {
	const binary = atob(encoded);
	const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
	return JSON.parse(new TextDecoder().decode(bytes));
}

/** Node has no btoa/atob in every version, so the CLI uses these instead. */
export const encodeSpecNode = (spec) =>
	Buffer.from(JSON.stringify(spec), "utf8").toString("base64");
