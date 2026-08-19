/**
 * Press lock — structural refusals aligned with lab authoring laws.
 * Not a second layout solver; drops specs the lab would refuse on content grounds.
 */

import { STRING_CAPS } from "./slotContract.js";
import { normalizePlateSpec } from "./normalize.js";
import {
	ALLOWED_COMPONENTS,
	PLATE_FRAMES,
	type PlateFrame,
	WITHHELD_COMPONENTS,
} from "./vocabulary.js";

export type PressError = {
	readonly code: string;
	readonly message: string;
};

export type LockResult =
	| { readonly ok: true; readonly spec: Record<string, unknown> }
	| {
			readonly ok: false;
			readonly errors: readonly PressError[];
			readonly spec: Record<string, unknown>;
	  };

const EM_DASH = /[\u2013\u2014]/; // en + em

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const walkStrings = (value: unknown, path: string, hit: (p: string, s: string) => void): void => {
	if (typeof value === "string") {
		hit(path, value);
		return;
	}
	if (Array.isArray(value)) {
		value.forEach((v, i) => {
			walkStrings(v, `${path}[${i}]`, hit);
		});
		return;
	}
	if (isRecord(value)) {
		for (const [k, v] of Object.entries(value)) {
			walkStrings(v, path ? `${path}.${k}` : k, hit);
		}
	}
};

