import { describe, expect, it } from "vitest";
import { lockPlate } from "./lock.js";

describe("lockPlate", () => {
	it("locks a valid metrics plate", () => {
		const result = lockPlate({
			id: "loop-budget",
			frame: "landscape",
			kicker: "AGENT / LOOP",
			title: "Budgets keep curiosity from wandering.",
			body: {
				type: "metrics",
				items: [
					{ label: "Steps", value: "8", unit: "calls" },
					{ label: "Time", value: "60", unit: "s" },
				],
			},
		});
		expect(result.ok).toBe(true);
	});

	it("locks plates with no kicker (empty kicker stripped)", () => {
		const result = lockPlate({
			id: "no-kick",
			title: "A claim that does not need a kicker label.",
			kicker: "",
			body: { type: "note", content: "Body copy with real text." },
		});
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.spec.kicker).toBeUndefined();
	});

	it("locks without title, kicker, number, or footnote",
		() => {
			const result = lockPlate({
				id: "bare",
				body: { type: "note", content: "Body copy with real text." },
			});
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.spec.title).toBeUndefined();
				expect(result.spec.footnote).toBeUndefined();
				expect(result.spec.kicker).toBeUndefined();
				expect(result.spec.number).toBeUndefined();
			}
		},
	);

	it("refuses nested empty strings that would hit press text()", () => {
		const result = lockPlate({
			id: "empty-name",
			title: "Rail with a blank step name must not lock.",
			body: {
				type: "railSteps",
				items: [
					{ name: "Sense", detail: "Read state." },
					{ name: "", detail: "blank name" },
				],
			},
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.errors.some((e) => e.code === "TEXT_MISSING")).toBe(true);
		}
	});

	it("refuses metrics without units when value missing too", () => {
		const result = lockPlate({
			id: "bad",
			title: "Numbers without units are decoration.",
			body: { type: "metrics", items: [{ label: "X" }] },
		});
		expect(result.ok).toBe(false);
	});

	it("refuses withheld components", () => {
		const result = lockPlate({
			id: "img",
			title: "No invented artwork.",
			body: { type: "image", src: "https://example.com/x.png", alt: "x" },
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.errors.some((e) => e.code === "COMPONENT_WITHHELD")).toBe(true);
		}
	});

	it("normalizes callout to note and locks", () => {
		const result = lockPlate({
			id: "co",
			title: "A clear warning about tool blast radius.",
			body: { type: "callout", body: "Default deny irreversible tools." },
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			const body = result.spec.body as { type: string; content: string };
			expect(body.type).toBe("note");
			expect(body.content).toContain("Default deny");
		}
	});

	it("strips em dashes and maps note body to content", () => {
		const result = lockPlate({
			id: "dash",
			title: "A claim — with a dash.",
			body: { type: "note", body: "Hi" },
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(String(result.spec.title)).not.toMatch(/[\u2013\u2014]/);
			expect((result.spec.body as { content: string }).content).toBe("Hi");
		}
	});

	it("coerces stack children that are not objects", () => {
		const result = lockPlate({
			id: "stacky",
			title: "A claim that needs two units of evidence.",
			body: {
				type: "stack",
				gap: 3,
				children: [
					{ type: "note", content: "First point." },
					null,
					"Second point as a string.",
					{ title: "Orphan card without type", body: "Still useful." },
				],
			},
		});
		expect(result.ok).toBe(true);
	});
});
