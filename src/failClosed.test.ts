import { describe, expect, it } from "vitest";
import { buildArtifact } from "./build.js";
import type { ArtifactKind, ArtifactPlan } from "./kernel/platePlan.js";

const title = "A claim the figure must actually prove with slots.";

const thin = (kind: ArtifactKind, extra: Partial<ArtifactPlan> = {}): ArtifactPlan => ({
	kind,
	id: `thin-${kind}`,
	title,
	...extra,
});

describe("fail-closed kinds", () => {
	it.each([
		["railSteps", "STEPS_MISSING"],
		["compare", "COMPARE_SIDES_MISSING"],
		["metrics", "METRICS_TOO_FEW"],
		["cards", "CARDS_TOO_FEW"],
		["checklist", "CHECKS_TOO_FEW"],
		["table", "COLUMNS_MISSING"],
		["layers", "LAYERS_TOO_FEW"],
		["hero", "HERO_VALUE_MISSING"],
		["bars", "BARS_TOO_FEW"],
		["segments", "SEGMENTS_TOO_FEW"],
		["quadrant", "QUADRANTS_MISSING"],
		["quote", "QUOTE_TEXT_MISSING"],
		["note", "NOTE_MISSING"],
		["timeline", "STOPS_TOO_FEW"],
		["timelineVertical", "EVENTS_TOO_FEW"],
		["railFlow", "STEPS_MISSING"],
		["graph", "GRAPH_NODES_TOO_FEW"],
		["derivation", "EXPRS_TOO_FEW"],
		["code", "CODE_MISSING"],
	] as const)("%s refuses empty slots with %s", (kind, code) => {
		const result = buildArtifact(thin(kind));
		expect(result.ok).toBe(false);
		if (result.ok) throw new Error("expected fail");
		expect(result.errors.some((e) => e.code === code)).toBe(true);
	});

	it("table with columns but no rows uses ROWS_TOO_FEW", () => {
		const result = buildArtifact(
			thin("table", {
				columns: [
					{ key: "a", label: "A" },
					{ key: "b", label: "B" },
				],
			}),
		);
		expect(result.ok).toBe(false);
		if (result.ok) throw new Error("expected fail");
		expect(result.errors.some((e) => e.code === "ROWS_TOO_FEW")).toBe(true);
	});

	it("hero with value but no caption uses HERO_CAPTION_MISSING", () => {
		const result = buildArtifact(thin("hero", { heroValue: "3" }));
		expect(result.ok).toBe(false);
		if (result.ok) throw new Error("expected fail");
		expect(result.errors.some((e) => e.code === "HERO_CAPTION_MISSING")).toBe(true);
	});

	it("graph with a dangling edge uses GRAPH_EDGE_UNKNOWN", () => {
		const result = buildArtifact(
			thin("graph", {
				nodes: [
					{ key: "a", title: "Agent" },
					{ key: "b", title: "MCP" },
					{ key: "c", title: "Memory" },
				],
				edges: [
					{ from: "a", to: "b" },
					{ from: "b", to: "missing" },
				],
			}),
		);
		expect(result.ok).toBe(false);
		if (result.ok) throw new Error("expected fail");
		expect(result.errors.some((e) => e.code === "GRAPH_EDGE_UNKNOWN")).toBe(true);
	});

	it("derivation with an unnoted later step uses DERIVATION_NOTE_MISSING", () => {
		const result = buildArtifact(
			thin("derivation", {
				exprs: [{ expr: "value_set({ name: 'tz' })" }, { expr: "value_get({ name: 'tz' })" }],
			}),
		);
		expect(result.ok).toBe(false);
		if (result.ok) throw new Error("expected fail");
		expect(result.errors.some((e) => e.code === "DERIVATION_NOTE_MISSING")).toBe(true);
	});
});
