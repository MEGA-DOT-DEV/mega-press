/**
 * PRESS / registry
 *
 * The agent-facing vocabulary.
 *
 * Everything a plate can contain is listed here once, with the parameters it
 * accepts, which of them are required, and a worked example. `press components`
 * prints this, so a model can read the whole surface it is allowed to use
 * before it writes a line, rather than guessing and finding out from an error.
 *
 * The schemas are deliberately prose-ish rather than JSON Schema. They are read
 * by a language model, and "space step, 1 to 5" is more useful to one than
 * `{"type":"integer","minimum":1,"maximum":5}`. Validation is not done from
 * these: it is done by the components themselves, which throw with an
 * explanation. This is documentation, and the component is the contract.
 */

import { bars, donut, quadrant, segments } from "../components/chart.js";
import { cards, hero, metrics, note } from "../components/data.js";
import { graph } from "../components/graph.js";
import { ICON_NAMES, icon, iconGrid, iconTile } from "../components/icon.js";
import { image, placeholder } from "../components/media.js";
import { railFlow, railSteps } from "../components/rail.js";
import { code, codeSteps } from "../components/code.js";
import { derivation } from "../components/reasoning.js";
import { tree } from "../components/tree.js";
import { compareFlows } from "../components/flows.js";
import { compareSets } from "../components/sets.js";
import { checklist, compare, layers, quote } from "../components/structure.js";
import { table } from "../components/table.js";
import { schedule, swimlanes, timeline, timelineVertical } from "../components/timeline.js";
import { distribution } from "../components/uncertainty.js";
import * as solve from "./solve.js";

/* --------------------------------------------------------------------------
 * Shared parameter descriptions
 * ------------------------------------------------------------------------ */

const GAP = "space step, 1 to 5 (12, 20, 28, 40, 56px). Nothing between steps exists.";
const ROLE = "type role: utility, brand, body, list, head, datum, display, datumHero";
const ITEMS = "array";

const def = (name, spec) => ({ name, ...spec });

/* --------------------------------------------------------------------------
 * Layout primitives
 *
 * An author rarely needs these: a component usually is the body. They exist so
 * two components can be composed on one plate.
 * ------------------------------------------------------------------------ */

const LAYOUT = [
	def("stack", {
		fn: solve.stack,
		summary: "Children top to bottom.",
		use: "composing two components on one plate",
		params: {
			children: { type: "array of nodes", required: true },
			gap: { type: GAP, default: 3 },
			align: { type: "'stretch' | 'start' | 'center' | 'end'", default: "stretch" },
		},
		example: { type: "stack", gap: 4, children: [{ type: "metrics", items: [] }] },
	}),

	def("row", {
		fn: solve.row,
		summary: "Children left to right. Any child may set grow to take the slack.",
		use: "two things side by side",
		params: {
			children: { type: "array of nodes", required: true },
			gap: { type: GAP, default: 3 },
			align: {
				type: "'stretch' | 'start' | 'center' | 'end' | 'baseline'",
				default: "stretch",
				doc: "use 'baseline' whenever the children are different type sizes, or the larger one sits low",
			},
		},
		example: { type: "row", gap: 4, align: "baseline", children: [] },
	}),

	def("grid", {
		fn: solve.grid,
		summary: "Equal columns.",
		params: {
			cols: { type: "number", required: true },
			children: { type: "array of nodes", required: true },
			gap: { type: GAP, default: 3 },
		},
		example: { type: "grid", cols: 2, gap: 3, children: [] },
	}),

	def("box", {
		fn: solve.box,
		summary: "A bordered, filled block.",
		params: {
			children: { type: "array of nodes", required: true },
			pad: { type: GAP, default: 4, doc: "roughly 3x the gap between the elements inside it" },
			border: { type: "boolean", default: false },
			gap: { type: GAP, default: 1 },
		},
		example: { type: "box", pad: 4, border: true, children: [] },
	}),

	def("text", {
		fn: (p) => solve.text(p.content, p.role, p),
		summary: "A run of text at a named role.",
		params: {
			content: {
				type: "string",
				required: true,
				doc: "no em or en dashes; the build rejects them",
			},
			role: { type: ROLE, required: true },
			color: { type: "hex string", doc: "defaults by role" },
			align: { type: "'left' | 'right' | 'center'", default: "left" },
			commentary: { type: "boolean", doc: "mark an aside so it can never outrank its own content" },
		},
		example: { type: "text", content: "A data label", role: "list" },
	}),

	def("note", {
		fn: (p) => note(p.content),
		summary: "The one shared commentary bar. Use this rather than inventing an aside.",
		params: { content: { type: "string", required: true } },
		example: { type: "note", content: "Route existence is not content completeness." },
	}),

	def("hero", {
		fn: hero,
		summary: "The single focal numeral. At most one per plate.",
		params: {
			value: { type: "string or number", required: true },
			caption: {
				type: "string",
				required: true,
				doc: "says what the number counts; refused without it",
			},
		},
		example: { type: "hero", value: "920", caption: "UNIQUE ROUTES" },
	}),
];

