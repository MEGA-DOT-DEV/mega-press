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
	"layers",
	"checklist",
	"quote",
	"table",
	"bars",
	"segments",
	"quadrant",
	"stack",
	"row",
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
- The title is one claim the figure proves or organizes.
- The body holds about **four to six information units** (a step, card, metric row, checklist row, or table row counts as one).
- Empty half-frames are a failure: if the body is thin, add units or choose a denser component — do not ship a one-line figure.
- Prefer concrete nouns, named checks, real tradeoffs, and numbers with units.
- Do not invent statistics. Use SPECIMEN only when illustrating a shape; say so in footnote.
- footnote is short (under ~36 characters): "SOURCE: …" or "SPECIMEN".

## Placement
Emit 1 or 2 plate blocks mixed into the prose (after the claim they support).
Never first. Never last before the path blocks.

## Wire shape
{"t":"plate","spec":{
  "id":"unique-slug",
  "frame":"landscape",
  "kicker":"SECTION / ASPECT",
  "title":"The one claim this frame makes.",
  "lead":"optional orientation line",
  "footnote":"SPECIMEN",
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
7. note = {type, content}. compare = before/after {label, title, items[]}. railSteps items = {name, detail}. checklist items = {text, ok}.

## Choose the component by what the content is
  process / method / loop          railSteps
  before and after                 compare
  exact quantities                 metrics or table
  quantities compared              bars
  parts of one whole               segments
  parallel concepts                cards
  do and avoid                     checklist
  stack of layers                  layers
  one focal number                 hero
  a sharp reframe                  note
  two small nodes, one claim       stack

## Density examples (match this richness, not stub cards)
- compare: each side has a title AND 2–4 concrete items
- railSteps: 4–5 named steps with a detail clause each
- metrics: 3–5 rows, each with label, value, unit
- cards: 3–4 cards, each body a full explanatory sentence
- checklist: 4–6 rules, mix of ok true/false

## Vocabulary JSON
${JSON.stringify(vocab)}
`;
};
