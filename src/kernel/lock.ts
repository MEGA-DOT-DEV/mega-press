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

/**
 * One transcript item's structural checks: date + title, chips rules, and the
 * per-event code block. timeline/timelineVertical items and compareFlows side
 * items all pass through here, so the item contract exists exactly once.
 * `blocks: false` is the horizontal timeline, which has no room for chips or a
 * code block and refuses them by name instead of dropping them.
 */
const validateTranscriptItem = (
	item: unknown,
	itemPath: string,
	errors: PressError[],
	{ who, blocks }: { readonly who: string; readonly blocks: boolean },
): void => {
	if (!isRecord(item) || !String(item.date ?? "").trim() || !String(item.title ?? "").trim()) {
		errors.push({
			code: "STOP_INCOMPLETE",
			message: `${itemPath}: ${who} stops need date + title`,
		});
		return;
	}
	if (item.chips !== undefined) {
		if (!blocks) {
			errors.push({
				code: "STOP_CHIPS_UNSUPPORTED",
				message: `${itemPath}: a horizontal timeline stop has no room for chips; use timelineVertical`,
			});
		} else if (!Array.isArray(item.chips)) {
			errors.push({
				code: "CHIPS_NOT_A_LIST",
				message: `${itemPath}: chips must be an array of { text, accent? }`,
			});
		} else {
			if (item.chips.length > 6) {
				errors.push({
					code: "CHIPS_TOO_MANY",
					message: `${itemPath}: ${item.chips.length} chips; 6 is the cap`,
				});
			}
			item.chips.forEach((chip, j) => {
				const text = isRecord(chip) ? String(chip.text ?? "").trim() : "";
				if (!text) {
					errors.push({
						code: "CHIP_TEXT_MISSING",
						message: `${itemPath}.chips[${j}]: every chip needs non-empty text`,
					});
				} else if (text.length > 32) {
					errors.push({
						code: "CHIP_TOO_LONG",
						message: `${itemPath}.chips[${j}]: "${text.slice(0, 40)}" is ${text.length} characters; a chip is one short mono label, 32 max`,
					});
				}
			});
		}
	}
	if (item.code === undefined) return;
	if (!blocks) {
		errors.push({
			code: "STOP_CODE_UNSUPPORTED",
			message: `${itemPath}: a horizontal timeline has no room for a code block; use timelineVertical`,
		});
		return;
	}
	const lines = String(item.code).split("\n");
	if (lines.filter((l) => l.trim()).length < 2 || lines.length > 8) {
		errors.push({
			code: "EVENT_CODE_LINES",
			message: `${itemPath}: an event's code block needs 2 to 8 verbatim lines`,
		});
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
		// The kind compiler and renderer speak `caption`; older specs say `unit`.
		// Either satisfies the law that a prominent number says what it counts.
		const caption = String(node.caption ?? "").trim();
		const unit = String(node.unit ?? "").trim();
		if (!caption && !unit) {
			errors.push({
				code: "HERO_UNIT",
				message: `${path}: hero needs a caption or unit saying what is counted`,
			});
		}
	}

	if (type === "lineChart") {
		const axis = (key: "xAxis" | "yAxis") => {
			const value = node[key];
			if (!isRecord(value) || !String(value.label ?? "").trim()) {
				errors.push({
					code: "LINE_AXIS_LABEL_MISSING",
					message: `${path}.${key}: lineChart axes need a non-empty label`,
				});
				return;
			}
			const format = String(value.format ?? "number");
			if (!["number", "currency", "percent"].includes(format)) {
				errors.push({
					code: "LINE_AXIS_FORMAT",
					message: `${path}.${key}: format must be number, currency, or percent`,
				});
			}
			const min = value.min === undefined ? undefined : Number(value.min);
			const max = value.max === undefined ? undefined : Number(value.max);
			if (
				(min !== undefined && !Number.isFinite(min)) ||
				(max !== undefined && !Number.isFinite(max)) ||
				(min !== undefined && max !== undefined && min >= max)
			) {
				errors.push({
					code: "LINE_AXIS_DOMAIN",
					message: `${path}.${key}: min and max must be finite, with min below max`,
				});
			}
		};
		axis("xAxis");
		axis("yAxis");

		const series = Array.isArray(node.series) ? node.series : [];
		if (series.length < 1) {
			errors.push({ code: "LINE_SERIES_TOO_FEW", message: `${path}: lineChart needs at least one series` });
		} else if (series.length > 3) {
			errors.push({ code: "LINE_SERIES_TOO_MANY", message: `${path}: lineChart supports at most three series` });
		}
		let accents = 0;
		series.forEach((item, i) => {
			if (!isRecord(item)) {
				errors.push({
					code: "LINE_SERIES_LABEL_MISSING",
					message: `${path}.series[${i}]: every series needs a data object`,
				});
				return;
			}
			if (series.length > 1 && !String(item.label ?? "").trim()) {
				errors.push({
					code: "LINE_SERIES_LABEL_MISSING",
					message: `${path}.series[${i}]: compared series need labels`,
				});
				return;
			}
			if (item.accent) accents += 1;
			const points = Array.isArray(item.points) ? item.points : [];
			if (points.length < 3) {
				errors.push({
					code: "LINE_POINTS_TOO_FEW",
					message: `${path}.series[${i}]: a line needs at least three points`,
				});
			} else if (points.length > 12) {
				errors.push({
					code: "LINE_POINTS_TOO_MANY",
					message: `${path}.series[${i}]: twelve points is the cap`,
				});
			}
			points.forEach((point, j) => {
				if (!isRecord(point) || !Number.isFinite(Number(point.x)) || !Number.isFinite(Number(point.y))) {
					errors.push({
						code: "LINE_POINT_INVALID",
						message: `${path}.series[${i}].points[${j}]: finite x and y numbers required`,
					});
				}
			});
		});
		if (accents > 1) {
			errors.push({ code: "LINE_MULTIPLE_ACCENTS", message: `${path}: lineChart accents one series at most` });
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
			validateTranscriptItem(item, `${path}.items[${i}]`, errors, {
				who: type,
				blocks: type === "timelineVertical",
			});
		});
	}

	if (type === "compareFlows") {
		for (const key of ["left", "right"] as const) {
			const side = node[key];
			if (!isRecord(side) || !String(side.label ?? "").trim()) {
				errors.push({
					code: "COMPAREFLOWS_SIDE_MISSING",
					message: `${path}: compareFlows needs a ${key} side with a non-empty label`,
				});
				continue;
			}
			const items = Array.isArray(side.items) ? side.items : [];
			if (items.length < 2) {
				errors.push({
					code: "COMPAREFLOWS_TOO_FEW",
					message: `${path}.${key}: a flow needs at least 2 events (got ${items.length})`,
				});
			} else if (items.length > 6) {
				errors.push({
					code: "COMPAREFLOWS_TOO_MANY",
					message: `${path}.${key}: ${items.length} events; 6 is the cap per side`,
				});
			}
			items.forEach((item, i) => {
				validateTranscriptItem(item, `${path}.${key}.items[${i}]`, errors, {
					who: "compareFlows",
					blocks: true,
				});
			});
		}
	}

	if (type === "compareSets") {
		const tagKeys: string[] = [];
		for (const key of ["left", "right"] as const) {
			const side = node[key];
			if (
				!isRecord(side) ||
				!String(side.label ?? "").trim() ||
				!String(side.title ?? "").trim()
			) {
				errors.push({
					code: "SETS_SIDE_MISSING",
					message: `${path}: compareSets needs a ${key} side with a non-empty label and title`,
				});
				continue;
			}
			const tags = Array.isArray(side.tags) ? side.tags : [];
			if (tags.length < 1) {
				errors.push({
					code: "SETS_TAGS_TOO_FEW",
					message: `${path}.${key}: a set needs at least 1 tag (got ${tags.length})`,
				});
			} else if (tags.length > 8) {
				errors.push({
					code: "SETS_TAGS_TOO_MANY",
					message: `${path}.${key}: ${tags.length} tags; 8 is the cap — above that it is a table, not a set`,
				});
			}
			const texts: string[] = [];
			tags.forEach((tag, j) => {
				const text = isRecord(tag)
					? String(tag.text ?? "").trim()
					: String(tag ?? "").trim();
				if (!text) {
					errors.push({
						code: "TAG_TEXT_MISSING",
						message: `${path}.${key}.tags[${j}]: every tag needs non-empty text`,
					});
				} else if (text.length > 32) {
					errors.push({
						code: "TAG_TOO_LONG",
						message: `${path}.${key}.tags[${j}]: "${text.slice(0, 40)}" is ${text.length} characters; a tag is one short mono label, 32 max`,
					});
				}
				texts.push(text.toLowerCase());
			});
			tagKeys.push(texts.sort().join(" "));
		}
		if (tagKeys.length === 2 && tagKeys[0] === tagKeys[1] && tagKeys[0]) {
			errors.push({
				code: "SETS_NO_CONTRAST",
				message: `${path}: the same tags on both sides; if the sets match, there is nothing to compare`,
			});
		}
	}

	if (type === "compareSpecs") {
		for (const key of ["left", "right"] as const) {
			const side = node[key];
			if (
				!isRecord(side) ||
				!String(side.label ?? "").trim() ||
				!String(side.title ?? "").trim()
			) {
				errors.push({
					code: "SPECCARDS_SIDE_MISSING",
					message: `${path}: compareSpecs needs a ${key} side with a non-empty label and title`,
				});
				continue;
			}
			const flow = side.flow;
			const from = isRecord(flow) && isRecord(flow.from) ? flow.from : null;
			const to = isRecord(flow) && isRecord(flow.to) ? flow.to : null;
			if (!from || !to || !String(from.title ?? "").trim() || !String(to.title ?? "").trim()) {
				errors.push({
					code: "SPECCARDS_FLOW_MISSING",
					message: `${path}.${key}: a spec card needs a flow of two named nodes`,
				});
			} else if (
				!isRecord((flow as Record<string, unknown>).edge) ||
				!String((flow as { edge?: { text?: unknown } }).edge?.text ?? "").trim()
			) {
				errors.push({
					code: "FLOW_EDGE_MISSING",
					message: `${path}.${key}: the flow's edge needs a clause saying who dials, over what`,
				});
			}
			const specs = Array.isArray(side.specs) ? side.specs : [];
			if (specs.length < 2) {
				errors.push({
					code: "SPECS_TOO_FEW",
					message: `${path}.${key}: a spec sheet needs at least 2 rows (got ${specs.length})`,
				});
			} else if (specs.length > 5) {
				errors.push({
					code: "SPECS_TOO_MANY",
					message: `${path}.${key}: ${specs.length} spec rows; 5 is the cap — a longer sheet is a table`,
				});
			}
			specs.forEach((spec, j) => {
				const k = isRecord(spec) ? String(spec.key ?? "").trim() : "";
				const v = isRecord(spec) ? String(spec.value ?? "").trim() : "";
				if (!k || !v) {
					errors.push({
						code: "SPEC_ROW_INCOMPLETE",
						message: `${path}.${key}.specs[${j}]: every spec row needs a key and a value`,
					});
				} else if (k.length > 16) {
					errors.push({
						code: "SPEC_KEY_TOO_LONG",
						message: `${path}.${key}.specs[${j}]: key "${k}" is ${k.length} characters; 16 is the cap`,
					});
				}
			});
		}
	}

	if (type === "converge") {
		const sources = Array.isArray(node.sources) ? node.sources : [];
		if (sources.length < 2) {
			errors.push({
				code: "CONVERGE_SOURCES_TOO_FEW",
				message: `${path}: converge needs at least 2 source runs (got ${sources.length}); the funnel is the claim`,
			});
		} else if (sources.length > 4) {
			errors.push({
				code: "CONVERGE_SOURCES_TOO_MANY",
				message: `${path}: ${sources.length} source runs; 4 is the cap`,
			});
		}
		sources.forEach((s, i) => {
			if (!isRecord(s) || !String(s.name ?? "").trim()) {
				errors.push({
					code: "CONVERGE_SOURCE_MISSING",
					message: `${path}.sources[${i}]: every run needs a name`,
				});
				return;
			}
			const lines = Array.isArray(s.lines) ? s.lines : [];
			if (lines.length > 3) {
				errors.push({
					code: "CONVERGE_SOURCE_LINES",
					message: `${path}.sources[${i}]: ${lines.length} verbatim lines; 3 is the cap inside a run card`,
				});
			}
		});
		const sink = node.sink;
		if (!isRecord(sink) || !String(sink.name ?? "").trim()) {
			errors.push({
				code: "CONVERGE_SINK_MISSING",
				message: `${path}: converge needs a sink with a name — the durable thing every source feeds`,
			});
		} else {
			const columns = Array.isArray(sink.columns) ? sink.columns : [];
			if (columns.length < 1 || columns.length > 2) {
				errors.push({
					code: "SINK_COLUMNS_OFF",
					message: `${path}.sink: 1 or 2 labelled ledger columns (got ${columns.length})`,
				});
			}
			columns.forEach((c, i) => {
				if (!isRecord(c) || !String(c.label ?? "").trim()) {
					errors.push({
						code: "SINK_COLUMN_LABEL_MISSING",
						message: `${path}.sink.columns[${i}]: every ledger needs a label`,
					});
					return;
				}
				const lines = Array.isArray(c.lines) ? c.lines : [];
				if (lines.length < 2 || lines.length > 5) {
					errors.push({
						code: "SINK_COLUMN_LINES",
						message: `${path}.sink.columns[${i}]: ${lines.length} lines; a ledger holds 2 to 5`,
					});
				}
			});
		}
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

	if (type === "tree") {
		const root = node.root;
		if (!isRecord(root) || !String(root.name ?? "").trim()) {
			errors.push({
				code: "TREE_ROOT_MISSING",
				message: `${path}: tree needs a root with a name`,
			});
		}
		const branches = Array.isArray(node.branches) ? node.branches : [];
		if (branches.length < 2) {
			errors.push({
				code: "TREE_TOO_SHALLOW",
				message: `${path}: tree needs at least 2 branches (got ${branches.length})`,
			});
		} else if (branches.length > 4) {
			errors.push({
				code: "TREE_TOO_MANY_BRANCHES",
				message: `${path}: ${branches.length} branches; 4 is the cap`,
			});
		}
		let rows = 1;
		branches.forEach((branch, i) => {
			if (!isRecord(branch) || !String(branch.name ?? "").trim()) {
				errors.push({
					code: "TREE_NAME_MISSING",
					message: `${path}.branches[${i}]: every tree node needs a name`,
				});
				return;
			}
			rows += 1;
			// Children ride under `nodes` in the IR (normalize renames `children`,
			// the spec compiler's reserved node slot).
			const children = Array.isArray(branch.nodes) ? branch.nodes : [];
			children.forEach((child, j) => {
				rows += 1;
				if (!isRecord(child) || !String(child.name ?? "").trim()) {
					errors.push({
						code: "TREE_NAME_MISSING",
						message: `${path}.branches[${i}].nodes[${j}]: every tree node needs a name`,
					});
					return;
				}
				if (child.nodes !== undefined || child.children !== undefined) {
					errors.push({
						code: "TREE_TOO_DEEP",
						message: `${path}.branches[${i}].nodes[${j}]: two levels below the root is the cap`,
					});
				}
			});
		});
		if (rows > 6) {
			errors.push({
				code: "TREE_TOO_TALL",
				message: `${path}: tree draws ${rows} rows (root included); 6 is the cap`,
			});
		}
	}

	if (type === "codeSteps") {
		const steps = Array.isArray(node.steps) ? node.steps : [];
		if (steps.length < 2) {
			errors.push({
				code: "CODESTEPS_TOO_FEW",
				message: `${path}: codeSteps needs at least 2 steps (got ${steps.length})`,
			});
		} else if (steps.length > 3) {
			errors.push({
				code: "CODESTEPS_TOO_MANY",
				message: `${path}: ${steps.length} steps; 3 is the cap`,
			});
		}
		steps.forEach((step, i) => {
			if (!isRecord(step) || !String(step.label ?? "").trim()) {
				errors.push({
					code: "CODESTEP_LABEL_MISSING",
					message: `${path}.steps[${i}]: every codeSteps step needs a label`,
				});
				return;
			}
			const source = typeof step.code === "string" ? step.code : "";
			const lines = source.split("\n");
			const drawn = lines.filter((l) => l.trim().length > 0);
			if (drawn.length === 0) {
				errors.push({
					code: "CODESTEP_CODE_MISSING",
					message: `${path}.steps[${i}]: a numbered step needs a code block`,
				});
			} else if (drawn.length < 2) {
				errors.push({
					code: "CODESTEP_CODE_TOO_SHORT",
					message: `${path}.steps[${i}]: a step's block needs at least 2 verbatim lines`,
				});
			} else if (lines.length > 10) {
				errors.push({
					code: "CODESTEP_CODE_TOO_LONG",
					message: `${path}.steps[${i}]: ${lines.length} lines; 10 is the cap per step`,
				});
			}
		});
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
