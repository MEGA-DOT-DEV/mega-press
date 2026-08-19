import { describe, expect, it } from "vitest";
import { compileArtifactPlan, KIND_MODULES } from "../kinds.js";
import { getArtifactModuleSchema, listArtifactModules } from "./artifactModules.js";
import type { ArtifactKind, ArtifactPlan } from "./platePlan.js";
import { ITEM_BOUNDS } from "./slotContract.js";

const title = "A claim the figure must actually prove with slots.";

const clause = (n: number) =>
	`This is a full clause the reader can act on, numbered ${n}, not a title echo.`;

const atMax: Record<string, Partial<ArtifactPlan>> = {
	railSteps: {
		steps: Array.from({ length: ITEM_BOUNDS.railSteps.steps.max }, (_, i) => ({
			name: `Step ${i + 1}`,
			detail: clause(i + 1),
		})),
	},
	compare: {
		before: {
			label: "BEFORE",
			title: "Without the check",
			items: Array.from({ length: ITEM_BOUNDS.compare.items.max }, (_, i) => `Before fact ${i + 1}.`),
		},
		after: {
			label: "AFTER",
			title: "With the check",
			items: Array.from({ length: ITEM_BOUNDS.compare.items.max }, (_, i) => `After fact ${i + 1}.`),
		},
	},
	metrics: {
		metrics: Array.from({ length: ITEM_BOUNDS.metrics.metrics.max }, (_, i) => ({
			label: `Metric ${i + 1}`,
			value: String(i + 1),
			unit: "count",
		})),
	},
	cards: {
		cards: Array.from({ length: ITEM_BOUNDS.cards.cards.max }, (_, i) => ({
			title: `Card ${i + 1}`,
			body: clause(i + 1),
		})),
	},
	checklist: {
		checks: Array.from({ length: ITEM_BOUNDS.checklist.checks.max }, (_, i) => ({
			text: `Checkable rule number ${i + 1} that a reader can audit.`,
			ok: i % 2 === 0,
		})),
	},
	table: {
		columns: [
			{ key: "a", label: "A" },
			{ key: "b", label: "B" },
			{ key: "c", label: "C" },
		],
		rows: Array.from({ length: ITEM_BOUNDS.table.rows.max }, (_, i) => ({
			a: `row ${i + 1} a`,
			b: `row ${i + 1} b`,
			c: `row ${i + 1} c`,
		})),
	},
	layers: {
		layers: Array.from({ length: ITEM_BOUNDS.layers.layers.max }, (_, i) => ({
			title: `Layer ${i + 1}`,
			detail: clause(i + 1),
		})),
	},
	bars: {
		barUnit: "share",
		bars: Array.from({ length: ITEM_BOUNDS.bars.bars.max }, (_, i) => ({
			label: `Bar ${i + 1}`,
			value: (i + 1) * 10,
		})),
	},
	segments: {
		segmentUnit: "share",
		segmentTotal: 100,
		segments: Array.from({ length: ITEM_BOUNDS.segments.segments.max }, (_, i) => ({
			label: `Part ${i + 1}`,
			value: 20,
		})),
	},
	quadrant: {
		xLabel: "LOW TO HIGH X",
		yLabel: "LOW TO HIGH Y",
		quadrants: [
			{ title: "TL", detail: "Top left guidance the reader can use." },
			{ title: "TR", detail: "Top right guidance the reader can use." },
			{ title: "BL", detail: "Bottom left guidance the reader can use." },
			{ title: "BR", detail: "Bottom right guidance the reader can use." },
		],
	},
	timeline: {
		stops: Array.from({ length: ITEM_BOUNDS.timeline.stops.max }, (_, i) => ({
			at: `T${i + 1}`,
			title: `Stop ${i + 1}`,
			detail: clause(i + 1),
		})),
	},
	timelineVertical: {
		events: Array.from({ length: ITEM_BOUNDS.timelineVertical.events.max }, (_, i) => ({
			at: `A${i + 1}`,
			title: `Event ${i + 1}`,
			detail: clause(i + 1),
		})),
	},
	railFlow: {
		steps: Array.from({ length: ITEM_BOUNDS.railFlow.steps.max }, (_, i) => ({
			name: `Flow ${i + 1}`,
			detail: clause(i + 1),
		})),
	},
	graph: {
		nodes: Array.from({ length: ITEM_BOUNDS.graph.nodes.max }, (_, i) => ({
			key: `n${i}`,
			title: `Node ${i + 1}`,
		})),
		edges: Array.from({ length: ITEM_BOUNDS.graph.edges.max }, (_, i) => ({
			from: `n${i % ITEM_BOUNDS.graph.nodes.max}`,
			to: `n${(i + 1) % ITEM_BOUNDS.graph.nodes.max}`,
		})),
	},
	derivation: {
		exprs: Array.from({ length: ITEM_BOUNDS.derivation.exprs.max }, (_, i) => ({
			expr: `step_${i + 1}()`,
			...(i > 0 ? { note: clause(i + 1) } : {}),
		})),
	},
};