/* --------------------------------------------------------------------------
 * Sequences
 * ------------------------------------------------------------------------ */

const SEQUENCE = [
	def("railSteps", {
		fn: railSteps,
		summary: "A vertical sequence with a rail derived from the dots.",
		use: "steps, waves, a roadmap, a process, a method",
		params: {
			items: {
				type: ITEMS,
				required: true,
				min: 2,
				of: { name: "string (required)", detail: "string", index: "number" },
			},
			activeTo: {
				type: "number",
				default: -1,
				doc: "items up to this index are drawn in the accent",
			},
			gap: { type: GAP, default: 4, doc: "between steps" },
			markerGap: { type: GAP, default: 3, doc: "from the dot to its text" },
			numbered: { type: "boolean", default: true },
		},
		example: {
			type: "railSteps",
			activeTo: 1,
			items: [
				{ name: "Scope expands", detail: "A probe becomes the whole site." },
				{ name: "Native routes", detail: "Ownership replaces snapshots." },
			],
		},
	}),

	def("railFlow", {
		fn: railFlow,
		summary: "The same sequence laid horizontally.",
		params: {
			items: {
				type: ITEMS,
				required: true,
				min: 2,
				of: { name: "string (required)", detail: "string" },
			},
			activeTo: { type: "number", default: -1 },
			gap: { type: GAP, default: 4 },
		},
		example: { type: "railFlow", items: [{ name: "One" }, { name: "Two" }] },
	}),

	def("timeline", {
		fn: timeline,
		summary: "Horizontal stops, evenly spaced, axis derived from the markers.",
		use: "when order matters but the intervals do not; stack two labelled rails to contrast two runs",
		params: {
			items: {
				type: ITEMS,
				required: true,
				min: 2,
				of: {
					date: "string (required)",
					title: "string (required)",
					detail: "string",
					accent: "boolean, the one stop the claim is about",
				},
			},
			activeTo: { type: "number", default: -1 },
			gap: { type: GAP, default: 4 },
			label: {
				type: "string",
				doc: "small caps mono section label above the rail, names the run this rail records",
			},
			unitPerStop: {
				type: "boolean",
				default: true,
				doc: "false counts the whole rail as one unit; used when two labelled rails share one frame",
			},
		},
		notes: [
			"accent fills the stop's marker and colours its date and title: the one stop the claim is about.",
			"Two labelled rails in one stack are one claim about a contrast; pass unitPerStop: false on each so the plate carries two units, not one per stop.",
		],
		example: {
			type: "timeline",
			label: "THROUGH RESEND MCP",
			items: [
				{ date: "WEEK 1", title: "Beyond prompting" },
				{ date: "WEEK 2", title: "Agents", accent: true },
			],
		},
	}),

	def("timelineVertical", {
		fn: timelineVertical,
		summary: "Dated stops top to bottom, the date in its own derived column.",
		use: "an event log or transcript; an event may carry the verbatim call shape it is about",
		params: {
			items: {
				type: ITEMS,
				required: true,
				min: 2,
				of: {
					date: "string (required)",
					title: "string (required)",
					detail: "string",
					code: "string, \\n-separated verbatim block under the event, 2 to 8 lines",
					accent: "boolean, the one event the claim is about",
					chips: "[{text, accent?}], 1 to 6 short mono pills under the detail or code, text 32 chars max",
				},
			},
			activeTo: { type: "number", default: -1 },
			gap: { type: GAP, default: 4 },
		},
		notes: [
			"An item's code block is painted verbatim by the code component's line painter: indentation kept, a too-wide line refused by name, never wrapped.",
			"accent fills the item's marker, colours its label, and accents its block's border.",
			"Chips are small bordered mono pills that hug their text: badges, a capability shortlist, result qualities. accent: true borders and inks the one chosen chip in red. They annotate the event and never count as extra units.",
		],
		example: {
			type: "timelineVertical",
			items: [
				{ date: "2026-05-01", title: "Scope expands" },
				{ date: "2026-07-23", title: "Cutover" },
			],
		},
	}),

	def("schedule", {
		fn: schedule,
		summary: "Positions proportional to real elapsed time, with packed labels.",
		use: "when the GAPS between events are the point",
		params: {
			items: {
				type: ITEMS,
				required: true,
				min: 2,
				of: { at: "ISO date (required)", label: "string (required)", accent: "boolean" },
			},
		},
		notes: [
			"Events must be in chronological order; a proportional axis cannot run backwards.",
			"Labels are packed into lanes and the component throws rather than overlapping them.",
			"A key it does not draw is refused, not ignored. There is no per-item detail here: " +
				"a sentence has no box to sit in on a proportional axis. Use timeline() or " +
				"timelineVertical(), which both draw one.",
		],
		example: {
			type: "schedule",
			items: [
				{ at: "2026-04-21", label: "Docs probe" },
				{ at: "2026-07-23", label: "Cutover" },
			],
		},
	}),

	def("swimlanes", {
		fn: swimlanes,
		summary: "Several tracks on one shared clock.",
		use: "a plan where more than one thing happens at once",
		params: {
			tracks: {
				type: ITEMS,
				required: true,
				min: 2,
				of: {
					name: "string (required)",
					events: "[{at, accent}]",
					spans: "[{from, to, label, accent}]",
				},
			},
		},
		notes: [
			"The span is computed once across every track, so a lane cannot rescale itself.",
			"A key it does not draw is refused, not ignored, on tracks, events and spans alike.",
		],
		example: {
			type: "swimlanes",
			tracks: [
				{ name: "Structure", spans: [{ from: "2026-04-21", to: "2026-05-11" }] },
				{ name: "Launch", events: [{ at: "2026-07-23", accent: true }] },
			],
		},
	}),
];

