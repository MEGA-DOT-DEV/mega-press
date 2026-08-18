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
});