const bodyItems = (spec: Record<string, unknown>): unknown[] => {
	const body = spec.body as Record<string, unknown>;
	if (Array.isArray(body.items)) return body.items;
	if (Array.isArray(body.steps)) return body.steps;
	if (Array.isArray(body.cells)) return body.cells;
	if (Array.isArray(body.nodes)) return body.nodes;
	if (Array.isArray(body.rows)) return body.rows;
	return [];
};

describe("compile contract parity", () => {
	it("catalog min/max match the slot contract", () => {
		for (const summary of listArtifactModules()) {
			const schema = getArtifactModuleSchema(summary.id);
			expect(schema).not.toBeNull();
			const bounds = ITEM_BOUNDS[summary.id as keyof typeof ITEM_BOUNDS];
			if (!bounds) continue;
			const slots = schema?.slots as {
				properties?: Record<string, { minItems?: number; maxItems?: number }>;
			};
			for (const [slot, bound] of Object.entries(bounds)) {
				const node = slots?.properties?.[slot];
				if (!node) continue;
				expect(node.minItems, `${summary.id}.${slot} min`).toBe(bound.min);
				expect(node.maxItems, `${summary.id}.${slot} max`).toBe(bound.max);
			}
		}
	});

	it("kinds slotsSchema min/max match the slot contract", () => {
		for (const mod of KIND_MODULES) {
			const bounds = ITEM_BOUNDS[mod.id as keyof typeof ITEM_BOUNDS];
			if (!bounds) continue;
			const props = (mod.slotsSchema.properties ?? {}) as Record<
				string,
				{ minItems?: number; maxItems?: number }
			>;
			for (const [slot, bound] of Object.entries(bounds)) {
				const node = props[slot];
				if (!node) continue;
				expect(node.minItems, `${mod.id}.${slot} min`).toBe(bound.min);
				expect(node.maxItems, `${mod.id}.${slot} max`).toBe(bound.max);
			}
		}
	});

	it.each(Object.keys(atMax) as ArtifactKind[])(
		"%s at schema maxItems keeps every item",
		(kind) => {
			const plan = { kind, id: `max-${kind}`, title, ...atMax[kind] } as ArtifactPlan;
			const compiled = compileArtifactPlan(plan);
			expect(compiled.ok).toBe(true);
			if (!compiled.ok) throw new Error("expected compile");
			const items = bodyItems(compiled.spec);
			const expected =
				kind === "table"
					? ITEM_BOUNDS.table.rows.max
					: kind === "compare"
						? ITEM_BOUNDS.compare.items.max
						: kind === "graph"
							? ITEM_BOUNDS.graph.nodes.max
							: kind === "quadrant"
								? 4
								: kind === "derivation"
									? ITEM_BOUNDS.derivation.exprs.max
									: items.length;
			if (kind === "compare") {
				const body = compiled.spec.body as {
					before: { items: unknown[] };
					after: { items: unknown[] };
				};
				expect(body.before.items).toHaveLength(ITEM_BOUNDS.compare.items.max);
				expect(body.after.items).toHaveLength(ITEM_BOUNDS.compare.items.max);
				return;
			}
			if (kind === "graph") {
				const body = compiled.spec.body as { nodes: unknown[]; edges: unknown[] };
				expect(body.nodes).toHaveLength(ITEM_BOUNDS.graph.nodes.max);
				expect(body.edges).toHaveLength(ITEM_BOUNDS.graph.edges.max);
				return;
			}
			expect(items.length).toBe(expected);
		},
	);

	it("refuses one item over the advertised max instead of slicing", () => {
		const plan: ArtifactPlan = {
			kind: "railSteps",
			id: "too-many",
			title,
			steps: Array.from({ length: ITEM_BOUNDS.railSteps.steps.max + 1 }, (_, i) => ({
				name: `Step ${i + 1}`,
				detail: clause(i + 1),
			})),
		};
		const compiled = compileArtifactPlan(plan);
		expect(compiled.ok).toBe(false);
		if (compiled.ok) throw new Error("expected refuse");
		expect(compiled.errors[0]?.code).toBe("STEPS_TOO_MANY");
	});

	it("refuses metrics past the catalog max", () => {
		const plan: ArtifactPlan = {
			kind: "metrics",
			id: "too-many-metrics",
			title,
			metrics: Array.from({ length: 6 }, (_, i) => ({
				label: `M${i}`,
				value: "1",
				unit: "n",
			})),
		};
		const compiled = compileArtifactPlan(plan);
		expect(compiled.ok).toBe(false);
		if (compiled.ok) throw new Error("expected refuse");
		expect(compiled.errors[0]?.code).toBe("METRICS_TOO_MANY");
	});
});