/* --------------------------------------------------------------------------
 * Structure
 * ------------------------------------------------------------------------ */

const STRUCTURE = [
	def("graph", {
		fn: graph,
		summary: "Labelled boxes with arrows derived from the placed boxes.",
		use: "a pipeline, an architecture, a system",
		params: {
			nodes: {
				type: ITEMS,
				required: true,
				min: 2,
				of: {
					key: "string (required, unique)",
					title: "string (required)",
					detail: "string",
					accent: "boolean",
				},
			},
			edges: {
				type: ITEMS,
				of: { from: "node key", to: "node key" },
				doc: "an edge naming a key that does not exist fails the build",
			},
			dir: { type: "'x' | 'y'", default: "x" },
			gap: { type: GAP, default: 5 },
		},
		example: {
			type: "graph",
			nodes: [
				{ key: "a", title: "Sources" },
				{ key: "b", title: "Build" },
			],
			edges: [{ from: "a", to: "b" }],
		},
	}),

	def("compare", {
		fn: compare,
		summary: "Before and after, with an arrow derived across the gutter.",
		params: {
			before: { type: "{label, title, items[]}", required: true },
			after: { type: "{label, title, items[]}", required: true },
			arrow: { type: "boolean", default: true },
		},
		example: {
			type: "compare",
			before: { label: "BEFORE", title: "Page by page", items: ["Cloned from the export."] },
			after: { label: "AFTER", title: "Components", items: ["One change, every page."] },
		},
	}),

	def("compareFlows", {
		fn: compareFlows,
		summary: "Two labelled columns side by side, each its own vertical transcript.",
		use: "contrasting two flows read top to bottom: job vs workflow, remember vs recall, dedicated integration vs agent-built",
		params: {
			left: {
				type: "{label, intro?, items[]}",
				required: true,
				of: {
					label: "string (required), small caps mono name of the flow",
					intro: "string, one or two body sentences under the label",
					items: "2 to 6 timelineVertical-shaped events: {date, title, detail?, code?, accent?, chips?}",
				},
			},
			right: { type: "{label, intro?, items[]}", required: true },
			gap: { type: GAP, default: 5 },
		},
		notes: [
			"Each column is built from the same event rows timelineVertical draws, and derives its own rail from its own markers.",
			"A column's date column width derives from that column's own widest label, so the two sides never borrow each other's measure.",
			"The whole figure is one claim about a contrast, so each column counts as one unit rather than each event.",
		],
		example: {
			type: "compareFlows",
			left: {
				label: "REMEMBER",
				items: [
					{ date: "USER", title: "States a fact worth keeping" },
					{ date: "AGENT", title: "Writes it under a stable name" },
				],
			},
			right: {
				label: "RECALL",
				items: [
					{ date: "USER", title: "Asks weeks later" },
					{ date: "AGENT", title: "Reads the same name back" },
				],
			},
		},
	}),

	def("compareSets", {
		fn: compareSets,
		summary: "Two labelled panels, each one claim and a roster of short tags.",
		use: "contrasting two collections where the size of the set is the argument: a scope expanding, a surface widening, a boundary moving",
		params: {
			left: {
				type: "{label, title, intro?, tags[]}",
				required: true,
				of: {
					label: "string (required), caps mono name of the side (uppercased)",
					title: "string (required), the side's claim, drawn in head type",
					intro: "string, one or two body sentences framing the claim",
					tags: "1 to 8 short mono pills: {text, accent?} or plain strings, 32 chars max",
				},
			},
			right: { type: "{label, title, intro?, tags[]}", required: true },
			accentSide: { type: "'left' | 'right' | 'none'", default: "right" },
			gap: { type: GAP, default: 5 },
		},
		notes: [
			"The panels are the bordered boxes compare draws, on the same house gutter; the accented side takes the red border and accent ground.",
			"Tags draw through the same chip painter transcript events use, stretched to a shared column measure so the reader counts rows; the roster is top-anchored and the sparse panel's empty ground is the argument.",
			"Two units, one per panel — the reader takes the contrast in as two strokes, not one stroke per tag.",
			"Identical tag sets on both sides refuse: if the sets match, there is nothing to compare.",
		],
		example: {
			type: "compareSets",
			left: {
				label: "INITIAL SCOPE",
				title: "One integration, built by hand.",
				tags: ["webhook", "sheets"],
			},
			right: {
				label: "FINAL SCOPE",
				title: "Every surface the agent can reach.",
				tags: ["webhook", "sheets", "email", "calendar", "storage", { text: "search", accent: true }],
			},
		},
	}),

	def("layers", {
		fn: layers,
		summary: "A stack read top to bottom, every layer at the full measure.",
		params: {
			items: {
				type: ITEMS,
				required: true,
				min: 2,
				of: { title: "string (required)", tag: "string", detail: "string", accent: "boolean" },
			},
			numbered: { type: "boolean", default: true },
			gap: { type: GAP, default: 1 },
		},
		example: {
			type: "layers",
			items: [
				{ title: "Interface", tag: "DOM" },
				{ title: "Solver", tag: "FORME" },
			],
		},
	}),

	def("cards", {
		fn: cards,
		summary: "A grid of labelled blocks.",
		params: {
			items: {
				type: ITEMS,
				required: true,
				of: { title: "string (required)", body: "string", index: "string", accent: "boolean" },
			},
			cols: { type: "number", default: 3 },
			gap: { type: GAP, default: 3 },
		},
		example: {
			type: "cards",
			cols: 3,
			items: [{ title: "One" }, { title: "Two" }, { title: "Three" }],
		},
	}),

	def("checklist", {
		fn: checklist,
		summary: "Do and avoid. The marks are drawn geometry, not glyphs.",
		params: {
			items: {
				type: ITEMS,
				required: true,
				of: { text: "string (required)", ok: "boolean (required)" },
			},
			gap: { type: GAP, default: 3 },
		},
		example: {
			type: "checklist",
			items: [
				{ ok: true, text: "Derive the connector." },
				{ ok: false, text: "Place it by eye." },
			],
		},
	}),

	def("quote", {
		fn: quote,
		summary: "A pull quote at head level, with a red rule above.",
		params: {
			text: { type: "string", required: true },
			attribution: {
				type: "string",
				required: true,
				doc: "refused without it: an unattributed quotation is a claim in disguise",
			},
		},
		example: { type: "quote", text: "Systems, not vibes.", attribution: "MEGA.DEV" },
	}),

	def("derivation", {
		fn: derivation,
		summary: "A chain of expressions, each following from the last, threaded by a rail.",
		use: "technical or theoretical content where the reasoning is the point",
		params: {
			steps: {
				type: ITEMS,
				required: true,
				min: 2,
				max: 5,
				of: {
					expr: "string (required)",
					note: "string (required after the first)",
					accent: "boolean",
				},
			},
			gap: { type: GAP, default: 4 },
		},
		notes: [
			"Every step after the first must say what changed. A step with no note is refused: the writer knows which term moved, which is exactly why it looks self evident to them and to nobody else.",
			"Expressions are mono, because an expression is technical metadata, not prose.",
			"Five steps is the cap. Past that the frame carries a proof rather than a claim.",
		],
		example: {
			type: "derivation",
			steps: [
				{ expr: "on_phone = source * (370 / frame_w)" },
				{
					expr: "on_phone = source * 0.231",
					note: "Frame width is fixed at 1600, so the factor is a constant.",
				},
				{
					expr: "source = 5.5 / 0.231 = 24",
					note: "Solve for the 5.5px floor, then round up to the scale.",
					accent: true,
				},
			],
		},
	}),

	def("code", {
		fn: code,
		summary: "A verbatim mono block drawn line by line, one unit, no wrapping.",
		use: "a snippet, a call shape, a JSON payload, a config the reader should see exactly",
		params: {
			code: {
				type: "string",
				required: true,
				doc: "the snippet with \\n line breaks, 2 to 14 lines, drawn verbatim",
			},
			label: { type: "string", doc: "small mono caption above the block (a filename, a tool name)" },
			accentLines: { type: "number[]", doc: "1-based line numbers drawn in the accent" },
			lang: {
				type: "'js' | 'json' | 'none'",
				default: "auto",
				doc: "token colouring; auto sniffs JSON from the first line, none paints plain ink",
			},
		},
		notes: [
			"Every line is measured with maxLines: 1, so a line too wide for the frame refuses by name instead of wrapping. Code that wraps has been rewritten by the renderer.",
			"The whole block is one information unit: ten lines of one snippet are one thing the reader takes in.",
			"Blank lines are kept as vertical space; leading spaces are indentation and indentation is content.",
			"Token colouring follows the theme's syntax slot: keywords in the accent, strings in ink, punctuation held back. Hosts re-map it once via configurePress({ syntax }), in cabinet ink names or contrast-checked hex. The spec never names a colour.",
		],
		example: {
			type: "code",
			label: "value_set",
			code: '{\n  "name": "reportTimezone",\n  "value": "Europe/Warsaw",\n  "scope": "user"\n}',
			accentLines: [3],
		},
	}),

	def("codeSteps", {
		fn: codeSteps,
		summary: "Numbered, labelled verbatim blocks: a sequence of 2 or 3 code steps.",
		use: "snippets whose order is the lesson: store then read, request then response, define then run",
		params: {
			steps: {
				type: ITEMS,
				required: true,
				min: 2,
				max: 3,
				of: {
					label: "string (required), short mono name of the step",
					caption: "string, body clause after the label saying what the step does",
					code: "string (required), the step's snippet with \\n line breaks, 2 to 10 lines, drawn verbatim",
				},
			},
			gap: { type: GAP, default: 4 },
		},
		notes: [
			"The numbers are meaningful: 01 must happen before 02. Do not use this for parallel snippets whose order is arbitrary.",
			"Each step (header plus block) is one information unit; the inner block is passed unit: false so it never counts twice.",
			"Blocks reuse codeBlock: verbatim lines, kept indentation, and a line too wide for the frame refuses by name instead of wrapping.",
		],
		example: {
			type: "codeSteps",
			steps: [
				{
					label: "value_set",
					caption: "stored earlier by the user, agent, or app",
					code: 'value_set({\n  "name": "reportTimezone",\n  "value": "Europe/Warsaw"\n})',
				},
				{
					label: "value_get",
					caption: "the package reads it at runtime, with a fallback",
					code: 'const stored = value_get({ "name": "reportTimezone" })\nconst timezone = stored?.value ?? "UTC"',
				},
			],
		},
	}),

	def("tree", {
		fn: tree,
		summary: "A mono hierarchy with drawn elbow connectors, one unit, terminal-tree shape.",
		use: "a capability map or file layout: what one thing contains, read top to bottom",
		params: {
			root: {
				type: "{name, detail?}",
				required: true,
				of: {
					name: "string (required), the trunk line, accent mono",
					detail: "string, muted clause after the root name",
				},
			},
			branches: {
				type: ITEMS,
				required: true,
				min: 2,
				max: 4,
				of: {
					name: "string (required), short mono name",
					items: "string[], short mono tokens on the same line, joined with a spaced middle dot",
					nodes: "array of {name, items?}, one level deeper at most",
				},
			},
			accent: { type: "boolean", default: true },
		},
		notes: [
			"A branch's children ride under `nodes`, because `children` in a spec is the reserved layout slot; plans may still say children and are normalized.",
			"The elbows are painted strokes (STROKE.connector in the connector ink), never box-drawing glyphs: the baked metrics table does not promise them, and structure is drawn, not typeset.",
			"The whole tree is one information unit: the reader takes in the map as one thing.",
			"Six drawn rows total, root included, and a row never wraps: a wider hierarchy folds siblings into items, a deeper one is a document.",
		],
		example: {
			type: "tree",
			root: { name: "kody-mcp" },
			branches: [
				{ name: "tools", items: ["search", "execute"] },
				{
					name: "capabilities",
					nodes: [
						{ name: "holds", items: ["memory", "storage", "values", "secrets"] },
						{ name: "runs", items: ["packages", "jobs"] },
					],
				},
			],
		},
	}),
];

