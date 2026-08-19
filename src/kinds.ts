/**
 * Per-kind compile registry. Valid-input IR stays byte-identical to the
 * previous compilePlatePlan switch; thin/missing slots fail closed.
 */
import type { ArtifactKind, ArtifactPlan } from "./kernel/platePlan.js";
import { normalizePlateSpec } from "./kernel/normalize.js";

export type ArtifactError = {
	readonly code: string;
	readonly message: string;
};

export type CompileOk = { readonly ok: true; readonly spec: Record<string, unknown> };
export type CompileFail = {
	readonly ok: false;
	readonly errors: readonly ArtifactError[];
};
export type CompileResult = CompileOk | CompileFail;

export type KindModule = {
	readonly id: ArtifactKind;
	readonly slotsSchema: Record<string, unknown>;
	readonly compile: (plan: ArtifactPlan) => CompileResult;
};

const fail = (code: string, message: string): CompileFail => ({
	ok: false,
	errors: [{ code, message }],
});

const plateBase = (plan: ArtifactPlan): Record<string, unknown> => ({
	id: plan.id || `plate-${plan.kind}`,
	frame: "landscape" as const,
	...(plan.title ? { title: plan.title } : {}),
	...(typeof plan.footnote === "string" && plan.footnote.trim().length > 0
		? { footnote: plan.footnote.trim().slice(0, 36) }
		: {}),
	...(plan.kicker ? { kicker: plan.kicker } : {}),
	...(plan.number ? { number: plan.number } : {}),
	...(plan.lead ? { lead: plan.lead } : {}),
});

const finish = (plan: ArtifactPlan, body: Record<string, unknown>): CompileOk => ({
	ok: true,
	spec: normalizePlateSpec({ ...plateBase(plan), body }),
});

const railSteps: KindModule = {
	id: "railSteps",
	slotsSchema: {
		type: "object",
		required: ["steps"],
		properties: {
			steps: {
				type: "array",
				minItems: 4,
				maxItems: 6,
				items: {
					type: "object",
					required: ["name", "detail"],
					properties: {
						name: { type: "string" },
						detail: { type: "string" },
					},
				},
			},
		},
	},
	compile(plan) {
		const steps = (plan.steps ?? [])
			.map((s) => ({
				name: String(s.name ?? "").trim(),
				detail: String(s.detail ?? "").trim(),
			}))
			.filter((s) => s.name.length > 0)
			.slice(0, 4)
			.map((s) => ({
				name: s.name,
				...(s.detail ? { detail: s.detail } : {}),
			}));
		if (steps.length < 2) {
			return fail("STEPS_MISSING", "railSteps needs at least two named steps");
		}
		return finish(plan, { type: "railSteps", items: steps });
	},
};

const compare: KindModule = {
	id: "compare",
	slotsSchema: {
		type: "object",
		required: ["before", "after"],
		properties: {
			before: { type: "object" },
			after: { type: "object" },
		},
	},
	compile(plan) {
		const before = plan.before;
		const after = plan.after;
		if (!before || !after) {
			return fail("COMPARE_SIDES_MISSING", "compare needs before and after sides");
		}
		const beforeItems = [...before.items].slice(0, 5);
		const afterItems = [...after.items].slice(0, 5);
		if (beforeItems.length < 2 || afterItems.length < 2) {
			return fail("COMPARE_SIDES_MISSING", "compare needs ≥2 items on each side");
		}
		return finish(plan, {
			type: "compare",
			before: { label: before.label, title: before.title, items: beforeItems },
			after: { label: after.label, title: after.title, items: afterItems },
		});
	},
};

