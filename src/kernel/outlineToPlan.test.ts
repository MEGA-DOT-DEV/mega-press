import { describe, expect, it } from "vitest";
import { outlineToPlatePlan } from "./outlineToPlan.js";
import { compileAndLockPlatePlan } from "./platePlan.js";

describe("outlineToPlatePlan", () => {
	it("builds dense railSteps from outline without a second model", () => {
		const plan = outlineToPlatePlan({
			kind: "railSteps",
			title: "Stop the loop with named gates.",
			outline: [
				"Sense — read the goal and remaining budget before any tool call.",
				"Act — call one allowed tool with a concrete argument only.",
				"Observe — compare the tool result against the written stop condition.",
				"Stop — exit on success, step limit, or required human approval.",
			],
		});
		expect(plan).not.toBeNull();
		if (plan === null) throw new Error("Expected a plan");
		const locked = compileAndLockPlatePlan(plan);
		expect(locked.ok).toBe(true);
		expect((locked.spec.body as { type: string }).type).toBe("railSteps");
		const items = (locked.spec.body as { items: unknown[] }).items;
		expect(items.length).toBe(4);
	});

	it("builds table with real column keys", () => {
		const plan = outlineToPlatePlan({
			kind: "table",
			title: "Every stop has a trigger and a next action.",
			outline: [
				"COLUMNS: trigger | rule | next",
				"Acceptance evidence | End after checks pass | Return result",
				"Budget exhausted | End when any budget hits zero | Report partial state",
				"Same failure twice | End the retry loop | Ask for missing input",
			],
		});
		expect(plan).not.toBeNull();
		if (plan === null) throw new Error("Expected a plan");
		const locked = compileAndLockPlatePlan(plan);
		expect(locked.ok).toBe(true);
		const cols = (locked.spec.body as { columns: { key: string; label: string }[] }).columns;
		expect(cols.every((c) => c.key && c.label)).toBe(true);
	});
});