/* --------------------------------------------------------------------------
 * Quantities
 * ------------------------------------------------------------------------ */

const DATA = [
	def("metrics", {
		fn: metrics,
		summary: "Ruled label and value rows.",
		params: {
			items: {
				type: ITEMS,
				required: true,
				of: { label: "string (required)", value: "string (required)", unit: "string (required)" },
			},
			gap: { type: GAP, default: 3 },
		},
		notes: [
			"A value without a unit is refused: a large isolated number is decoration, not evidence.",
		],
		example: {
			type: "metrics",
			items: [{ label: "Routes owned", value: "920", unit: "unique routes" }],
		},
	}),

	def("table", {
		fn: table,
		summary: "Derived column widths. The column type decides the face and the alignment.",
		params: {
			columns: {
				type: ITEMS,
				required: true,
				min: 2,
				of: {
					key: "string (required)",
					label: "string (required)",
					type: "'text' | 'number' | 'tag' (required)",
					grow: "boolean",
				},
			},
			rows: { type: "array of objects keyed by column key", required: true },
			gap: { type: GAP, default: 3 },
		},
		notes: [
			"type 'text' is Geist left, 'number' is mono right, 'tag' is mono left. A column cannot mix conventions.",
		],
		example: {
			type: "table",
			columns: [
				{ key: "role", label: "ROLE", type: "text", grow: true },
				{ key: "size", label: "SIZE", type: "number" },
			],
			rows: [{ role: "body", size: 26 }],
		},
	}),

	def("bars", {
		fn: bars,
		summary: "Horizontal bars on a shared zero-based scale.",
		params: {
			items: {
				type: ITEMS,
				required: true,
				min: 2,
				of: { label: "string (required)", value: "number (required)", accent: "boolean" },
			},
			unit: { type: "string", required: true, doc: "what the numbers count" },
			max: { type: "number", doc: "override the scale; defaults to the largest value" },
		},
		notes: ["Negative values are refused: a bar encodes length from zero."],
		example: {
			type: "bars",
			unit: "engineer days",
			items: [
				{ label: "Parity", value: 34 },
				{ label: "Routing", value: 13 },
			],
		},
	}),

	def("segments", {
		fn: segments,
		summary: "One bar divided into parts of a whole.",
		use: "usually the better choice than a donut: lengths on a common baseline beat angles",
		params: {
			items: {
				type: ITEMS,
				required: true,
				min: 2,
				of: { label: "string (required)", value: "number (required)" },
			},
			unit: { type: "string", required: true },
			total: {
				type: "number",
				doc: "defaults to the sum; the parts must sum to it or the build fails",
			},
			height: { type: "number", doc: "the bar depth; derived from the space scale by default" },
		},
		notes: [
			"Same ink and coverage pairing as donut(), inside a chase, with page-black gutters " +
				"cut symmetrically out of each boundary so no part is moved to make room.",
			"An item may set accent: true to take the leading pair.",
		],
		example: {
			type: "segments",
			unit: "routes",
			total: 100,
			items: [
				{ label: "Docs", value: 60 },
				{ label: "Marketing", value: 40 },
			],
		},
	}),

	def("donut", {
		fn: donut,
		summary: "At most five slices, sorted, every value printed, the whole shown beside it.",
		params: {
			items: {
				type: ITEMS,
				required: true,
				min: 2,
				max: 5,
				of: { label: "string (required)", value: "number (required)" },
			},
			unit: { type: "string", required: true },
			size: {
				type: "number",
				doc: "derived from the space available; pass one only to override it",
			},
		},
		notes: [
			"More than five slices is refused. That set is a bars() or a table().",
			"Series are encoded as a pair: an ink colour and a screen coverage level. Consecutive " +
				"parts always differ in ink, and two parts sharing an ink are a full band apart.",
			"An item may set accent: true to take the leading pair.",
		],
		example: {
			type: "donut",
			unit: "days",
			items: [
				{ label: "Parity", value: 34 },
				{ label: "Routing", value: 13 },
			],
		},
	}),

	def("quadrant", {
		fn: quadrant,
		summary: "A two by two framework.",
		params: {
			cells: {
				type: "array of exactly 4, in reading order TL TR BL BR",
				required: true,
				of: { title: "string (required)", body: "string", accent: "boolean" },
			},
			x: { type: "string", required: true, doc: "horizontal axis label, low to high" },
			y: { type: "string", required: true, doc: "vertical axis label" },
		},
		notes: ["Both axis labels are required: an unlabelled matrix is a decorative grid."],
		example: {
			type: "quadrant",
			x: "LOW TO HIGH VALUE",
			y: "EASY TO UNDO",
			cells: [
				{ title: "Automate" },
				{ title: "Review" },
				{ title: "Skip" },
				{ title: "Do it yourself" },
			],
		},
	}),

	def("distribution", {
		fn: distribution,
		summary: "A point estimate and the interval it lives in, on one shared axis.",
		use: "any measured quantity that is estimated rather than counted",
		params: {
			items: {
				type: ITEMS,
				required: true,
				min: 2,
				of: {
					label: "string (required)",
					lo: "number (required)",
					mid: "number (required)",
					hi: "number (required)",
					accent: "boolean",
				},
			},
			unit: { type: "string", required: true, doc: "what the numbers count" },
			from: { type: "number", doc: "pin the low end of the axis" },
			to: { type: "number", doc: "pin the high end of the axis" },
		},
		notes: [
			"A bare point estimate is refused: an estimate without its range is a claim in the costume of a measurement.",
			"The axis does not start at zero, unlike bars. An interval encodes by position, so any origin is legible; a bar encodes by length, so only zero is.",
			"mid must sit inside lo..hi, and lo must not exceed hi.",
		],
		example: {
			type: "distribution",
			unit: "ms, p50 with p5 to p95",
			items: [
				{ label: "Edge cache", lo: 12, mid: 18, hi: 41 },
				{ label: "Origin", lo: 90, mid: 140, hi: 320, accent: true },
			],
		},
	}),
];

