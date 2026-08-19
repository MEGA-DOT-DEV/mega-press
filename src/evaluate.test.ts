import { describe, expect, it } from "vitest";
import { buildArtifact } from "./build.js";
import { evaluateSpec, proveArtifact } from "./evaluate.js";
import { compileArtifactPlan } from "./kinds.js";
import { lockPlate } from "./kernel/lock.js";
import type { ArtifactPlan } from "./kernel/platePlan.js";
import { STRING_CAPS } from "./kernel/slotContract.js";

const title = "The loop is sense, act, observe, stop.";

const rail = (extra: Partial<ArtifactPlan> = {}): ArtifactPlan => ({
	kind: "railSteps",
	id: "loop",
	title,
	steps: [
		{ name: "Sense", detail: "Read the world state that decides the next move." },
		{ name: "Think", detail: "Pick one bounded action that advances the goal." },
		{ name: "Act", detail: "Call exactly one allowed tool with checked inputs." },
		{ name: "Observe", detail: "Compare the tool result against the stop condition." },
	],
	...extra,
});

const compileOk = (plan: ArtifactPlan) => {
	const compiled = compileArtifactPlan(plan);
	if (!compiled.ok) throw new Error(compiled.errors.map((e) => e.message).join("; "));
	return compiled.spec;
};

describe("geometric prove", () => {
	it("a valid rail locks geometrically", () => {
		const spec = compileOk(rail());
		const proved = proveArtifact(spec);
		expect(proved.ok).toBe(true);
		if (!proved.ok) throw new Error("expected lock");
		expect(proved.spec.frame).toBe("landscape");
		expect(proved.spec.steppedFrom).toBeUndefined();
	});

	it("a tall rail escalates off landscape and records steppedFrom", () => {
		const long = (n: number) =>
			`Clause ${n}: ${"the next allowed move must be forced by evidence, not fluency, ".repeat(4)}end.`;
		const spec = compileOk(
			rail({
				id: "tall-rail",
				steps: [
					{ name: "Sense", detail: long(1) },
					{ name: "Think", detail: long(2) },
					{ name: "Act", detail: long(3) },
					{ name: "Observe", detail: long(4) },
					{ name: "Stop", detail: long(5) },
				],
			}),
		);
		const landscape = evaluateSpec({ ...spec, frame: "landscape" });
		expect(landscape.ok).toBe(false);
		if (landscape.ok) throw new Error("expected landscape overflow");
		expect(
			landscape.errors.some((e) => e.code === "CONTENT_OVERFLOW" || e.code === "TEXT_OVERFLOW"),
		).toBe(true);

		const proved = proveArtifact({ ...spec, frame: "landscape" });
		if (!proved.ok) {
			throw new Error(proved.errors.map((e) => `${e.code}: ${e.message}`).join("; "));
		}
		expect(proved.spec.frame).not.toBe("landscape");
		expect(proved.spec.steppedFrom).toBe("landscape");
	});

	it("a plate too long for every frame refuses in author currency", () => {
		const item = (n: number) =>
			`Fact ${n}: ${"a concrete check the reader can actually perform, ".repeat(5)}end.`;
		const spec = compileOk({
			kind: "compare",
			id: "too-tall",
			title: "A claim that still sits under the sanity cap but not the frame.",
			lead: "L".repeat(180),
			before: {
				label: "BEFORE",
				title: "Without the check",
				items: [1, 2, 3, 4, 5].map(item),
			},
			after: {
				label: "AFTER",
				title: "With the check",
				items: [6, 7, 8, 9, 10].map(item),
			},
		});
		const proved = proveArtifact(spec);
		expect(proved.ok).toBe(false);
		if (proved.ok) throw new Error("expected refuse");
		const text = proved.errors.map((e) => `${e.code}: ${e.message}`).join("\n");
		expect(text).toMatch(/TEXT_OVERFLOW|CONTENT_OVERFLOW/);
		expect(text).toMatch(/character|unit|line/i);
	});

	it("sanity caps fire at the structural lock with the named bound", () => {
		const locked = lockPlate({
			id: "long-title",
			title: "T".repeat(300),
			body: {
				type: "note",
				content: "Body copy with real text that is not empty.",
			},
		});
		expect(locked.ok).toBe(false);
		if (locked.ok) throw new Error("expected refuse");
		const hit = locked.errors.find((e) => e.code === "TITLE_TOO_LONG");
		expect(hit).toBeTruthy();
		expect(hit?.message).toContain(String(STRING_CAPS.title.max));
		expect(hit?.message).toContain("300");
	});

	it("a 90-character title clears the sanity cap", () => {
		const locked = lockPlate({
			id: "ok-title",
			title: "A reasonably long title that still sits under the garbage guard easily.",
			body: { type: "note", content: "Body copy with real text that is not empty." },
		});
		expect(locked.ok).toBe(true);
	});

	it("buildArtifact still locks the existing valid rail", () => {
		const built = buildArtifact(rail());
		expect(built.ok).toBe(true);
	});
});
