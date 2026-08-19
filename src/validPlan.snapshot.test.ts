import { describe, expect, it } from "vitest";
import { buildArtifact } from "./build.js";
import type { ArtifactPlan } from "./kernel/platePlan.js";

/** Valid-plan fixtures. buildArtifact output must stay byte-identical to prior compileAndLock. */
const rail: ArtifactPlan = {
	kind: "railSteps",
	id: "loop",
	title: "The loop is sense, act, observe, stop.",
	steps: [
		{ name: "Sense", detail: "Read the world state that decides the next move." },
		{ name: "Think", detail: "Pick one bounded action that advances the goal." },
		{ name: "Act", detail: "Call exactly one allowed tool with checked inputs." },
		{ name: "Observe", detail: "Compare the tool result against the stop condition." },
	],
};

const table: ArtifactPlan = {
	kind: "table",
	id: "stops",
	title: "Every stop has a trigger and a next action.",
	columns: [
		{ key: "c0", label: "TRIGGER" },
		{ key: "c1", label: "RULE" },
		{ key: "c2", label: "NEXT" },
	],
	rows: [
		{ c0: "Acceptance evidence", c1: "End after checks pass", c2: "Return result" },
		{ c0: "Budget exhausted", c1: "End when any budget hits zero", c2: "Report partial state" },
		{ c0: "Same failure twice", c1: "End the retry loop", c2: "Ask for missing input" },
	],
};

const bars: ArtifactPlan = {
	kind: "bars",
	id: "loop-share",
	title: "Most of an agent loop is sensing and acting, not polishing text.",
	barUnit: "share of loop time",
	bars: [
		{ label: "Sense", value: 35 },
		{ label: "Act", value: 40 },
		{ label: "Observe", value: 25 },
	],
};

const transcript: ArtifactPlan = {
	kind: "timelineVertical",
	id: "mcp-transcript",
	title: "One schema turns a question into checked numbers.",
	events: [
		{ at: "USER", title: "Asks in plain language", detail: "How did last week's campaign perform?" },
		{
			at: "AGENT",
			title: "Picks a tool from the shared schema",
			detail: "get_campaign_stats with range last_week.",
		},
		{
			at: "TOOL",
			title: "Returns the numbers",
			detail: "128,400 impressions, 3,210 clicks, 142 conversions.",
		},
	],
};

const chippedTranscript: ArtifactPlan = {
	kind: "timelineVertical",
	id: "capability-pick",
	title: "The agent picks one capability and the pick is inspectable.",
	events: [
		{
			at: "STEP 1",
			title: "Guesses the endpoint from prose",
			detail: "No schema to check the guess against.",
			chips: [{ text: "~15% error chance" }],
		},
		{
			at: "STEP 2",
			title: "Reads the published shortlist",
			chips: [
				{ text: "email_message_search", accent: true },
				{ text: "integrations" },
				{ text: "jobs" },
				{ text: "values" },
			],
		},
		{
			at: "STEP 3",
			title: "Calls the chosen capability",
			detail: "Arguments validated against the schema before the call leaves.",
		},
	],
};

const contrastedFlows: ArtifactPlan = {
	kind: "compareFlows",
	id: "job-vs-workflow",
	frame: "square",
	title: "A Job persists a schedule; a Workflow persists one run.",
	left: {
		label: "JOB",
		intro: "A schedule that persists: the same prompt fired on a cron, every run independent.",
		events: [
			{ at: "DEFINE", title: "Names a prompt and a cron", detail: "Every Monday at 07:00, build the report." },
			{ at: "WAKE", title: "The scheduler fires the prompt", detail: "A fresh run with no memory of the last one." },
			{ at: "REPEAT", title: "Runs again next Monday", detail: "Failures do not carry over between runs." },
		],
	},
	right: {
		label: "WORKFLOW",
		intro: "One durable execution: a single run that survives restarts until it completes.",
		events: [
			{
				at: "REQUEST",
				title: "Starts one durable run",
				code: 'workflow.start({\n  "name": "weekly-report",\n  "input": { "week": 34 }\n})',
			},
			{ at: "STEP", title: "Each step checkpoints its result", detail: "A crash resumes from the last completed step." },
			{
				at: "DONE",
				title: "Completes exactly once",
				accent: true,
				chips: [{ text: "durable", accent: true }, { text: "resumable" }],
			},
		],
	},
};

