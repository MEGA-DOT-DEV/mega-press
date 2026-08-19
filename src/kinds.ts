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

const stopToItem = (s: {
	readonly at?: string;
	readonly title?: string;
	readonly detail?: string;
}): { date: string; title: string; detail?: string } | null => {
	const date = String(s.at ?? "")
		.trim()
		.toUpperCase();
	const title = String(s.title ?? "").trim();
	if (!date || !title) return null;
	const detail = String(s.detail ?? "").trim();
	return { date, title, ...(detail ? { detail } : {}) };
};

const timeline: KindModule = {
	id: "timeline",
	slotsSchema: {
		type: "object",
		required: ["stops"],
		properties: {
			stops: {
				type: "array",
				minItems: 3,
				maxItems: 5,
				items: {
					type: "object",
					required: ["at", "title"],
					properties: {
						at: { type: "string" },
						title: { type: "string" },
						detail: { type: "string" },
					},
				},
			},
		},
	},
	compile(plan) {
		const items = (plan.stops ?? [])
			.map(stopToItem)
			.filter((s): s is NonNullable<typeof s> => s != null)
			.slice(0, 5);
		if (items.length < 3) {
			return fail("STOPS_TOO_FEW", "timeline needs at least three {at, title} stops");
		}
		return finish(plan, { type: "timeline", items });
	},
};

const timelineVertical: KindModule = {
	id: "timelineVertical",
	slotsSchema: {
		type: "object",
		required: ["events"],
		properties: {
			events: {
				type: "array",
				minItems: 3,
				maxItems: 6,
				items: {
					type: "object",
					required: ["at", "title"],
					properties: {
						at: { type: "string" },
						title: { type: "string" },
						detail: { type: "string" },
					},
				},
			},
		},
	},
	compile(plan) {
		const items = (plan.events ?? [])
			.map(stopToItem)
			.filter((s): s is NonNullable<typeof s> => s != null)
			.slice(0, 6);
		if (items.length < 3) {
			return fail("EVENTS_TOO_FEW", "timelineVertical needs at least three {at, title} events");
		}
		return finish(plan, { type: "timelineVertical", items });
	},
};

const railFlow: KindModule = {
	id: "railFlow",
	slotsSchema: {
		type: "object",
		required: ["steps"],
		properties: {
			steps: {
				type: "array",
				minItems: 3,
				maxItems: 5,
				items: {
					type: "object",
					required: ["name"],
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
			.slice(0, 5)
			.map((s) => ({
				name: s.name,
				...(s.detail ? { detail: s.detail } : {}),
			}));
		if (steps.length < 3) {
			return fail("STEPS_MISSING", "railFlow needs at least three named steps");
		}
		return finish(plan, { type: "railFlow", items: steps });
	},
};

const graph: KindModule = {
	id: "graph",
	slotsSchema: {
		type: "object",
		required: ["nodes", "edges"],
		properties: {
			nodes: {
				type: "array",
				minItems: 2,
				maxItems: 7,
				items: {
					type: "object",
					required: ["key", "title"],
					properties: {
						key: { type: "string" },
						title: { type: "string" },
						detail: { type: "string" },
						accent: { type: "boolean" },
						column: { type: "number" },
						row: { type: "number" },
					},
				},
			},
			edges: {
				type: "array",
				minItems: 1,
				maxItems: 10,
				items: {
					type: "object",
					required: ["from", "to"],
					properties: {
						from: { type: "string" },
						to: { type: "string" },
					},
				},
			},
			dir: { type: "string", enum: ["x", "y"] },
		},
	},
	compile(plan) {
		const nodes = (plan.nodes ?? [])
			.map((n) => ({
				key: String(n.key ?? "").trim(),
				title: String(n.title ?? "").trim(),
				detail: String(n.detail ?? "").trim(),
				accent: Boolean(n.accent),
				column: n.column,
				row: n.row,
			}))
			.filter((n) => n.key.length > 0 && n.title.length > 0)
			.slice(0, 7);
		if (nodes.length < 2) {
			return fail("GRAPH_NODES_TOO_FEW", "graph needs at least two {key, title} nodes");
		}
		const keys = new Set(nodes.map((n) => n.key));
		if (keys.size !== nodes.length) {
			return fail("GRAPH_KEY_DUPLICATE", "graph node keys must be unique");
		}
		const edges = (plan.edges ?? [])
			.map((e) => ({ from: String(e.from ?? "").trim(), to: String(e.to ?? "").trim() }))
			.filter((e) => e.from.length > 0 && e.to.length > 0)
			.slice(0, 10);
		if (edges.length < 1) {
			return fail("GRAPH_EDGES_MISSING", "graph needs at least one {from, to} edge");
		}
		const dangling = edges.find((e) => !keys.has(e.from) || !keys.has(e.to));
		if (dangling) {
			return fail(
				"GRAPH_EDGE_UNKNOWN",
				`graph edge ${dangling.from} to ${dangling.to} names a key no node has`,
			);
		}
		// Ranks are all-or-nothing in the renderer: a partial set is dropped.
		const rankKey = plan.dir === "y" ? "row" : "column";
		const ranked = nodes.every((n) => typeof n[rankKey] === "number");
		return finish(plan, {
			type: "graph",
			...(plan.dir === "y" ? { dir: "y" } : {}),
			nodes: nodes.map((n) => ({
				key: n.key,
				title: n.title,
				...(n.detail ? { detail: n.detail } : {}),
				...(n.accent ? { accent: true } : {}),
				...(ranked && typeof n.column === "number" ? { column: n.column } : {}),
				...(ranked && typeof n.row === "number" ? { row: n.row } : {}),
			})),
			edges,
		});
	},
};

const derivation: KindModule = {
	id: "derivation",
	slotsSchema: {
		type: "object",
		required: ["exprs"],
		properties: {
			exprs: {
				type: "array",
				minItems: 2,
				maxItems: 5,
				items: {
					type: "object",
					required: ["expr"],
					properties: {
						expr: { type: "string" },
						note: { type: "string" },
						accent: { type: "boolean" },
					},
				},
			},
		},
	},
	compile(plan) {
		const steps = (plan.exprs ?? [])
			.map((s) => ({
				expr: String(s.expr ?? "").trim(),
				note: String(s.note ?? "").trim(),
				accent: Boolean(s.accent),
			}))
			.filter((s) => s.expr.length > 0)
			.slice(0, 5);
		if (steps.length < 2) {
			return fail("EXPRS_TOO_FEW", "derivation needs at least two {expr} steps");
		}
		const unnoted = steps.findIndex((s, i) => i > 0 && s.note.length === 0);
		if (unnoted > 0) {
			return fail(
				"DERIVATION_NOTE_MISSING",
				`derivation step ${unnoted + 1} needs a note saying what changed`,
			);
		}
		return finish(plan, {
			type: "derivation",
			steps: steps.map((s, i) => ({
				expr: s.expr,
				...(i > 0 || s.note ? { note: s.note } : {}),
				...(s.accent ? { accent: true } : {}),
			})),
		});
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
	timeline,
	timelineVertical,
	railFlow,
	graph,
	derivation,
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