const metrics: KindModule = {
	id: "metrics",
	slotsSchema: {
		type: "object",
		required: ["metrics"],
		properties: { metrics: { type: "array", minItems: 3 } },
	},
	compile(plan) {
		const metricsRows = (plan.metrics ?? []).slice(0, 6);
		if (metricsRows.length < 2) {
			return fail("METRICS_TOO_FEW", "metrics needs at least two {label, value, unit} rows");
		}
		return finish(plan, {
			type: "metrics",
			items: metricsRows.map((m) => ({
				label: m.label,
				value: String(m.value),
				unit: m.unit || "count",
			})),
		});
	},
};

const cards: KindModule = {
	id: "cards",
	slotsSchema: {
		type: "object",
		required: ["cards"],
		properties: { cards: { type: "array", minItems: 3 } },
	},
	compile(plan) {
		const cardRows = (plan.cards ?? []).slice(0, 5);
		if (cardRows.length < 2) {
			return fail("CARDS_TOO_FEW", "cards needs at least two {title, body} cards");
		}
		return finish(plan, {
			type: "cards",
			items: cardRows.map((c) => ({ title: c.title, body: c.body })),
		});
	},
};

const checklist: KindModule = {
	id: "checklist",
	slotsSchema: {
		type: "object",
		required: ["checks"],
		properties: { checks: { type: "array", minItems: 4 } },
	},
	compile(plan) {
		const checks = (plan.checks ?? []).slice(0, 8);
		if (checks.length < 2) {
			return fail("CHECKS_TOO_FEW", "checklist needs at least two {text, ok} lines");
		}
		return finish(plan, {
			type: "checklist",
			items: checks.map((c) => ({ text: c.text, ok: Boolean(c.ok) })),
		});
	},
};

const table: KindModule = {
	id: "table",
	slotsSchema: {
		type: "object",
		required: ["columns", "rows"],
		properties: {
			columns: { type: "array", minItems: 2 },
			rows: { type: "array", minItems: 2 },
		},
	},
	compile(plan) {
		const rawCols = plan.columns;
		if (!rawCols || rawCols.length < 2) {
			return fail("COLUMNS_MISSING", "table needs at least two columns with key + label");
		}
		const columns = rawCols.map((c, i) => ({
			key: String(c.key || `c${i}`),
			label: String(c.label || `COL ${i + 1}`).toUpperCase(),
			type: "text" as const,
			grow: i === 0,
		}));
		const keys = columns.map((c) => c.key);
		if (!plan.rows || plan.rows.length < 2) {
			return fail("ROWS_TOO_FEW", "table needs at least two data rows");
		}
		const rows = plan.rows.map((r) => {
			const out: Record<string, string> = {};
			keys.forEach((k, i) => {
				const v = r[k] ?? r[String(i)] ?? r[i as unknown as string];
				out[k] = v != null ? String(v) : "";
			});
			return out;
		});
		return finish(plan, { type: "table", columns, rows });
	},
};

const layers: KindModule = {
	id: "layers",
	slotsSchema: {
		type: "object",
		required: ["layers"],
		properties: { layers: { type: "array", minItems: 2 } },
	},
	compile(plan) {
		const layerRows = (plan.layers ?? []).slice(0, 5);
		if (layerRows.length < 2) {
			return fail("LAYERS_TOO_FEW", "layers needs at least two {title, detail} layers");
		}
		return finish(plan, {
			type: "layers",
			items: layerRows.map((l) => ({ title: l.title, detail: l.detail })),
		});
	},
};

const hero: KindModule = {
	id: "hero",
	slotsSchema: {
		type: "object",
		required: ["heroValue", "heroCaption"],
		properties: {
			heroValue: { type: "string" },
			heroCaption: { type: "string" },
		},
	},
	compile(plan) {
		const value = plan.heroValue?.trim();
		const caption = plan.heroCaption?.trim();
		if (!value) return fail("HERO_VALUE_MISSING", "hero needs heroValue");
		if (!caption) return fail("HERO_CAPTION_MISSING", "hero needs heroCaption");
		return finish(plan, { type: "hero", value, caption });
	},
};