const validateNode = (node: unknown, path: string, errors: PressError[], depth: number): void => {
	if (depth > 6) {
		errors.push({ code: "NODE_TOO_DEEP", message: `${path}: nested too deep` });
		return;
	}
	if (!isRecord(node)) {
		errors.push({ code: "BAD_NODE", message: `${path}: node must be an object` });
		return;
	}
	const type = node.type;
	if (typeof type !== "string" || !type.trim()) {
		errors.push({ code: "BAD_NODE", message: `${path}: missing type` });
		return;
	}
	if ((WITHHELD_COMPONENTS as readonly string[]).includes(type)) {
		errors.push({
			code: "COMPONENT_WITHHELD",
			message: `${path}: component "${type}" is not available`,
		});
		return;
	}
	if (!(ALLOWED_COMPONENTS as readonly string[]).includes(type)) {
		errors.push({
			code: "COMPONENT_UNKNOWN",
			message: `${path}: unknown component "${type}"`,
		});
		return;
	}

	if (type === "metrics") {
		const items = node.items;
		if (!Array.isArray(items) || items.length === 0) {
			errors.push({ code: "METRICS_EMPTY", message: `${path}: metrics need items` });
		} else {
			items.forEach((item, i) => {
				if (!isRecord(item)) {
					errors.push({ code: "METRICS_ITEM", message: `${path}.items[${i}] invalid` });
					return;
				}
				if (item.value === undefined || item.value === null || String(item.value).trim() === "") {
					errors.push({
						code: "METRIC_VALUE",
						message: `${path}.items[${i}]: value required`,
					});
				}
				if (item.unit === undefined || String(item.unit).trim() === "") {
					errors.push({
						code: "METRIC_UNIT",
						message: `${path}.items[${i}]: unit required (lab law)`,
					});
				}
			});
			if (items.length > 8) {
				errors.push({
					code: "TOO_MANY_UNITS",
					message: `${path}: more than 8 metrics — remove information`,
				});
			}
		}
	}

	if (type === "hero") {
		if (node.value === undefined || String(node.value).trim() === "") {
			errors.push({ code: "HERO_VALUE", message: `${path}: hero needs value` });
		}
		if (!node.unit || String(node.unit).trim() === "") {
			errors.push({ code: "HERO_UNIT", message: `${path}: hero needs unit` });
		}
	}

	if (type === "stack" || type === "row") {
		const children = node.children;
		if (!Array.isArray(children) || children.length === 0) {
			errors.push({ code: "CHILDREN", message: `${path}: ${type} needs children` });
		} else {
			children.forEach((child, i) => {
				validateNode(child, `${path}.children[${i}]`, errors, depth + 1);
			});
		}
	}

	if (
		type === "railSteps" ||
		type === "cards" ||
		type === "layers" ||
		type === "railFlow" ||
		type === "timeline" ||
		type === "timelineVertical"
	) {
		const items = node.items;
		if (!Array.isArray(items) || items.length === 0) {
			errors.push({ code: "ITEMS", message: `${path}: needs items` });
		} else if (items.length > 8) {
			errors.push({ code: "TOO_MANY_UNITS", message: `${path}: too many items` });
		}
	}

	if (type === "timeline" || type === "timelineVertical") {
		const items = Array.isArray(node.items) ? node.items : [];
		items.forEach((item, i) => {
			if (!isRecord(item) || !String(item.date ?? "").trim() || !String(item.title ?? "").trim()) {
				errors.push({
					code: "STOP_INCOMPLETE",
					message: `${path}.items[${i}]: ${type} stops need date + title`,
				});
				return;
			}
			if (item.chips !== undefined) {
				if (type === "timeline") {
					errors.push({
						code: "STOP_CHIPS_UNSUPPORTED",
						message: `${path}.items[${i}]: a horizontal timeline stop has no room for chips; use timelineVertical`,
					});
				} else if (!Array.isArray(item.chips)) {
					errors.push({
						code: "CHIPS_NOT_A_LIST",
						message: `${path}.items[${i}]: chips must be an array of { text, accent? }`,
					});
				} else {
					if (item.chips.length > 6) {
						errors.push({
							code: "CHIPS_TOO_MANY",
							message: `${path}.items[${i}]: ${item.chips.length} chips; 6 is the cap`,
						});
					}
					item.chips.forEach((chip, j) => {
						const text = isRecord(chip) ? String(chip.text ?? "").trim() : "";
						if (!text) {
							errors.push({
								code: "CHIP_TEXT_MISSING",
								message: `${path}.items[${i}].chips[${j}]: every chip needs non-empty text`,
							});
						} else if (text.length > 32) {
							errors.push({
								code: "CHIP_TOO_LONG",
								message: `${path}.items[${i}].chips[${j}]: "${text.slice(0, 40)}" is ${text.length} characters; a chip is one short mono label, 32 max`,
							});
						}
					});
				}
			}
			if (item.code === undefined) return;
			if (type === "timeline") {
				errors.push({
					code: "STOP_CODE_UNSUPPORTED",
					message: `${path}.items[${i}]: a horizontal timeline has no room for a code block; use timelineVertical`,
				});
				return;
			}
			const lines = String(item.code).split("\n");
			if (lines.filter((l) => l.trim()).length < 2 || lines.length > 8) {
				errors.push({
					code: "EVENT_CODE_LINES",
					message: `${path}.items[${i}]: an event's code block needs 2 to 8 verbatim lines`,
				});
			}
		});
	}

	if (type === "graph") {
		const nodes = Array.isArray(node.nodes) ? node.nodes : [];
		const edges = Array.isArray(node.edges) ? node.edges : [];
		if (nodes.length < 2) {
			errors.push({ code: "GRAPH_NODES", message: `${path}: graph needs at least two nodes` });
		}
		const keys = new Set(
			nodes.filter(isRecord).map((n) => String(n.key ?? "").trim()),
		);
		edges.forEach((edge, i) => {
			if (!isRecord(edge)) return;
			const from = String(edge.from ?? "").trim();
			const to = String(edge.to ?? "").trim();
			if (!keys.has(from) || !keys.has(to)) {
				errors.push({
					code: "GRAPH_EDGE_UNKNOWN",
					message: `${path}.edges[${i}]: edge names a key no node has`,
				});
			}
		});
	}

	if (type === "code") {
		const source = typeof node.code === "string" ? node.code : "";
		const lines = source.split("\n");
		const drawn = lines.filter((l) => l.trim().length > 0);
		if (drawn.length < 2) {
			errors.push({
				code: "CODE_TOO_SHORT",
				message: `${path}: code needs at least two verbatim lines; one line belongs in derivation`,
			});
		}
		if (lines.length > 14) {
			errors.push({
				code: "CODE_TOO_LONG",
				message: `${path}: code has ${lines.length} lines and 14 is the cap; cut the snippet to the lines the claim needs`,
			});
		}
	}

	if (type === "derivation") {
		const steps = Array.isArray(node.steps) ? node.steps : [];
		if (steps.length < 2 || steps.length > 5) {
			errors.push({
				code: "DERIVATION_STEPS",
				message: `${path}: derivation needs two to five steps`,
			});
		}
		steps.forEach((step, i) => {
			if (i === 0) return;
			if (!isRecord(step) || !String(step.note ?? "").trim()) {
				errors.push({
					code: "DERIVATION_NOTE_MISSING",
					message: `${path}.steps[${i}]: every step after the first needs a note`,
				});
			}
		});
	}
};

