/**
 * Lab-faithful plate vocabulary + craft brief for generation prompts.
 * Structural lock still enforces shapes; this steers meaning and density.
 */

export const PLATE_FRAMES = ["landscape", "portrait", "square"] as const;
export type PlateFrame = (typeof PLATE_FRAMES)[number];

export const WITHHELD_COMPONENTS = ["image", "placeholder", "donut"] as const;

/** Components the writer may use in v1. */
export const ALLOWED_COMPONENTS = [
	"metrics",
	"cards",
	"note",
	"hero",
	"railSteps",
	"compare",
	"compareFlows",
	"layers",
	"checklist",
	"quote",
	"table",
	"bars",
	"segments",
	"quadrant",
	"stack",
	"row",
	"timeline",
	"timelineVertical",
	"railFlow",
	"graph",
	"derivation",
	"code",
] as const;

export type AllowedComponent = (typeof ALLOWED_COMPONENTS)[number];

export const COMPONENT_GUIDE: Record<string, { readonly use: string; readonly example: unknown }> =
	{
		metrics: {
			use: "exact quantities with units — budgets, limits, counts",
			example: {
				type: "metrics",
				items: [
					{ label: "Step budget", value: "8", unit: "tool calls" },
					{ label: "Time box", value: "60", unit: "seconds" },
					{ label: "Write tools", value: "0", unit: "until approval" },
					{ label: "Human gates", value: "1", unit: "irreversible acts" },
				],
			},
		},
		railSteps: {
			use: "a process or method where order matters",
			example: {
				type: "railSteps",
				items: [
					{ name: "Sense", detail: "Read only the state needed for the next decision." },
					{ name: "Think", detail: "Choose one action and name the expected result." },
					{ name: "Act", detail: "Call one permitted tool with bounded arguments." },
					{ name: "Observe", detail: "Compare the tool result to the goal, not to fluency." },
					{ name: "Stop or continue", detail: "Exit on success, limit, or human gate." },
				],
			},
		},
		compare: {
			use: "before and after, or two competing shapes",
			example: {
				type: "compare",
				before: {
					label: "CHAT",
					title: "One completion",
					items: [
						"Ends when the text ends.",
						"No tool result to check.",
						"Fluency is easy to mistake for progress.",
					],
				},
				after: {
					label: "AGENT",
					title: "A checked world state",
					items: [
						"Each turn can change what is known.",
						"Tool results become evidence.",
						"Stop conditions make the loop inspectable.",
					],
				},
			},
		},
		compareFlows: {
			use: "two flows contrasted side by side, each column a labelled vertical transcript with its own rail: job vs workflow, remember vs recall, dedicated integration vs agent-built; each side = {label, intro?, items[]} with items shaped like timelineVertical events ({date, title, detail?, code?, accent?, chips?}), 2 to 6 per side",
			example: {
				type: "compareFlows",
				left: {
					label: "JOB",
					intro: "A schedule that persists: the same prompt fired on a cron, every run independent.",
					items: [
						{ date: "DEFINE", title: "Names a prompt and a cron", detail: "Every Monday at 07:00, build the weekly report." },
						{ date: "WAKE", title: "The scheduler fires the prompt", detail: "A fresh run with no memory of the last one." },
						{ date: "REPEAT", title: "Runs again next Monday", detail: "Failures do not carry over; each run stands alone." },
					],
				},
				right: {
					label: "WORKFLOW",
					intro: "One durable execution: a single run that survives restarts until it completes.",
					items: [
						{
							date: "REQUEST",
							title: "Starts one durable run",
							code: 'workflow.start({\n  "name": "onboard-customer",\n  "input": { "plan": "pro" }\n})',
						},
						{ date: "STEP", title: "Each step checkpoints its result", detail: "A crash resumes from the last completed step, not from zero." },
						{
							date: "DONE",
							title: "Completes exactly once",
							accent: true,
							chips: [{ text: "durable", accent: true }, { text: "resumable" }, { text: "auditable" }],
						},
					],
				},
			},
		},
		cards: {
			use: "parallel concepts the reader should hold at once",
			example: {
				type: "cards",
				items: [
					{
						title: "Goal",
						body: "Outcome plus observable completion checks, not a vague wish.",
					},
					{
						title: "Evidence",
						body: "Facts with sources: tool output, records, prior approvals.",
					},
					{
						title: "Budget",
						body: "Remaining turns, time, and which writes still need a human.",
					},
					{
						title: "Recovery",
						body: "Missing info, bad args, denied permission, or external fault.",
					},
				],
			},
		},
		note: {
			use: "one sharp callout that reframes the claim — not a whole lesson",
			example: {
				type: "note",
				content: "Tool success is not task success. An HTTP 200 can still leave the goal unmet.",
			},
		},
		hero: {
			use: "one focal number the prose is about",
			example: {
				type: "hero",
				value: "3",
				caption: "TOOL ROUNDS BEFORE STOP",
			},
		},
		checklist: {
			use: "do and avoid — concrete practice rules",
			example: {
				type: "checklist",
				items: [
					{ text: "Write the stop condition before the system prompt.", ok: true },
					{ text: "Log every tool call with arguments and result.", ok: true },
					{ text: "Default-deny irreversible tools.", ok: true },
					{ text: "Add personality to fix a broken loop.", ok: false },
					{ text: "Widen permissions because the happy path worked once.", ok: false },
				],
			},
		},
		quote: {
			use: "a short attributed claim",
			example: {
				type: "quote",
				text: "A figure must add structure the prose does not already state.",
				attribution: "MEGA",
			},
		},
		table: {
			use: "exact rows the reader might scan",
			example: {
				type: "table",
				columns: [
					{ key: "mode", label: "FAILURE", type: "text", grow: true },
					{ key: "fix", label: "GUARD", type: "text", grow: true },
				],
				rows: [
					{ mode: "Retry same call", fix: "Step limit + already-tried memory" },
					{ mode: "Silent wrong answer", fix: "Require evidence tools" },
					{ mode: "Overreach write", fix: "Human gate on irreversible tools" },
				],
			},
		},
		bars: {
			use: "quantities compared on one scale",
			example: {
				type: "bars",
				unit: "share of loop time",
				items: [
					{ label: "Sense", value: 35 },
					{ label: "Act", value: 40 },
					{ label: "Observe", value: 25 },
				],
			},
		},
		segments: {
			use: "parts of one whole",
			example: {
				type: "segments",
				unit: "permission surface",
				total: 100,
				items: [
					{ label: "Read", value: 55 },
					{ label: "Draft", value: 30 },
					{ label: "Write gated", value: 15 },
				],
			},
		},
		layers: {
			use: "a stack read top to bottom",
			example: {
				type: "layers",
				items: [
					{ title: "Policy", detail: "What the agent may never do alone." },
					{ title: "Tools", detail: "Schemas, permissions, honest errors." },
					{ title: "Model", detail: "Chooses the next step under the policy." },
				],
			},
		},
		quadrant: {
			use: "two-by-two tradeoff frame",
			example: {
				type: "quadrant",
				xLabel: "Reversible",
				yLabel: "Autonomy",
				items: [{ label: "Draft reply", x: 0.8, y: 0.7 }],
			},
		},
		stack: {
			use: "two related components in one frame when one claim needs both",
			example: {
				type: "stack",
				gap: 3,
				children: [
					{
						type: "metrics",
						items: [
							{ label: "Max turns", value: "8", unit: "calls" },
							{ label: "Approval", value: "1", unit: "gate" },
						],
					},
					{
						type: "note",
						content: "Raise the budget only after the stop condition is explicit.",
					},
				],
			},
		},
		row: {
			use: "side-by-side composition of two small nodes",
			example: {
				type: "row",
				gap: 3,
				children: [
					{ type: "note", content: "Read tools can be broader." },
					{ type: "note", content: "Write tools stay gated." },
				],
			},
		},
		timeline: {
			use: "events or calls in order, read left to right, when the intervals do not matter; an item may set accent: true on the one stop the claim is about, and a rail may carry a label (small caps mono above it) so two labelled rails stacked in one frame contrast two runs",
			example: {
				type: "timeline",
				label: "DIRECT API CALL, NO HINT",
				items: [
					{ date: "CALL 1", title: "send_email", detail: "Fails: missing audience_id." },
					{ date: "HINT", title: "Error names the next step", detail: "Call list_audiences first." },
					{ date: "CALL 2", title: "list_audiences", detail: "Returns the missing id." },
					{ date: "CALL 3", title: "send_email", detail: "Delivered.", accent: true },
				],
			},
		},
		timelineVertical: {
			use: "an event log or transcript read top to bottom, the label (actor, stage, or date) in its own column; an event may carry a verbatim code block (the call, payload, or result the event is about), accent: true on the one event the claim is about, and chips: 1 to 6 short mono pills under the detail or code ({text, accent?}, 32 chars max) for badges, a capability shortlist, or result qualities",
			example: {
				type: "timelineVertical",
				items: [
					{
						date: "MCP",
						title: "Publishes one tool schema",
						code: '{\n  "tools": ["send_email", "get_campaign_stats", "list_audiences"]\n}',
						accent: true,
					},
					{
						date: "USER",
						title: "Asks in plain language",
						detail: "How did last week's campaign perform?",
					},
					{
						date: "AGENT",
						title: "Picks a capability from the shortlist",
						chips: [
							{ text: "get_campaign_stats", accent: true },
							{ text: "send_email" },
							{ text: "list_audiences" },
						],
					},
					{
						date: "AGENT",
						title: "Answers with evidence",
						detail: "3,210 clicks and 142 conversions, a 4.4% conversion rate.",
						chips: [{ text: "predictable" }, { text: "cheap" }],
					},
				],
			},
		},
		railFlow: {
			use: "a compact process read left to right, three to five short named steps",
			example: {
				type: "railFlow",
				items: [
					{ name: "Fetch sources", detail: "Pull the feeds the user follows." },
					{ name: "Write script", detail: "Draft one tight episode outline." },
					{ name: "Synthesize audio", detail: "Text to speech over the script." },
					{ name: "Send link", detail: "Deliver the hosted player." },
				],
			},
		},
		graph: {
			use: "a system of labelled boxes with arrows: a pipeline, an architecture, a hub with spokes",
			example: {
				type: "graph",
				dir: "x",
				nodes: [
					{ key: "agent", title: "Agent", column: 0, row: 1 },
					{ key: "mcp", title: "MCP", detail: "capability layer", accent: true, column: 1, row: 1 },
					{ key: "memory", title: "Memory", column: 2, row: 0 },
					{ key: "storage", title: "Storage", column: 2, row: 1 },
					{ key: "email", title: "Email", column: 2, row: 2 },
				],
				edges: [
					{ from: "agent", to: "mcp" },
					{ from: "mcp", to: "memory" },
					{ from: "mcp", to: "storage" },
					{ from: "mcp", to: "email" },
				],
			},
		},
		derivation: {
			use: "a short chain of expressions or calls where each step says what changed, the code walkthrough shape",
			example: {
				type: "derivation",
				steps: [
					{ expr: "value_set({ name: 'reportTimezone', value: 'Europe/Warsaw' })" },
					{
						expr: "stored = value_get({ name: 'reportTimezone' })",
						note: "The package reads the same name at runtime instead of asking again.",
					},
					{
						expr: "timezone = stored?.value ?? 'UTC'",
						note: "A fallback keeps the report running before the value exists.",
						accent: true,
					},
				],
			},
		},
		code: {
			use: "a verbatim snippet, call shape, JSON payload, or config the reader should see exactly, drawn line by line with no wrapping",
			example: {
				type: "code",
				label: "value_set",
				code: '{\n  "name": "reportTimezone",\n  "value": "Europe/Warsaw",\n  "scope": "user"\n}',
				accentLines: [3],
			},
		},
	};

