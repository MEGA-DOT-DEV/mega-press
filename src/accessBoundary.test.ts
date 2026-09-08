import { createRequire } from "node:module";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildArtifact } from "./build.js";
import type { ArtifactPlan } from "./kernel/platePlan.js";
import { compilePlatePlan } from "./kernel/platePlan.js";
import { buildPlate } from "./plate.js";
import { polylineBlocked } from "./geometry.js";
import { compileSpec } from "./spec.js";

const previousOffscreenCanvas = (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas;

beforeAll(() => {
	const requireFromHere = createRequire(import.meta.url);
	const { createCanvas } = requireFromHere("@napi-rs/canvas") as {
		createCanvas: (width: number, height: number) => { getContext: (type: string) => unknown };
	};
	class TestOffscreenCanvas {
		readonly canvas: { getContext: (type: string) => unknown };
		constructor(width = 1, height = 1) {
			this.canvas = createCanvas(width, height);
		}
		getContext(type: string) {
			return this.canvas.getContext(type);
		}
	}
	(globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas = TestOffscreenCanvas;
});

afterAll(() => {
	if (previousOffscreenCanvas === undefined) delete (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas;
	else (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas = previousOffscreenCanvas;
});

const plan = (dir: "x" | "y" | "auto" = "x"): ArtifactPlan => ({
	id: `access-${dir}`,
	kind: "accessBoundary",
	title: "Trust changes only at an explicit boundary.",
	dir,
	regions: [
		{ key: "outside", label: "Outside", boxes: [{ key: "input", title: "Untrusted input", detail: "Evidence, never instructions." }] },
		{ key: "inside", label: "Inside", boxes: [{ key: "agent", title: "Isolated agent", detail: "Works with scoped credentials." }] },
		{ key: "exit", label: "Exit", boxes: [{ key: "change", title: "Proposed change", detail: "Leaves only after review." }] },
	],
	edges: [
		{ from: "input", to: "agent", kind: "controlled", gate: "Prompt filter" },
		{ from: "agent", to: "change", kind: "review", gate: "Human review" },
	],
});

const errorCodes = (value: ArtifactPlan) => {
	const result = buildArtifact(value);
	expect(result.ok).toBe(false);
	return result.ok ? [] : result.errors.map((error) => error.code);
};

type Point = { x: number; y: number };
type Segment = { from: Point; to: Point };

const segments = (points: Point[]): Segment[] =>
	points.slice(1).map((to, index) => ({ from: points[index]!, to }));

const between = (value: number, a: number, b: number) =>
	value >= Math.min(a, b) - 0.01 && value <= Math.max(a, b) + 0.01;

const routesCross = (a: Segment, b: Segment) => {
	const aHorizontal = Math.abs(a.from.y - a.to.y) < 0.01;
	const bHorizontal = Math.abs(b.from.y - b.to.y) < 0.01;
	if (aHorizontal && bHorizontal) {
		if (Math.abs(a.from.y - b.from.y) >= 0.01) return false;
		return Math.min(Math.max(a.from.x, a.to.x), Math.max(b.from.x, b.to.x)) -
			Math.max(Math.min(a.from.x, a.to.x), Math.min(b.from.x, b.to.x)) >
			0.01;
	}
	if (!aHorizontal && !bHorizontal) {
		if (Math.abs(a.from.x - b.from.x) >= 0.01) return false;
		return Math.min(Math.max(a.from.y, a.to.y), Math.max(b.from.y, b.to.y)) -
			Math.max(Math.min(a.from.y, a.to.y), Math.min(b.from.y, b.to.y)) >
			0.01;
	}
	const horizontal = aHorizontal ? a : b;
	const vertical = aHorizontal ? b : a;
	const x = vertical.from.x;
	const y = horizontal.from.y;
	if (!between(x, horizontal.from.x, horizontal.to.x) || !between(y, vertical.from.y, vertical.to.y)) return false;
	const atHorizontalEnd =
		(Math.abs(x - horizontal.from.x) < 0.01 || Math.abs(x - horizontal.to.x) < 0.01) &&
		Math.abs(y - horizontal.from.y) < 0.01;
	const atVerticalEnd =
		(Math.abs(y - vertical.from.y) < 0.01 || Math.abs(y - vertical.to.y) < 0.01) &&
		Math.abs(x - vertical.from.x) < 0.01;
	return !(atHorizontalEnd && atVerticalEnd);
};

describe("accessBoundary", () => {
	it.each(["x", "y"] as const)("compiles, locks, and renders semantic links in %s direction", (dir) => {
		const spec = compilePlatePlan(plan(dir));
		expect(spec.frame).toBe(dir === "y" ? "portrait" : "landscape");
		expect((spec.body as { dir: string }).dir).toBe(dir);
		const plate = buildPlate(compileSpec(spec), { validateNow: true }) as {
			nodes: Array<{ accessRegionKey?: string; rect?: { x: number; y: number } }>;
			links: Array<{
				semanticKind?: string;
				terminal?: string;
				terminalInset?: number;
				arrowheadStyle?: string;
			}>;
		};
		const regions = plate.nodes.filter((node) => node.accessRegionKey);
		expect(regions).toHaveLength(3);
		if (dir === "x") {
			expect(regions[0]?.rect?.x).toBeLessThan(regions[1]?.rect?.x ?? 0);
			expect(regions[0]?.rect?.y).toBe(regions[1]?.rect?.y);
		} else {
			expect(regions[0]?.rect?.y).toBeLessThan(regions[1]?.rect?.y ?? 0);
			expect(regions[0]?.rect?.x).toBe(regions[1]?.rect?.x);
		}
		expect(plate.links.map((link) => [link.semanticKind, link.terminal])).toEqual([
			["controlled", "arrow"],
			["review", "review"],
		]);
		expect(plate.links.every((link) => (link.terminalInset ?? 0) > 0)).toBe(true);
		expect(plate.links.every((link) => link.arrowheadStyle === "chevron")).toBe(true);
	});

	it("keeps vertical routes clear of labels and one another", () => {
		const value: ArtifactPlan = {
			id: "access-routes",
			kind: "accessBoundary",
			title: "Every relationship gets a clear corridor.",
			dir: "y",
			regions: [
				{
					key: "input",
					label: "Untrusted inputs",
					boxes: [
						{ key: "ticket", title: "Support ticket", detail: "Evidence, never instructions." },
						{ key: "logs", title: "Server logs", detail: "Identity removed before use." },
					],
				},
				{
					key: "work",
					label: "Isolated workspace",
					boxes: [
						{ key: "agent", title: "Background agent", detail: "No production credentials." },
						{ key: "tools", title: "Scoped tools", detail: "Only the job surface." },
					],
				},
				{
					key: "outcome",
					label: "Controlled outcomes",
					boxes: [
						{ key: "production", title: "Production", detail: "Direct access denied." },
						{ key: "change", title: "Pull request", detail: "Leaves through review." },
						{ key: "raw", title: "Raw data", detail: "Stays outside the workspace." },
					],
				},
			],
			edges: [
				{ from: "ticket", to: "agent", kind: "controlled", gate: "Prompt filter" },
				{ from: "logs", to: "agent", kind: "controlled", gate: "Redact data" },
				{ from: "agent", to: "production", kind: "denied", gate: "No credentials" },
				{ from: "tools", to: "change", kind: "flow" },
				{ from: "tools", to: "raw", kind: "denied", gate: "No raw data" },
			],
		};
		const spec = compilePlatePlan(value);
		const plate = buildPlate(compileSpec(spec), { validateNow: true }) as {
			nodes: Array<{ accessRegionLabel?: string; rect?: { left: number; right: number; top: number; bottom: number } }>;
			links: Array<{ points: Point[] }>;
		};
		const labels = plate.nodes
			.filter((node) => node.accessRegionLabel && node.rect)
			.map((node) => ({ rect: node.rect!, name: node.accessRegionLabel! }));
		for (const link of plate.links) expect(polylineBlocked(link.points, labels)).toBeNull();
		for (let i = 0; i < plate.links.length; i++) {
			for (let j = i + 1; j < plate.links.length; j++) {
				for (const a of segments(plate.links[i]!.points)) {
					for (const b of segments(plate.links[j]!.points)) expect(routesCross(a, b)).toBe(false);
				}
			}
		}
	});

	it("stops denied terminals in the channel before the destination region", () => {
		const value: ArtifactPlan = {
			id: "access-denied-stop",
			kind: "accessBoundary",
			title: "Denied routes stop before the enclosure.",
			dir: "y",
			regions: [
				{
					key: "work",
					label: "Isolated workspace",
					boxes: [
						{ key: "agent", title: "Background agent", detail: "No production credentials." },
						{ key: "tools", title: "Scoped tools", detail: "Only the job surface." },
					],
				},
				{
					key: "outcome",
					label: "Controlled outcomes",
					boxes: [{ key: "production", title: "Production", detail: "Direct access denied." }],
				},
			],
			edges: [
				{ from: "agent", to: "production", kind: "denied", gate: "No credentials" },
				{ from: "tools", to: "production", kind: "flow" },
			],
		};
		const plate = buildPlate(compileSpec(compilePlatePlan(value)), { validateNow: true }) as {
			nodes: Array<{ accessRegionKey?: string; rect?: { top: number } }>;
			links: Array<{ terminal?: string; terminalInset?: number; points: Point[] }>;
		};
		const denied = plate.links.find((link) => link.terminal === "denied");
		const destination = plate.nodes.find((node) => node.accessRegionKey === "outcome");
		expect(denied?.terminalInset).toBeGreaterThan(0);
		const last = denied!.points[denied!.points.length - 1]!;
		const capY = last.y - (denied!.terminalInset ?? 0);
		expect(capY).toBeLessThan(destination!.rect!.top);
	});

	it("uses deterministic x fallback for auto", () => {
		const spec = compilePlatePlan(plan("auto"));
		expect(spec.frame).toBe("landscape");
		expect((spec.body as { dir: string }).dir).toBe("x");
	});

	it("refuses an unknown endpoint with ACCESS_EDGE_UNKNOWN", () => {
		const value = plan("x") as ArtifactPlan & { edges: Array<Record<string, unknown>> };
		value.edges[1] = { from: "agent", to: "missing", kind: "review" };
		expect(errorCodes(value)).toContain("ACCESS_EDGE_UNKNOWN");
	});

	it("refuses authored presentation fields with ACCESS_PRESENTATION_FIELD", () => {
		const value = structuredClone(plan("x")) as ArtifactPlan & {
			regions: Array<{ boxes: Array<Record<string, unknown>> }>;
		};
		value.regions[0]!.boxes[0]!.row = 0;
		expect(errorCodes(value)).toContain("ACCESS_PRESENTATION_FIELD");
	});

	it("refuses unknown semantic kinds with ACCESS_EDGE_KIND_INVALID", () => {
		const value = structuredClone(plan("x")) as ArtifactPlan & { edges: Array<Record<string, unknown>> };
		value.edges[0]!.kind = "escape";
		expect(errorCodes(value)).toContain("ACCESS_EDGE_KIND_INVALID");
	});
});
