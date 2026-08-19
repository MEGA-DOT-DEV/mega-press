import { ITEM_BOUNDS, STRING_CAPS } from "./slotContract.js";

/**
 * Generatable artifact modules for the article composer agent.
 * Catalog is the agent's discovery surface; compile templates remain the only
 * path to press IR (no freeform component trees from the model).
 */

export type ArtifactModuleId =
	| "railSteps"
	| "compare"
	| "metrics"
	| "cards"
	| "checklist"
	| "table"
	| "layers"
	| "bars"
	| "segments"
	| "quadrant"
	| "timeline"
	| "timelineVertical"
	| "railFlow"
	| "graph"
	| "derivation"
	| "code";

export type ArtifactModuleSummary = {
	readonly id: ArtifactModuleId;
	readonly title: string;
	/** One line — what content shape this is for */
	readonly use: string;
	/** When the composer should pick this over siblings */
	readonly pickWhen: string;
	/** Rough unit count the pedagogy gate expects */
	readonly units: string;
};

export type ArtifactModuleSchema = ArtifactModuleSummary & {
	readonly slots: Record<string, unknown>;
	readonly density: readonly string[];
	readonly outlineHint: string;
	readonly exampleOutline: readonly string[];
	readonly bans: readonly string[];
};

const MODULES: readonly ArtifactModuleSchema[] = [
	{
		id: "railSteps",
		title: "Step rail",
		use: "Ordered process, protocol, or loop where sequence matters.",
		pickWhen: "Teaching a method the reader should walk in order.",
		units: "4–6 steps (name + detail clause each)",
		slots: {
			type: "object",
			required: ["steps"],
			properties: {
				steps: {
					type: "array",
					minItems: ITEM_BOUNDS.railSteps.steps.min,
					maxItems: ITEM_BOUNDS.railSteps.steps.max,
					items: {
						type: "object",
						required: ["name", "detail"],
						properties: {
							name: { type: "string", minLength: 2, maxLength: 40 },
							detail: {
								type: "string",
								minLength: 24,
								maxLength: STRING_CAPS.detail.max,
								description: `Full clause; not a title echo. ${STRING_CAPS.detail.description}`,
							},
						},
					},
				},
			},
		},
		density: [
			"4–6 steps",
			"each detail ≥24 characters",
			"details must not paraphrase the plate title",
		],
		outlineHint: "Each line: StepName — detail clause the reader can execute.",
		exampleOutline: [
			"Sense the state: read only the state needed for the next decision.",
			"Think — choose one action and name the expected result.",
			"Act — call one permitted tool with bounded arguments.",
			"Observe — compare the tool result to the goal, not to fluency.",
			"Stop — exit on success, budget limit, or human gate.",
		],
		bans: ["Single-step rails", "Empty detail strings", "Title restated as every detail"],
	},
	{
		id: "compare",
		title: "Before / after compare",
		use: "Two competing shapes side by side.",
		pickWhen: "Contrast is the lesson (chat vs agent, before vs after, naive vs checked).",
		units: "2 sides × ≥2 items",
		slots: {
			type: "object",
			required: ["before", "after"],
			properties: {
				before: {
					type: "object",
					required: ["label", "title", "items"],
					properties: {
						label: { type: "string" },
						title: { type: "string" },
						items: {
							type: "array",
							minItems: ITEM_BOUNDS.compare.items.min,
							maxItems: ITEM_BOUNDS.compare.items.max,
							items: { type: "string", maxLength: STRING_CAPS.detail.max },
						},
					},
				},
				after: {
					type: "object",
					required: ["label", "title", "items"],
					properties: {
						label: { type: "string" },
						title: { type: "string" },
						items: {
							type: "array",
							minItems: ITEM_BOUNDS.compare.items.min,
							maxItems: ITEM_BOUNDS.compare.items.max,
							items: { type: "string", maxLength: STRING_CAPS.detail.max },
						},
					},
				},
			},
		},
		density: ["≥2 concrete items per side", "items are distinct facts, not slogans"],
		outlineHint: "Lines alternate or tag BEFORE:/AFTER: with concrete bullets.",
		exampleOutline: [
			"BEFORE CHAT: Ends when the text ends.",
			"BEFORE CHAT: No tool result to check.",
			"AFTER AGENT: Each turn can change what is known.",
			"AFTER AGENT: Stop conditions make the loop inspectable.",
		],
		bans: ["One-sided compares", "Identical items on both sides"],
	},
	{
		id: "metrics",
		title: "Metric strip",
		use: "Exact quantities with units — budgets, limits, counts.",
		pickWhen: "Numbers are the teaching point (step budget, time box, gates).",
		units: "3–5 rows {label, value, unit}",
		slots: {
			type: "object",
			required: ["metrics"],
			properties: {
				metrics: {
					type: "array",
					minItems: ITEM_BOUNDS.metrics.metrics.min,
					maxItems: ITEM_BOUNDS.metrics.metrics.max,
					items: {
						type: "object",
						required: ["label", "value", "unit"],
						properties: {
							label: { type: "string" },
							value: { type: "string" },
							unit: { type: "string", description: "What the number counts" },
						},
					},
				},
			},
		},
		density: ["Every value has a unit", "Prefer real design budgets over fake stats"],
		outlineHint: "Each line: Label = value unit",
		exampleOutline: [
			"Step budget = 8 tool calls",
			"Time box = 60 seconds",
			"Write tools = 0 until approval",
			"Human gates = 1 irreversible act",
		],
		bans: ["Metrics without units", "Invented statistics presented as facts"],
	},
	{
		id: "cards",
		title: "Concept cards",
		use: "Parallel facets the reader should hold at once.",
		pickWhen: "One idea has 3–4 named parts (goal, evidence, budget, recovery).",
		units: "3–4 cards {title, body}",
		slots: {
			type: "object",
			required: ["cards"],
			properties: {
				cards: {
					type: "array",
					minItems: ITEM_BOUNDS.cards.cards.min,
					maxItems: ITEM_BOUNDS.cards.cards.max,
					items: {
						type: "object",
						required: ["title", "body"],
						properties: {
							title: { type: "string" },
							body: {
								type: "string",
								minLength: 40,
								maxLength: STRING_CAPS.detail.max,
								description: STRING_CAPS.detail.description,
							},
						},
					},
				},
			},
		},
		density: ["≥3 cards", "body ≥40 chars and not a title echo"],
		outlineHint: "Each line: CardTitle — full explanatory sentence.",
		exampleOutline: [
			"Goal — Outcome plus observable completion checks, not a vague wish.",
			"Evidence — Facts with sources: tool output, records, prior approvals.",
			"Budget — Remaining turns, time, and which writes still need a human.",
			"Recovery — Missing info, bad args, denied permission, or external fault.",
		],
		bans: ["Two-card decks", "Body that only repeats the plate title"],
	},
	{
		id: "checklist",
		title: "Do / avoid checklist",
		use: "Concrete practice rules the reader can audit.",
		pickWhen: "Teaching habits: what to do and what to refuse.",
		units: "4–6 lines {text, ok}",
		slots: {
			type: "object",
			required: ["checks"],
			properties: {
				checks: {
					type: "array",
					minItems: ITEM_BOUNDS.checklist.checks.min,
					maxItems: ITEM_BOUNDS.checklist.checks.max,
					items: {
						type: "object",
						required: ["text", "ok"],
						properties: {
							text: {
								type: "string",
								minLength: 16,
								maxLength: STRING_CAPS.detail.max,
								description: STRING_CAPS.detail.description,
							},
							ok: { type: "boolean", description: "true = do, false = avoid" },
						},
					},
				},
			},
		},
		density: ["≥4 checkable lines", "mix of do (ok:true) and avoid (ok:false) when useful"],
		outlineHint: "Each line: [DO] or [AVOID] plus the rule.",
		exampleOutline: [
			"[DO] Write the stop condition before the system prompt.",
			"[DO] Log every tool call with arguments and result.",
			"[DO] Default-deny irreversible tools.",
			"[AVOID] Add personality to fix a broken loop.",
			"[AVOID] Widen permissions because the happy path worked once.",
		],
		bans: ["Vague slogans", "Fewer than four lines"],
	},
	{
		id: "table",
		title: "Scan table",
		use: "Exact rows the reader might look up.",
		pickWhen: "Failure modes ↔ guards, or other paired lookup content.",
		units: "2–3 columns × 3–5 rows",
		slots: {
			type: "object",
			required: ["columns", "rows"],
			properties: {
				columns: {
					type: "array",
					minItems: ITEM_BOUNDS.table.columns.min,
					maxItems: ITEM_BOUNDS.table.columns.max,
					items: {
						type: "object",
						required: ["key", "label"],
						properties: { key: { type: "string" }, label: { type: "string" } },
					},
				},
				rows: {
					type: "array",
					minItems: ITEM_BOUNDS.table.rows.min,
					maxItems: ITEM_BOUNDS.table.rows.max,
					items: {
						type: "object",
						additionalProperties: {
							type: "string",
							maxLength: STRING_CAPS.cell.max,
							description: STRING_CAPS.cell.description,
						},
					},
				},
			},
		},
		density: ["≥3 data rows", "cells are short and scannable"],
		outlineHint: "First line columns; then row cells joined by |",
		exampleOutline: [
			"COLUMNS: failure | guard",
			"Retry same call | Step limit + already-tried memory",
			"Silent wrong answer | Require evidence tools",
			"Overreach write | Human gate on irreversible tools",
		],
		bans: ["Wide prose paragraphs inside cells"],
	},
	{
		id: "layers",
		title: "Layer stack",
		use: "A stack read top to bottom (policy → tools → model).",
		pickWhen: "Hierarchy or dependency order is the lesson.",
		units: "3–4 layers {title, detail}",
		slots: {
			type: "object",
			required: ["layers"],
			properties: {
				layers: {
					type: "array",
					minItems: ITEM_BOUNDS.layers.layers.min,
					maxItems: ITEM_BOUNDS.layers.layers.max,
					items: {
						type: "object",
						required: ["title", "detail"],
						properties: {
							title: { type: "string" },
							detail: {
								type: "string",
								minLength: 24,
								maxLength: STRING_CAPS.detail.max,
								description: STRING_CAPS.detail.description,
							},
						},
					},
				},
			},
		},
		density: ["≥3 layers", "detail is a full clause"],
		outlineHint: "Each line: LayerTitle — detail clause.",
		exampleOutline: [
			"Policy — What the agent may never do alone.",
			"Tools — Schemas, permissions, honest errors.",
			"Model — Chooses the next step under the policy.",
		],
		bans: ["Flat lists better suited to cards or checklist"],
	},
	{
		id: "bars",
		title: "Bar comparison",
		use: "Quantities compared on one shared scale.",
		pickWhen: "Relative magnitude matters more than exact unit labels alone.",
		units: "3–5 bars {label, value} + unit",
		slots: {
			type: "object",
			required: ["unit", "bars"],
			properties: {
				unit: { type: "string", description: "Shared scale name" },
				bars: {
					type: "array",
					minItems: 3,
					maxItems: 5,
					items: {
						type: "object",
						required: ["label", "value"],
						properties: {
							label: { type: "string" },
							value: { type: "number" },
						},
					},
				},
			},
		},
		density: ["≥3 bars", "values comparable on one unit"],
		outlineHint: "First line UNIT:; then Label = number",
		exampleOutline: ["UNIT: share of loop time", "Sense = 35", "Act = 40", "Observe = 25"],
		bans: ["Mixing unrelated scales", "Invented precision"],
	},
	{
		id: "segments",
		title: "Parts of a whole",
		use: "Composition of one total (permission surface, time share).",
		pickWhen: "Parts must sum to a meaningful whole.",
		units: "3–5 segments + unit + total",
		slots: {
			type: "object",
			required: ["unit", "total", "segments"],
			properties: {
				unit: { type: "string" },
				total: { type: "number" },
				segments: {
					type: "array",
					minItems: 3,
					maxItems: 5,
					items: {
						type: "object",
						required: ["label", "value"],
						properties: {
							label: { type: "string" },
							value: { type: "number" },
						},
					},
				},
			},
		},
		density: ["≥3 segments", "values should be readable parts of total"],
		outlineHint: "TOTAL and UNIT first; then Label = value",
		exampleOutline: [
			"TOTAL: 100 UNIT: permission surface",
			"Read = 55",
			"Draft = 30",
			"Write gated = 15",
		],
		bans: ["Segments that ignore the whole"],
	},
	{
		id: "quadrant",
		title: "2×2 tradeoff",
		use: "Two-axis map for tradeoffs.",
		pickWhen: "Readers must place options on two dimensions (risk × automation).",
		units: "axis labels + 4 quadrant blurbs",
		slots: {
			type: "object",
			required: ["xLabel", "yLabel", "quadrants"],
			properties: {
				xLabel: {
					type: "string",
					description: "Horizontal axis, compiled to press body.x",
				},
				yLabel: {
					type: "string",
					description: "Vertical axis, compiled to press body.y",
				},
				quadrants: {
					type: "array",
					minItems: 4,
					maxItems: 4,
					description: "Reading order TL, TR, BL, BR → press cells[]",
					items: {
						type: "object",
						required: ["title", "detail"],
						properties: {
							title: { type: "string" },
							detail: { type: "string", minLength: 16 },
						},
					},
				},
			},
		},
		density: ["Both axes named", "All four cells filled with distinct guidance"],
		outlineHint: "AXES line; then four cells TL/TR/BL/BR.",
		exampleOutline: [
			"AXES: x=automation y=blast radius",
			"TL Low auto / high blast — Human required before any write.",
			"TR High auto / high blast — Forbidden without dual control.",
			"BL Low auto / low blast — Manual is fine; log the path.",
			"BR High auto / low blast — Safe to loop with a step budget.",
		],
		bans: ["Unlabeled axes", "Empty cells"],
	},
	{
		id: "timeline",
		title: "Event timeline",
		use: "Calls or events in order, read left to right, when the intervals do not matter.",
		pickWhen: "A short sequence of moments is the lesson (call, error, hint, retry, delivered).",
		units: "3–5 stops {at, title, detail}",
		slots: {
			type: "object",
			required: ["stops"],
			properties: {
				stops: {
					type: "array",
					minItems: 3,
					maxItems: 5,
					items: {
						type: "object",
						required: ["at", "title"],
						properties: {
							at: {
								type: "string",
								maxLength: 16,
								description: "Short mono label above the stop (CALL 1, HINT, WEEK 2)",
							},
							title: { type: "string" },
							detail: { type: "string", minLength: 16 },
						},
					},
				},
			},
		},
		density: ["3–5 stops", "detail clauses on most stops, not bare titles"],
		outlineHint: "Each line: AT | Title | detail clause.",
		exampleOutline: [
			"CALL 1 | send_email | Fails: missing audience_id.",
			"HINT | Error names the next step | Call list_audiences first.",
			"CALL 2 | list_audiences | Returns the missing id.",
			"CALL 3 | send_email | Delivered.",
		],
		bans: ["Two-stop timelines", "Labels longer than one short word or code"],
	},
	{
		id: "timelineVertical",
		title: "Transcript rail",
		use: "An event log or transcript read top to bottom, actor or stage in its own column.",
		pickWhen: "Teaching a request/response flow: USER, AGENT, TOOL, KODY turns in order.",
		units: "3–6 events {at, title, detail}",
		slots: {
			type: "object",
			required: ["events"],
			properties: {
				events: {
					type: "array",
					minItems: 3,
					maxItems: 6,
					items: {
						type: "object",
						required: ["at", "title"],
						properties: {
							at: {
								type: "string",
								maxLength: 16,
								description: "Actor or stage label for the left column (USER, AGENT, STEP 2)",
							},
							title: { type: "string" },
							detail: { type: "string", minLength: 16 },
						},
					},
				},
			},
		},
		density: ["3–6 events", "detail clauses on most events", "actor labels short and repeated verbatim"],
		outlineHint: "Each line: ACTOR | Title | detail clause.",
		exampleOutline: [
			"USER | Asks in plain language | How did last week's campaign perform?",
			"AGENT | Picks a tool from the shared schema | get_campaign_stats with range last_week.",
			"TOOL | Returns the numbers | 128,400 impressions, 3,210 clicks, 142 conversions.",
			"AGENT | Answers with evidence | 3,210 clicks and 142 conversions, a 4.4% rate.",
		],
		bans: ["Bare titles with no detail", "Paragraphs where a clause belongs"],
	},
	{
		id: "railFlow",
		title: "Flow rail",
		use: "A compact process read left to right, three to five short named steps.",
		pickWhen: "The steps are short enough to sit side by side (fetch, write, synthesize, send).",
		units: "3–5 steps {name, detail}",
		slots: {
			type: "object",
			required: ["steps"],
			properties: {
				steps: {
					type: "array",
					minItems: 3,
					maxItems: 5,
					items: {
						type: "object",
						required: ["name", "detail"],
						properties: {
							name: { type: "string", minLength: 2, maxLength: 24 },
							detail: { type: "string", minLength: 16 },
						},
					},
				},
			},
		},
		density: ["3–5 steps", "names short enough for one column", "detail on most steps"],
		outlineHint: "Each line: StepName — short detail clause.",
		exampleOutline: [
			"Fetch sources — Pull the feeds the user follows.",
			"Write script — Draft one tight episode outline.",
			"Synthesize audio — Text to speech over the script.",
			"Send link — Deliver the hosted player.",
		],
		bans: ["Long step names that break the columns", "Six or more steps (use railSteps)"],
	},
	{
		id: "graph",
		title: "System graph",
		use: "Labelled boxes with arrows: a pipeline, an architecture, a hub with spokes.",
		pickWhen: "The relationships between parts are the lesson, not their order alone.",
		units: "3–7 nodes {key, title} + 2–10 edges {from, to}",
		slots: {
			type: "object",
			required: ["nodes", "edges"],
			properties: {
				nodes: {
					type: "array",
					minItems: 3,
					maxItems: 7,
					items: {
						type: "object",
						required: ["key", "title"],
						properties: {
							key: { type: "string", description: "Unique slug edges refer to" },
							title: { type: "string" },
							detail: { type: "string" },
							accent: { type: "boolean", description: "true on the one node the claim is about" },
							column: { type: "number", description: "Rank left to right; all nodes or none" },
							row: { type: "number", description: "Order within a rank" },
						},
					},
				},
				edges: {
					type: "array",
					minItems: 2,
					maxItems: 10,
					items: {
						type: "object",
						required: ["from", "to"],
						properties: {
							from: { type: "string" },
							to: { type: "string" },
						},
					},
				},
				dir: { type: "string", enum: ["x", "y"], description: "x = left to right (default)" },
			},
		},
		density: ["≥3 nodes and ≥2 edges", "every edge names existing keys", "one accent node at most"],
		outlineHint: "Node lines: Title | detail. Edge lines: FromTitle -> ToTitle.",
		exampleOutline: [
			"Agent | issues one call shape",
			"MCP | capability layer",
			"Memory | remembers across chats",
			"Storage | durable state per identity",
			"Agent -> MCP",
			"MCP -> Memory",
			"MCP -> Storage",
		],
		bans: ["Edges naming keys no node has", "Two-box graphs (use compare)"],
	},
	{
		id: "derivation",
		title: "Code walkthrough",
		use: "A short chain of expressions or calls where each step says what changed.",
		pickWhen: "The reasoning between code lines is the lesson, not the output alone.",
		units: "2–5 steps {expr, note}",
		slots: {
			type: "object",
			required: ["exprs"],
			properties: {
				exprs: {
					type: "array",
					minItems: 2,
					maxItems: 5,
					items: {
						type: "object",
						required: ["expr"],
						properties: {
							expr: { type: "string", description: "One mono expression or call" },
							note: {
								type: "string",
								minLength: 16,
								description: "What changed; required after the first step",
							},
							accent: { type: "boolean", description: "true on the step that lands the claim" },
						},
					},
				},
			},
		},
		density: ["2–5 steps", "every step after the first has a real note", "expressions stay one line"],
		outlineHint: "Each line: expression // note on what changed.",
		exampleOutline: [
			"value_set({ name: 'reportTimezone', value: 'Europe/Warsaw' })",
			"stored = value_get({ name: 'reportTimezone' }) // The package reads the same name at runtime.",
			"timezone = stored?.value ?? 'UTC' // A fallback keeps the report running before the value exists.",
		],
		bans: ["Unannotated steps after the first", "Multi-line code blocks in one expr"],
	},
	{
		id: "code",
		title: "Verbatim code block",
		use: "A snippet, call shape, JSON payload, or config the reader should see exactly.",
		pickWhen: "The exact characters are the lesson: a schema, a payload, a config file.",
		units: "one block, 2–14 verbatim lines",
		slots: {
			type: "object",
			required: ["code"],
			properties: {
				code: {
					type: "string",
					maxLength: 1200,
					description:
						"The snippet with \\n line breaks, drawn verbatim; a line too wide for the frame refuses instead of wrapping",
				},
				codeLabel: {
					type: "string",
					maxLength: 48,
					description: "Small mono caption above the block (a filename, a tool name)",
				},
				accentLines: {
					type: "array",
					maxItems: 14,
					items: { type: "number" },
					description: "1-based line numbers drawn in the accent",
				},
			},
		},
		density: [
			"2–14 lines, short enough to fit the frame unwrapped",
			"cut the snippet to the lines the claim needs, not the whole file",
			"a label naming the source (tool, file, endpoint)",
		],
		outlineHint: "First line LABEL: <caption> (optional); every following line is a verbatim code line.",
		exampleOutline: [
			"LABEL: value_set",
			"{",
			"  \"name\": \"reportTimezone\",",
			"  \"value\": \"Europe/Warsaw\",",
			"  \"scope\": \"user\"",
			"}",
		],
		bans: ["Whole files pasted as figures", "Lines wider than the frame", "Prose typeset as code"],
	},
];