const bars: KindModule = {
	id: "bars",
	slotsSchema: {
		type: "object",
		required: ["bars"],
		properties: { bars: { type: "array", minItems: 3 } },
	},
	compile(plan) {
		if (!plan.bars || plan.bars.length < 2) {
			return fail("BARS_TOO_FEW", "bars needs at least two {label, value} items");
		}
		return finish(plan, {
			type: "bars",
			unit: plan.barUnit?.trim() || "share",
			items: plan.bars.map((b) => ({
				label: String(b.label),
				value: Number(b.value),
			})),
		});
	},
};

const segments: KindModule = {
	id: "segments",
	slotsSchema: {
		type: "object",
		required: ["segments"],
		properties: { segments: { type: "array", minItems: 3 } },
	},
	compile(plan) {
		if (!plan.segments || plan.segments.length < 2) {
			return fail("SEGMENTS_TOO_FEW", "segments needs at least two {label, value} parts");
		}
		const items = plan.segments.map((s) => ({
			label: String(s.label),
			value: Number(s.value),
		}));
		const sum = items.reduce((a, i) => a + Number(i.value), 0);
		return finish(plan, {
			type: "segments",
			unit: plan.segmentUnit?.trim() || "share",
			total: plan.segmentTotal ?? sum,
			items,
		});
	},
};

const quadrant: KindModule = {
	id: "quadrant",
	slotsSchema: {
		type: "object",
		required: ["quadrants"],
		properties: { quadrants: { type: "array", minItems: 4, maxItems: 4 } },
	},
	compile(plan) {
		const cellsRaw = (plan.quadrants ?? []).slice(0, 4);
		if (cellsRaw.length !== 4) {
			return fail("QUADRANTS_MISSING", "quadrant needs exactly four cells (TL TR BL BR)");
		}
		return finish(plan, {
			type: "quadrant",
			x: plan.xLabel?.trim() || "LOW TO HIGH AUTOMATION",
			y: plan.yLabel?.trim() || "LOW TO HIGH BLAST RADIUS",
			cells: cellsRaw.map((c) => ({
				title: String(c.title),
				...(c.detail ? { body: String(c.detail) } : {}),
			})),
		});
	},
};

const quote: KindModule = {
	id: "quote",
	slotsSchema: {
		type: "object",
		required: ["quoteText"],
		properties: {
			quoteText: { type: "string" },
			attribution: { type: "string" },
		},
	},
	compile(plan) {
		const text = plan.quoteText?.trim() || plan.note?.trim();
		if (!text) return fail("QUOTE_TEXT_MISSING", "quote needs quoteText");
		const attribution = plan.attribution?.trim();
		if (!attribution) return fail("QUOTE_ATTRIBUTION_MISSING", "quote needs attribution");
		return finish(plan, { type: "quote", text, attribution });
	},
};

const note: KindModule = {
	id: "note",
	slotsSchema: {
		type: "object",
		required: ["note"],
		properties: { note: { type: "string" } },
	},
	compile(plan) {
		const content = plan.note?.trim() || plan.lead?.trim() || "";
		if (!content) return fail("NOTE_MISSING", "note needs a note (or lead) body");
		return finish(plan, { type: "note", content });
	},
};

export const KIND_MODULES: readonly KindModule[] = [
	railSteps,
	compare,
	metrics,
	cards,
	checklist,
	table,
	layers,
	hero,
	bars,
	segments,
	quadrant,
	quote,
	note,
];

const byId = new Map(KIND_MODULES.map((m) => [m.id, m]));

export const getKindModule = (id: string): KindModule | null => byId.get(id as ArtifactKind) ?? null;

export const compileArtifactPlan = (plan: ArtifactPlan): CompileResult => {
	const kind = getKindModule(plan.kind);
	if (!kind) {
		return fail("UNKNOWN_KIND", `unknown artifact kind "${plan.kind}"`);
	}
	return kind.compile(plan);
};
