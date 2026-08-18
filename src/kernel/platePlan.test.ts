import { describe, expect, it } from "vitest";
import { buildArtifact } from "../build.js";
import { parseArtifact } from "../parse.js";
import { compileAndLockPlatePlan, compilePlatePlan, parsePlatePlan } from "./platePlan.js";

describe("platePlan", () => {
	it("compiles and locks railSteps plans", () => {
		const plan = parsePlatePlan({
			kind: "railSteps",
			id: "loop",
			title: "The loop is sense, act, observe, stop.",
			steps: [
				{ name: "Sense", detail: "Read the world state that decides the next move." },
				{ name: "Think", detail: "Pick one bounded action that advances the goal." },
				{ name: "Act", detail: "Call exactly one allowed tool with checked inputs." },
				{ name: "Observe", detail: "Compare the tool result against the stop condition." },
			],
		});
		expect(plan).not.toBeNull();
		if (plan === null) throw new Error("Expected a plan");
		const result = compileAndLockPlatePlan(plan);
		expect(result.ok).toBe(true);
		expect((result.spec.body as { type: string }).type).toBe("railSteps");
	});

	it("refuses title-echo note plates", () => {
		const result = compileAndLockPlatePlan({
			kind: "note",
			id: "echo",
			title: "A reliable agent loop stops on evidence and limits retries.",
			note: "A reliable agent loop stops on evidence and limits retries.",
		});
		expect(result.ok).toBe(false);
		expect(result.errors?.some((e) => e.code === "TITLE_ECHO" || e.code === "KIND_WEAK")).toBe(
			true,
		);
	});

	it("refuses compare when sides are thin", () => {
		expect(() =>
			compilePlatePlan({
				kind: "compare",
				id: "c",
				title: "Chat ends in text; agents end in checks.",
			}),
		).toThrow(/compare needs/);
		const locked = compileAndLockPlatePlan({
			kind: "compare",
			id: "c",
			title: "Chat ends in text; agents end in checks.",
		});
		expect(locked.ok).toBe(false);
		expect(locked.errors?.some((e) => e.code === "COMPARE_SIDES_MISSING")).toBe(true);
	});

	it("rejects unknown kinds", () => {
		expect(parsePlatePlan({ kind: "callout", id: "x", title: "Nope" })).toBeNull();
		expect(parseArtifact({ kind: "callout", id: "x", title: "Nope" }).ok).toBe(false);
	});

	it("buildArtifact matches compileAndLockPlatePlan on a valid rail", () => {
		const plan = {
			kind: "railSteps" as const,
			id: "loop",
			title: "The loop is sense, act, observe, stop.",
			steps: [
				{ name: "Sense", detail: "Read the world state that decides the next move." },
				{ name: "Think", detail: "Pick one bounded action that advances the goal." },
				{ name: "Act", detail: "Call exactly one allowed tool with checked inputs." },
				{ name: "Observe", detail: "Compare the tool result against the stop condition." },
			],
		};
		const built = buildArtifact(plan);
		const locked = compileAndLockPlatePlan(plan);
		expect(built.ok).toBe(true);
		expect(locked.ok).toBe(true);
		if (built.ok && locked.ok) expect(built.spec).toEqual(locked.spec);
	});
});
