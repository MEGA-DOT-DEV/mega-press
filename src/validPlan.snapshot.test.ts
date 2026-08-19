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
});