/* --------------------------------------------------------------------------
 * Marks and media
 * ------------------------------------------------------------------------ */

const MEDIA = [
	def("iconTile", {
		fn: (p) => iconTile(p.icon, p.label, p),
		summary: "A white icon on a red square with its label beside it.",
		params: {
			icon: { type: `one of: ${ICON_NAMES.join(", ")}`, required: true },
			label: {
				type: "string",
				required: true,
				doc: "refused without it: an icon does not carry meaning alone",
			},
			detail: { type: "string" },
		},
		example: {
			type: "iconTile",
			icon: "check",
			label: "Validation",
			detail: "Thirteen invariants.",
		},
	}),

	def("iconGrid", {
		fn: iconGrid,
		summary: "A grid of semantic tiles.",
		params: {
			items: {
				type: ITEMS,
				required: true,
				of: { icon: "icon name (required)", label: "string (required)", detail: "string" },
			},
			cols: { type: "number", default: 2 },
		},
		example: {
			type: "iconGrid",
			cols: 2,
			items: [
				{ icon: "grid", label: "Layout" },
				{ icon: "check", label: "Validation" },
			],
		},
	}),

	def("icon", {
		fn: (p) => icon(p.name, p),
		summary: "A bare icon, no tile.",
		params: {
			name: { type: `one of: ${ICON_NAMES.join(", ")}`, required: true },
			size: { type: "number", default: 48 },
		},
		example: { type: "icon", name: "bolt" },
	}),

	def("image", {
		fn: image,
		summary: "A picture at a fixed ratio, positioned on solved coordinates.",
		params: {
			src: { type: "url or path", required: true },
			alt: { type: "string", required: true, doc: "describe the information the picture conveys" },
			ratio: { type: "number, width over height", default: 1.7777 },
			caption: { type: "string" },
			fit: { type: "'cover' | 'contain'", default: "cover" },
		},
		example: { type: "image", src: "./shot.png", alt: "The lab with a plate open", ratio: 1.6 },
	}),

	def("placeholder", {
		fn: placeholder,
		summary:
			"A hole of a known shape, drawn with its dimensions, for laying out before the artwork exists.",
		params: {
			ratio: { type: "number", default: 1.7777 },
			label: { type: "string", default: "ARTWORK PENDING" },
		},
		example: { type: "placeholder", ratio: 1.6 },
	}),
];

