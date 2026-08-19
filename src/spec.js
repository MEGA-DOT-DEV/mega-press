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

/** Fields the chase owns. Anything else at the top level is a mistake. */
const PLATE_FIELDS = new Set([
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

export class SpecError extends Error {
	constructor(message, path) {
		super(path ? `${path}: ${message}` : message);
		this.name = "SpecError";
		this.code = "BAD_SPEC";
		this.path = path;
	}
}

/* --------------------------------------------------------------------------
 * Node compilation
 * ------------------------------------------------------------------------ */

function compileNode(node, path = "body") {
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
		if (key === "type") continue;
		params[key] = compileValue(value, key, `${path}.${key}`);
	}

	try {
		const built = component.fn(params);
		if (!built || typeof built !== "object") {
			throw new SpecError(`"${node.type}" did not produce a node.`, path);
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

function compileValue(value, key, path) {
	if (Array.isArray(value)) {
		return value.map((v, i) => compileValue(v, key, `${path}[${i}]`));
	}
	if (value && typeof value === "object") {
		if (NODE_SLOTS.has(key)) return compileNode(value, path);
		// Everything else is plain data: an item in a list, a column definition,
		// a track, a background. It may carry a `type` of its own, and that type
		// belongs to it rather than to this compiler.
		const out = {};
		for (const [k, v] of Object.entries(value)) out[k] = compileValue(v, k, `${path}.${k}`);
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

	/* The body is compiled inside build() rather than here, because the node
     constructors must run fresh on every solve: the lab rebuilds a plate on
     every control change, and reusing node objects would carry stale rects. */
	return definePlate({
		id: spec.id,
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
		aside: spec.aside ? () => compileNode(spec.aside, "aside") : undefined,
		build: () => compileNode(spec.body, "body"),
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