const byId = new Map(MODULES.map((m) => [m.id, m]));

export const ARTIFACT_MODULE_IDS = MODULES.map((m) => m.id);

export const listArtifactModules = (): readonly ArtifactModuleSummary[] =>
	MODULES.map(({ id, title, use, pickWhen, units }) => ({
		id,
		title,
		use,
		pickWhen,
		units,
	}));

export const getArtifactModuleSchema = (id: string): ArtifactModuleSchema | null => {
	const key = id.trim() as ArtifactModuleId;
	return byId.get(key) ?? null;
};

export const isArtifactModuleId = (id: string): id is ArtifactModuleId =>
	byId.has(id.trim() as ArtifactModuleId);

/** Compact catalog block for system prompts (always in context). */
export const artifactCatalogPromptBlock = (): string => {
	const lines = listArtifactModules().map(
		(m) => `- ${m.id}: ${m.use} (pick when: ${m.pickWhen}) [${m.units}]`,
	);
	return `# Available artifact modules (press templates)

Discovery is mandatory before generate:
1) artifact_list
2) artifact_schema({ kinds: [/* 2–3 best candidates */] })  // multiple in one call
3) artifact_generate only for a kind returned in schemasLoaded

Modules (summary — full slots only via artifact_schema):
${lines.join("\n")}

Not available as freeform IR: stack/row/grid trees, schedule, swimlanes, icons, image.
Those stay lab-only until they have a module template here.`;
};