/* --------------------------------------------------------------------------
 * The registry
 * ------------------------------------------------------------------------ */

export const GROUPS = [
	{ group: "layout", summary: "composition primitives", components: LAYOUT },
	{ group: "sequence", summary: "order, time and process", components: SEQUENCE },
	{ group: "structure", summary: "systems, comparisons and lists", components: STRUCTURE },
	{ group: "data", summary: "quantities", components: DATA },
	{ group: "media", summary: "marks and pictures", components: MEDIA },
];

export const COMPONENTS = Object.fromEntries(
	GROUPS.flatMap((g) => g.components.map((c) => [c.name, { ...c, group: g.group }])),
);

export const COMPONENT_NAMES = Object.keys(COMPONENTS);

export function lookup(name) {
	const c = COMPONENTS[name];
	if (!c) {
		const err = new Error(
			`"${name}" is not a component. Available: ${COMPONENT_NAMES.join(", ")}. ` +
				`Run \`press components\` for the parameters of each.`,
		);
		// A code an agent can branch on, rather than a generic build failure.
		err.code = "UNKNOWN_COMPONENT";
		throw err;
	}
	return c;
}

/** The registry with the functions stripped, for printing as JSON. */
export function describe() {
	return GROUPS.map((g) => ({
		group: g.group,
		summary: g.summary,
		components: g.components.map(({ fn, ...rest }) => rest),
	}));
}
