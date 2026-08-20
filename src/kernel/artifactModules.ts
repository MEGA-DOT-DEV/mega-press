import { ITEM_BOUNDS, STRING_CAPS } from "./slotContract.js";

/**
 * Generatable artifact modules for the article composer agent.
 * Catalog is the agent's discovery surface; compile templates remain the only
 * path to press IR (no freeform component trees from the model).
 */

export type ArtifactModuleId =
	| "railSteps"
	| "compare"
	| "compareFlows"
	| "compareSets"
	| "compareSpecs"
	| "converge"
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
	| "code"
	| "tree"
	| "codeSteps";

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
		id: "compareFlows",
		title: "Contrasted flows",
		use: "Two labelled columns side by side, each column its own vertical transcript.",
		pickWhen:
			"The lesson is a contrast between two flows read top to bottom (job vs workflow, remember vs recall, dedicated integration vs agent-built).",
		units: "2 sides × 2–6 events; each column counts as one unit",
		slots: {
			type: "object",
			required: ["left", "right"],
			properties: {
				left: {
					type: "object",
					required: ["label", "events"],
					properties: {
						label: {
							type: "string",
							maxLength: STRING_CAPS.flowLabel.max,
							description: "Small caps mono label naming the flow (JOB, REMEMBER, EARLIER)",
						},
						intro: {
							type: "string",
							maxLength: STRING_CAPS.detail.max,
							description: "Optional one or two sentences under the label framing the flow",
						},
						events: {
							type: "array",
							minItems: ITEM_BOUNDS.compareFlows.events.min,
							maxItems: ITEM_BOUNDS.compareFlows.events.max,
							items: {
								type: "object",
								required: ["at", "title"],
								properties: {
									at: {
										type: "string",
										maxLength: 16,
										description: "Actor or stage label for the column (USER, STEP 2, WAKE)",
									},
									title: { type: "string" },
									detail: { type: "string", minLength: 16 },
									code: {
										type: "string",
										maxLength: 600,
										description:
											"Optional verbatim block under the event; \\n line breaks, 2 to 8 lines, never wrapped",
									},
									accent: { type: "boolean", description: "true on the one event the claim is about" },
									chips: {
										type: "array",
										minItems: ITEM_BOUNDS.compareFlows.chips.min,
										maxItems: ITEM_BOUNDS.compareFlows.chips.max,
										description: "Optional short mono pills under the event (≤32 chars each)",
										items: {
											type: "object",
											required: ["text"],
											properties: {
												text: { type: "string", maxLength: STRING_CAPS.chip.max },
												accent: { type: "boolean" },
											},
										},
									},
								},
							},
						},
					},
				},
				right: {
					type: "object",
					required: ["label", "events"],
					properties: {
						label: { type: "string", maxLength: STRING_CAPS.flowLabel.max },
						intro: { type: "string", maxLength: STRING_CAPS.detail.max },
						events: {
							type: "array",
							minItems: ITEM_BOUNDS.compareFlows.events.min,
							maxItems: ITEM_BOUNDS.compareFlows.events.max,
							items: {
								type: "object",
								required: ["at", "title"],
								properties: {
									at: { type: "string", maxLength: 16 },
									title: { type: "string" },
									detail: { type: "string", minLength: 16 },
									code: { type: "string", maxLength: 600 },
									accent: { type: "boolean" },
									chips: {
										type: "array",
										minItems: ITEM_BOUNDS.compareFlows.chips.min,
										maxItems: ITEM_BOUNDS.compareFlows.chips.max,
										items: {
											type: "object",
											required: ["text"],
											properties: {
												text: { type: "string", maxLength: STRING_CAPS.chip.max },
												accent: { type: "boolean" },
											},
										},
									},
								},
							},
						},
					},
				},
			},
		},
		density: [
			"2–6 events per side, roughly balanced",
			"each side has a caps label; an intro sentence when the flows need framing",
			"detail clauses, a verbatim code block, or chips on most events",
			"at most one accented event per side",
		],
		outlineHint:
			"Tag lines LEFT: or RIGHT:; the first tagged line names the flow, then AT | Title | detail per event.",
		exampleOutline: [
			"LEFT: JOB, a schedule that persists",
			"LEFT: DEFINE | Names a prompt and a cron | Every Monday at 07:00.",
			"LEFT: WAKE | The scheduler fires the prompt | A fresh run, no memory of the last.",
			"RIGHT: WORKFLOW, one durable execution",
			"RIGHT: REQUEST | Starts one durable run | Input validated before step one.",
			"RIGHT: DONE | Completes exactly once | Chips: durable, resumable.",
		],
		bans: [
			"One-sided flows (use timelineVertical)",
			"Sides with fewer than two events",
			"The same events on both sides",
		],
	},
	{
		id: "compareSets",
		title: "Contrasted sets",
		use: "Two labelled panels side by side, each one claim and a set of short tags; the sizes of the two sets are part of the lesson.",
		pickWhen:
			"The contrast is between two collections rather than two sequences, and the size of the set is the argument (a scope expanding, a surface widening, a boundary moving). Use compareFlows when each side is read top to bottom in order; use compare when each side is a few prose lines.",
		units: "2 sides × {label, title, intro?, 1–8 tags}; each panel is one unit",
		slots: {
			type: "object",
			required: ["left", "right"],
			properties: {
				left: {
					type: "object",
					required: ["label", "title", "tags"],
					properties: {
						label: {
							type: "string",
							maxLength: STRING_CAPS.flowLabel.max,
							description: "Caps mono label naming the side (INITIAL SCOPE, FINAL SCOPE)",
						},
						title: {
							type: "string",
							maxLength: STRING_CAPS.setTitle.max,
							description: "The side's claim, drawn in head type",
						},
						intro: {
							type: "string",
							maxLength: STRING_CAPS.detail.max,
							description: "Optional one or two sentences framing the claim",
						},
						tags: {
							type: "array",
							minItems: ITEM_BOUNDS.compareSets.tags.min,
							maxItems: ITEM_BOUNDS.compareSets.tags.max,
							description:
								"Short mono pills in a stretched two-column grid; the count against the other side is the point",
							items: {
								type: "object",
								required: ["text"],
								properties: {
									text: {
										type: "string",
										maxLength: STRING_CAPS.tag.max,
										description: STRING_CAPS.tag.description,
									},
									accent: { type: "boolean", description: "true on the one tag the claim is about" },
								},
							},
						},
					},
				},
				right: {
					type: "object",
					required: ["label", "title", "tags"],
					properties: {
						label: { type: "string", maxLength: STRING_CAPS.flowLabel.max },
						title: { type: "string", maxLength: STRING_CAPS.setTitle.max },
						intro: { type: "string", maxLength: STRING_CAPS.detail.max },
						tags: {
							type: "array",
							minItems: ITEM_BOUNDS.compareSets.tags.min,
							maxItems: ITEM_BOUNDS.compareSets.tags.max,
							items: {
								type: "object",
								required: ["text"],
								properties: {
									text: { type: "string", maxLength: STRING_CAPS.tag.max },
									accent: { type: "boolean" },
								},
							},
						},
					},
				},
				accentSide: {
					type: "string",
					enum: ["left", "right", "none"],
					description: "Which panel takes the accent border and ground; right when absent",
				},
			},
		},
		density: [
			"1–8 tags per side, and the counts should differ — cardinality is the argument",
			"label and title on both sides; an intro on the side that needs framing",
			"at most one accented tag per side",
			"tags are short mono labels, never clauses — a sentence belongs in the intro",
		],
		outlineHint:
			"Tag lines LEFT: or RIGHT:; the first tagged line is label, title; following lines are tags, one per line, [accent] marking the chosen one.",
		exampleOutline: [
			"LEFT: INITIAL SCOPE, One integration, built by hand.",
			"LEFT: webhook",
			"LEFT: sheets",
			"RIGHT: FINAL SCOPE, Every surface the agent can reach.",
			"RIGHT: webhook",
			"RIGHT: sheets",
			"RIGHT: email",
			"RIGHT: calendar",
			"RIGHT: storage",
			"RIGHT: search [accent]",
		],
		bans: [
			"One-sided sets (use cards)",
			"Tags that are full clauses",
			"More than eight tags (that is a table)",
			"Identical tag sets on both sides",
			"An ordered process (use railSteps or compareFlows)",
		],
	},
	{
		id: "compareSpecs",
		title: "Specimen cards",
		use: "Two labelled cards side by side, each the full anatomy of one mechanism: a call shape, a two-node flow with a labelled directional edge, and a key-to-value spec sheet.",
		pickWhen:
			"Two mechanisms differ in how they connect and what properties they carry (outbound vs inbound, dedicated vs shared, push vs pull). Use compare for prose bullets, compareSets when the sides are tag rosters, compareFlows when each side is a transcript in time.",
		units: "2 cards × {label, title, call?, flow, 2–5 specs}; each card is one unit",
		slots: {
			type: "object",
			required: ["left", "right"],
			properties: {
				left: {
					type: "object",
					required: ["label", "title", "flow", "specs"],
					properties: {
						label: {
							type: "string",
							maxLength: STRING_CAPS.flowLabel.max,
							description: "Caps mono label naming the direction or family (OUTBOUND, INBOUND)",
						},
						title: {
							type: "string",
							maxLength: STRING_CAPS.setTitle.max,
							description: "The mechanism's name, drawn in head type",
						},
						call: {
							type: "string",
							maxLength: 120,
							description: "One verbatim line naming the call shape, drawn in the accent",
						},
						flow: {
							type: "object",
							required: ["from", "edge", "to"],
							properties: {
								from: {
									type: "object",
									required: ["title"],
									properties: {
										title: { type: "string", description: "The mechanism's own node" },
										detail: { type: "string", description: "Short mono clause under the name" },
									},
								},
								edge: {
									type: "object",
									required: ["text"],
									properties: {
										text: {
											type: "string",
											description: "The arrow's sentence: who dials, over what",
										},
										dir: {
											type: "string",
											enum: ["out", "in"],
											description: "out = arrow points down to the reached side; in = up",
										},
									},
								},
								to: {
									type: "object",
									required: ["title"],
									properties: { title: { type: "string" }, detail: { type: "string" } },
								},
							},
						},
						specs: {
							type: "array",
							minItems: ITEM_BOUNDS.compareSpecs.specs.min,
							maxItems: ITEM_BOUNDS.compareSpecs.specs.max,
							items: {
								type: "object",
								required: ["key", "value"],
								properties: {
									key: {
										type: "string",
										maxLength: STRING_CAPS.specKey.max,
										description: STRING_CAPS.specKey.description,
									},
									value: { type: "string", maxLength: 120 },
								},
							},
						},
					},
				},
				right: {
					type: "object",
					required: ["label", "title", "flow", "specs"],
					properties: {
						label: { type: "string", maxLength: STRING_CAPS.flowLabel.max },
						title: { type: "string", maxLength: STRING_CAPS.setTitle.max },
						call: { type: "string", maxLength: 120 },
						flow: {
							type: "object",
							required: ["from", "edge", "to"],
							properties: {
								from: {
									type: "object",
									required: ["title"],
									properties: { title: { type: "string" }, detail: { type: "string" } },
								},
								edge: {
									type: "object",
									required: ["text"],
									properties: {
										text: { type: "string" },
										dir: { type: "string", enum: ["out", "in"] },
									},
								},
								to: {
									type: "object",
									required: ["title"],
									properties: { title: { type: "string" }, detail: { type: "string" } },
								},
							},
						},
						specs: {
							type: "array",
							minItems: ITEM_BOUNDS.compareSpecs.specs.min,
							maxItems: ITEM_BOUNDS.compareSpecs.specs.max,
							items: {
								type: "object",
								required: ["key", "value"],
								properties: {
									key: { type: "string", maxLength: STRING_CAPS.specKey.max },
									value: { type: "string", maxLength: 120 },
								},
							},
						},
					},
				},
			},
		},
		density: [
			"both cards carry a real flow: two named nodes and an edge clause saying who dials, over what",
			"3–5 spec rows per side, keys short mono (≤16 chars), values concrete",
			"a call shape on both sides when the mechanisms have one",
			"mirror the spec keys across sides where the comparison allows, so rows line up",
		],
		outlineHint:
			"Tag lines LEFT: or RIGHT:; first tagged line is label, title; then CALL:, FLOW: from -> edge clause -> to, and key = value lines.",
		exampleOutline: [
			"LEFT: OUTBOUND, External MCP server",
			"LEFT: CALL: kody.mcp['name'].tool()",
			"LEFT: FLOW: Kody -> dials out over HTTP -> MCP server",
			"LEFT: reaches = publicly hosted services",
			"LEFT: auth = MCP OAuth, tokens in the Hub",
			"RIGHT: INBOUND, Remote Connector",
			"RIGHT: CALL: kody.remote['name'].tool()",
			"RIGHT: FLOW: Kody <- dials in over WebSocket <- External process",
			"RIGHT: reaches = behind NAT and firewalls",
			"RIGHT: auth = instance id + shared secret",
		],
		bans: [
			"Cards without a flow (use compare or compareSets)",
			"Spec keys that are sentences",
			"More than five spec rows (that is a table)",
			"One-sided cards",
		],
	},
	{
		id: "converge",
		title: "Funnel to durable state",
		use: "Two to four ephemeral runs in dashed cards above one accent panel they all feed; straight arrows drop from each run into the durable state it left behind.",
		pickWhen:
			"The lesson is persistence across transient executions: workers that end while their writes survive, runs sharing one object, state accreting across restarts. Use graph when the relationships branch; use timeline when the order of runs is the point.",
		units: "2–4 sources (one unit each) + 1 sink (one unit)",
		slots: {
			type: "object",
			required: ["sources", "sink"],
			properties: {
				sources: {
					type: "array",
					minItems: ITEM_BOUNDS.converge.sources.min,
					maxItems: ITEM_BOUNDS.converge.sources.max,
					items: {
						type: "object",
						required: ["name"],
						properties: {
							name: {
								type: "string",
								maxLength: STRING_CAPS.flowLabel.max,
								description: "The run's name (Job run 1)",
							},
							tag: {
								type: "string",
								maxLength: 16,
								description: "Small mono tag at the card's right (WORKER)",
							},
							lines: {
								type: "string",
								maxLength: 300,
								description:
									"1 to 3 verbatim lines with \\n breaks: what this run did to the shared state",
							},
							note: {
								type: "string",
								maxLength: 60,
								description: "Quiet closing clause (worker ends)",
							},
						},
					},
				},
				sink: {
					type: "object",
					required: ["name", "columns"],
					properties: {
						name: {
							type: "string",
							maxLength: STRING_CAPS.flowLabel.max,
							description: "The durable thing every source feeds (StorageRunner)",
						},
						tag: {
							type: "string",
							maxLength: 48,
							description:
								"Mono identity drawn in brackets beside the name (userId, job:daily-report)",
						},
						intro: {
							type: "string",
							maxLength: STRING_CAPS.detail.max,
							description: "One clause saying what survives and why",
						},
						columns: {
							type: "array",
							minItems: ITEM_BOUNDS.converge.columns.min,
							maxItems: ITEM_BOUNDS.converge.columns.max,
							items: {
								type: "object",
								required: ["label", "lines"],
								properties: {
									label: { type: "string", maxLength: STRING_CAPS.flowLabel.max },
									lines: {
										type: "string",
										maxLength: 500,
										description:
											"2 to 5 verbatim lines with \\n breaks: the surviving state, exactly",
									},
								},
							},
						},
						takeaway: {
							type: "object",
							required: ["lead"],
							properties: {
								lead: {
									type: "string",
									maxLength: 100,
									description: "The sentence the figure earns, centred in ink",
								},
								detail: { type: "string", maxLength: 160 },
							},
						},
					},
				},
			},
		},
		density: [
			"every source carries 1–3 verbatim lines (the write it made) and usually an end note",
			"the sink's ledgers hold the exact surviving state, 2–5 lines per column",
			"a takeaway lead on most plates — the sentence the funnel exists to earn",
			"source runs should visibly accrete (set 1, then get/set 2, then get/set 3)",
		],
		outlineHint:
			"RUN: name | tag lines then indented verbatim; SINK: name [tag] then column labels with verbatim lines; TAKEAWAY: the closing sentence.",
		exampleOutline: [
			"RUN: Job run 1 | WORKER",
			'  storage.set("runCount", 1)',
			"RUN: Job run 2 | WORKER",
			'  storage.get("runCount")',
			'  storage.set("runCount", 2)',
			"SINK: StorageRunner [userId, job:daily-report]",
			"  key-value: runCount = 2, lastIssue = issue-987",
			"TAKEAWAY: The worker disappears. The data remains.",
		],
		bans: [
			"A single source (a box over a box is not a funnel)",
			"Sources with no verbatim state on any run",
			"Sink ledgers past five lines (that is a table)",
			"Using it for branching architecture (use graph)",
		],
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
		units: "3–5 stops {at, title, detail, accent?}, or exactly 2 labelled tracks of 3–4 stops",
		slots: {
			type: "object",
			description:
				"Provide stops for one rail, or tracks (exactly 2 labelled rails, stacked) to contrast two runs.",
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
							accent: {
								type: "boolean",
								description: "true on the one stop the claim is about: filled red marker, red title",
							},
						},
					},
				},
				tracks: {
					type: "array",
					minItems: 2,
					maxItems: 2,
					description: "Two runs of the same sequence, each rail under its own caps mono label",
					items: {
						type: "object",
						required: ["label", "stops"],
						properties: {
							label: {
								type: "string",
								maxLength: 40,
								description: "Small caps mono label above the rail naming the run",
							},
							stops: {
								type: "array",
								minItems: 3,
								maxItems: 4,
								items: {
									type: "object",
									required: ["at", "title"],
									properties: {
										at: { type: "string", maxLength: 16 },
										title: { type: "string" },
										detail: { type: "string", minLength: 16 },
										accent: { type: "boolean" },
									},
								},
							},
						},
					},
				},
			},
		},
		density: [
			"3–5 stops",
			"detail clauses on most stops, not bare titles",
			"at most one accented stop per rail",
			"tracks: exactly 2 labelled rails when the lesson is a contrast between two runs",
		],
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
							code: {
								type: "string",
								maxLength: 600,
								description:
									"Optional verbatim block under the event: the call shape, payload, or result; \\n line breaks, 2 to 8 lines, never wrapped",
							},
							accent: {
								type: "boolean",
								description: "true on the one event the claim is about",
							},
							chips: {
								type: "array",
								minItems: 1,
								maxItems: 6,
								description:
									"Optional short mono pills under the event's detail or code: a badge, a capability shortlist, result qualities; accent: true on the one chosen chip",
								items: {
									type: "object",
									required: ["text"],
									properties: {
										text: { type: "string", maxLength: 32 },
										accent: { type: "boolean" },
									},
								},
							},
						},
					},
				},
			},
		},
		density: [
			"3–6 events",
			"detail clauses or a verbatim code block on most events",
			"actor labels short and repeated verbatim",
			"at most one accented event",
			"chips: 1–6 short pills (≤32 chars) when an event carries badges or a shortlist",
		],
		outlineHint: "Each line: ACTOR | Title | detail clause. Follow a line with indented lines to attach them as that event's code block.",
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
	{
		id: "tree",
		title: "Mono hierarchy",
		use: "A capability or file hierarchy drawn like terminal tree output, elbows as painted strokes.",
		pickWhen:
			"The lesson is what one thing contains: a server's capability map, a package layout, a config surface.",
		units: "one map: a root plus 2–5 rows below it, six drawn rows total",
		slots: {
			type: "object",
			required: ["root", "branches"],
			properties: {
				root: {
					type: "object",
					required: ["name"],
					properties: {
						name: {
							type: "string",
							maxLength: STRING_CAPS.treeName.max,
							description: "The trunk line, accent mono (kody-mcp, packages/press)",
						},
						detail: {
							type: "string",
							maxLength: STRING_CAPS.treeName.max,
							description: "Optional muted clause after the root name",
						},
					},
				},
				branches: {
					type: "array",
					minItems: ITEM_BOUNDS.tree.branches.min,
					maxItems: ITEM_BOUNDS.tree.branches.max,
					items: {
						type: "object",
						required: ["name"],
						properties: {
							name: { type: "string", maxLength: STRING_CAPS.treeName.max },
							items: {
								type: "array",
								minItems: 1,
								maxItems: 6,
								items: { type: "string", maxLength: STRING_CAPS.treeItem.max },
								description:
									"Short mono tokens on the branch's own line, joined with a spaced middle dot",
							},
							children: {
								type: "array",
								minItems: 1,
								maxItems: 4,
								description: "One level deeper at most; six drawn rows total, root included",
								items: {
									type: "object",
									required: ["name"],
									properties: {
										name: { type: "string", maxLength: STRING_CAPS.treeName.max },
										items: {
											type: "array",
											minItems: 1,
											maxItems: 6,
											items: { type: "string", maxLength: STRING_CAPS.treeItem.max },
										},
									},
								},
							},
						},
					},
				},
			},
		},
		density: [
			"2–4 branches; six drawn rows total, root included",
			"most branches or children carry 2–4 short items on their own line",
			"names stay short mono tokens; a row never wraps",
		],
		outlineHint:
			"First line is the root; indent branches by two spaces, children by four; items after the name, separated by commas.",
		exampleOutline: [
			"kody-mcp",
			"  tools: search, execute",
			"  capabilities",
			"    holds: memory, storage, values, secrets",
			"    runs: packages, jobs",
			"    reaches: integrations, email",
		],
		bans: [
			"Depth past two levels below the root",
			"Elbows typed as box-drawing characters",
			"Rows wider than the column",
		],
	},
	{
		id: "codeSteps",
		title: "Numbered code steps",
		use: "Two or three labelled verbatim blocks in a meaningful order, each under a numbered header.",
		pickWhen:
			"The lesson is a sequence of snippets: store then read, request then response, define then run.",
		units: "2–3 steps; each step (header + block) is one unit",
		slots: {
			type: "object",
			required: ["blocks"],
			properties: {
				blocks: {
					type: "array",
					minItems: ITEM_BOUNDS.codeSteps.blocks.min,
					maxItems: ITEM_BOUNDS.codeSteps.blocks.max,
					items: {
						type: "object",
						required: ["label", "code"],
						properties: {
							label: {
								type: "string",
								maxLength: STRING_CAPS.stepLabel.max,
								description: "Short mono name of the step (value_set, value_get)",
							},
							caption: {
								type: "string",
								maxLength: STRING_CAPS.detail.max,
								description: "Optional body clause after the label saying what the step does",
							},
							code: {
								type: "string",
								maxLength: 600,
								description:
									"The step's snippet with \\n line breaks, 2 to 10 lines, drawn verbatim; never wrapped",
							},
						},
					},
				},
			},
		},
		density: [
			"2–3 steps in an order that matters, 01 before 02",
			"every step labelled; captions on most steps",
			"each block 2–10 lines, cut to the lines the claim needs",
		],
		outlineHint:
			"Start each step with STEP: <label>, <caption>; every following line until the next STEP: is a verbatim code line.",
		exampleOutline: [
			"STEP: value_set, stored earlier by the user, agent, or app",
			"value_set({",
			'  "name": "reportTimezone",',
			'  "value": "Europe/Warsaw"',
			"})",
			"STEP: value_get, the package reads it at runtime, with a fallback",
			'const stored = value_get({ "name": "reportTimezone" })',
			'const timezone = stored?.value ?? "UTC"',
		],
		bans: [
			"A single block (use code)",
			"Numbers on steps whose order does not matter",
			"Blocks past ten lines",
		],
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