/** Lock a plate spec. Returns normalized plain object on success. */
export const lockPlate = (raw: unknown): LockResult => {
	const errors: PressError[] = [];
	const normalized = normalizePlateSpec(raw);
	if (!isRecord(normalized) || Object.keys(normalized).length === 0) {
		return {
			ok: false,
			spec: {},
			errors: [{ code: "BAD_SPEC", message: "plate spec must be an object" }],
		};
	}

	const spec = { ...normalized };
	const id = spec.id;
	if (typeof id !== "string" || !id.trim()) {
		errors.push({ code: "BAD_SPEC", message: "id required" });
	}

	const frame = spec.frame ?? "landscape";
	if (typeof frame !== "string" || !(PLATE_FRAMES as readonly string[]).includes(frame)) {
		errors.push({
			code: "BAD_FRAME",
			message: `frame must be ${PLATE_FRAMES.join(" | ")}`,
		});
	} else {
		spec.frame = frame as PlateFrame;
	}

	const title = spec.title;
	if (title !== undefined && title !== null && (typeof title !== "string" || !title.trim())) {
		errors.push({ code: "BAD_SPEC", message: "title must be a non-empty string when present" });
	}

	if (!("body" in spec) || spec.body === undefined) {
		errors.push({ code: "BAD_SPEC", message: "body required" });
	} else {
		validateNode(spec.body, "body", errors, 0);
	}

	const tooLong = (code: string, path: string, value: string, max: number): PressError => ({
		code,
		message: `${path || "spec"}: ${value.length} characters; sanity bound is ${max}. Shorten it. This cap is a garbage guard, not a fit guarantee.`,
	});

	walkStrings(spec, "", (path, s) => {
		if (s === "") {
			// Match packages/press solve assertContent — empty strings refuse at paint time.
			errors.push({
				code: "TEXT_MISSING",
				message: `${path || "spec"}: empty string (press text() refuses "")`,
			});
			return;
		}
		if (EM_DASH.test(s)) {
			errors.push({
				code: "EM_DASH",
				message: `${path || "spec"}: em/en dashes refused — use comma or colon`,
			});
		}
		if (path === "title" && s.length > STRING_CAPS.title.max) {
			errors.push(tooLong(STRING_CAPS.title.code, path, s, STRING_CAPS.title.max));
		} else if (path === "lead" && s.length > STRING_CAPS.lead.max) {
			errors.push(tooLong(STRING_CAPS.lead.code, path, s, STRING_CAPS.lead.max));
		} else if (/\.rows\[\d+]\.[^.]+$/.test(path) && s.length > STRING_CAPS.cell.max) {
			errors.push(tooLong(STRING_CAPS.cell.code, path, s, STRING_CAPS.cell.max));
		} else if (/\.(detail|body|text|content|note)$/.test(path) && s.length > STRING_CAPS.detail.max) {
			errors.push(tooLong(STRING_CAPS.detail.code, path, s, STRING_CAPS.detail.max));
		} else if (/\.code$/.test(path) && s.length > STRING_CAPS.snippet.max) {
			errors.push(tooLong(STRING_CAPS.snippet.code, path, s, STRING_CAPS.snippet.max));
		}
	});

	if (errors.length) {
		return { ok: false, spec, errors };
	}
	return { ok: true, spec };
};

export const frameSize = (frame: string): { w: number; h: number } => {
	switch (frame) {
		case "portrait":
			return { w: 1600, h: 2000 };
		case "square":
			return { w: 1600, h: 1600 };
		default:
			return { w: 1600, h: 1000 };
	}
};