export const platesPromptSection = (): string => {
	const vocab = ALLOWED_COMPONENTS.map((name) => {
		const g = COMPONENT_GUIDE[name];
		return {
			name,
			use: g?.use,
			example: g?.example,
		};
	});

	return `# Plates (artifacts)

A plate is a fixed frame of **evidence that teaches**, not decoration and not a path node.
If the surrounding prose were hidden, a good plate would still carry the concept.

## What "good" means
- A title, when present, is one claim the figure proves or organizes. It is optional; hosts may keep it and not paint it.
- kicker, number, and footnote are optional chase chrome. Omit them. Do not invent SPECIMEN.
- The body holds about **four to six information units** (a step, card, metric row, checklist row, or table row counts as one).
- Empty half-frames are a failure: if the body is thin, add units or choose a denser component — do not ship a one-line figure.
- Prefer concrete nouns, named checks, real tradeoffs, and numbers with units.
- Do not invent statistics.

## Placement
Emit 1 or 2 plate blocks mixed into the prose (after the claim they support).
Never first. Never last before the path blocks.

## Wire shape
{"t":"plate","spec":{
  "id":"unique-slug",
  "frame":"landscape",
  "title":"The one claim this frame makes.",
  "body":{ "type":"railSteps", "items":[ ... ] }
}}

body is exactly one node: {"type":"<component>", ...params}.
Compose two nodes with {"type":"stack","gap":3,"children":[...]} when one claim needs both.

## Refusals (the lock will drop the frame)
1. One frame, one claim.
2. Every metric/hero number has a unit or caption saying what it counts.
3. No em dashes or en dashes.
4. No components: ${WITHHELD_COMPONENTS.join(", ")}.
5. Only these body types: ${ALLOWED_COMPONENTS.join(", ")}.
6. Never invent types (callout, infobox, alert). Use note with content.
7. note = {type, content}. compare = before/after {label, title, items[]}. compareFlows = left/right {label, intro?, items[]} (each side a labelled vertical transcript; items shaped like timelineVertical items, 2 to 6 per side). railSteps/railFlow items = {name, detail}. checklist items = {text, ok}. timeline/timelineVertical items = {date, title, detail?, accent?} (date is the short label column: an actor, stage, or date; accent: true marks the one stop the claim is about). A timeline node may add label (small caps mono above the rail naming the run); stack two labelled timelines to contrast two runs. A timelineVertical item may add code (a verbatim block, 2 to 8 lines with \\n breaks) and chips (1 to 6 short mono pills {text, accent?}, 32 chars max, drawn under the detail or code). graph = nodes {key, title, detail?} + edges {from, to}. derivation steps = {expr, note} (note required after the first step). code = {code, label?, accentLines?} (code is one string with \\n line breaks, 2 to 14 lines, drawn verbatim; a line too wide for the frame refuses instead of wrapping).

## Choose the component by what the content is
  process / method / loop          railSteps
  before and after                 compare
  two flows contrasted side by side   compareFlows
  exact quantities                 metrics or table
  quantities compared              bars
  parts of one whole               segments
  parallel concepts                cards
  do and avoid                     checklist
  stack of layers                  layers
  one focal number                 hero
  a sharp reframe                  note
  two small nodes, one claim       stack
  events or calls in order         timeline
  transcript, actor log            timelineVertical
  compact left-to-right flow       railFlow
  system, architecture, hub        graph
  code walkthrough, annotated      derivation
  verbatim snippet or JSON         code

## Density examples (match this richness, not stub cards)
- compare: each side has a title AND 2–4 concrete items
- compareFlows: each side has a caps label, usually an intro sentence, and 2–4 events with detail clauses, a code block, or chips
- railSteps: 4–5 named steps with a detail clause each
- metrics: 3–5 rows, each with label, value, unit
- cards: 3–4 cards, each body a full explanatory sentence
- checklist: 4–6 rules, mix of ok true/false
- timelineVertical: 3–5 rows, each with a short label, a title, and a detail clause
- graph: 4–6 nodes with at least three edges, every node a real part of the system
- derivation: 2–4 expressions, every step after the first annotated with what changed
- code: 4–12 verbatim lines, short enough to fit the frame unwrapped, with a label naming the source

## Vocabulary JSON
${JSON.stringify(vocab)}
`;
};