const graphPlan: ArtifactPlan = {
	kind: "graph",
	id: "mcp-capability-layer",
	title: "MCP is a capability layer, not a connector.",
	nodes: [
		{ key: "agent", title: "Agent", column: 0, row: 1 },
		{ key: "mcp", title: "MCP", detail: "capability layer", accent: true, column: 1, row: 1 },
		{ key: "memory", title: "Memory", column: 2, row: 0 },
		{ key: "storage", title: "Storage", column: 2, row: 1 },
	],
	edges: [
		{ from: "agent", to: "mcp" },
		{ from: "mcp", to: "memory" },
		{ from: "mcp", to: "storage" },
	],
};

const derivationPlan: ArtifactPlan = {
	kind: "derivation",
	id: "value-roundtrip",
	title: "A value stored once is read by name forever.",
	exprs: [
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
};

const codePlan: ArtifactPlan = {
	kind: "code",
	id: "value-set-payload",
	title: "The whole configuration is four readable fields.",
	codeLabel: "value_set",
	code: '{\n  "name": "reportTimezone",\n  "value": "Europe/Warsaw",\n  "scope": "user"\n}',
	accentLines: [3],
};

const treePlan: ArtifactPlan = {
	kind: "tree",
	id: "kody-capability-map",
	title: "One server, six rows: everything kody-mcp can hold, run, and reach.",
	root: { name: "kody-mcp" },
	branches: [
		{ name: "tools", items: ["search", "execute"] },
		{
			name: "capabilities",
			children: [
				{ name: "holds", items: ["memory", "storage", "values", "secrets"] },
				{ name: "runs", items: ["packages", "jobs"] },
				{ name: "reaches", items: ["integrations", "email"] },
			],
		},
	],
};

const codeStepsPlan: ArtifactPlan = {
	kind: "codeSteps",
	id: "value-roundtrip-steps",
	title: "A value stored under a name is read back by the same name.",
	blocks: [
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
};

describe("valid-plan snapshots", () => {
	it("railSteps compile stays stable", () => {
		const result = buildArtifact(rail);
		expect(result.ok).toBe(true);
		if (!result.ok) throw new Error("expected ok");
		expect(result.spec).toMatchSnapshot();
	});

	it("table compile stays stable", () => {
		const result = buildArtifact(table);
		expect(result.ok).toBe(true);
		if (!result.ok) throw new Error("expected ok");
		expect(result.spec).toMatchSnapshot();
	});

	it("bars compile stays stable", () => {
		const result = buildArtifact(bars);
		expect(result.ok).toBe(true);
		if (!result.ok) throw new Error("expected ok");
		expect(result.spec).toMatchSnapshot();
	});

	it("timelineVertical compile stays stable", () => {
		const result = buildArtifact(transcript);
		expect(result.ok).toBe(true);
		if (!result.ok) throw new Error("expected ok");
		expect(result.spec).toMatchSnapshot();
	});

	it("timelineVertical with chips compile stays stable", () => {
		const result = buildArtifact(chippedTranscript);
		expect(result.ok).toBe(true);
		if (!result.ok) throw new Error("expected ok");
		expect(result.spec).toMatchSnapshot();
	});

	it("compareFlows compile stays stable", () => {
		const result = buildArtifact(contrastedFlows);
		expect(result.ok).toBe(true);
		if (!result.ok) throw new Error("expected ok");
		expect(result.spec).toMatchSnapshot();
	});

	it("graph compile stays stable", () => {
		const result = buildArtifact(graphPlan);
		expect(result.ok).toBe(true);
		if (!result.ok) throw new Error("expected ok");
		expect(result.spec).toMatchSnapshot();
	});

	it("derivation compile stays stable", () => {
		const result = buildArtifact(derivationPlan);
		expect(result.ok).toBe(true);
		if (!result.ok) throw new Error("expected ok");
		expect(result.spec).toMatchSnapshot();
	});

	it("code compile stays stable", () => {
		const result = buildArtifact(codePlan);
		expect(result.ok).toBe(true);
		if (!result.ok) throw new Error("expected ok");
		expect(result.spec).toMatchSnapshot();
	});

	it("tree compile stays stable", () => {
		const result = buildArtifact(treePlan);
		expect(result.ok).toBe(true);
		if (!result.ok) throw new Error("expected ok");
		expect(result.spec).toMatchSnapshot();
	});

	it("codeSteps compile stays stable", () => {
		const result = buildArtifact(codeStepsPlan);
		expect(result.ok).toBe(true);
		if (!result.ok) throw new Error("expected ok");
		expect(result.spec).toMatchSnapshot();
	});
});
