/**
 * Per-kind compile registry. Valid-input IR stays byte-identical to the
 * previous compilePlatePlan switch; thin/missing slots fail closed.
 */
import type { ArtifactKind, ArtifactPlan } from "./kernel/platePlan.js";
import { normalizePlateSpec } from "./kernel/normalize.js";
import {
	arraySchema,
	ITEM_BOUNDS,
	refuseCount,
	STRING_CAPS,
} from "./kernel/slotContract.js";

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

const countFail = (kind: string, slot: string, n: number): CompileFail | null => {
	const err = refuseCount(kind, slot, n);
	return err ? fail(err.code, err.message) : null;
};

const PLAN_FRAMES = ["landscape", "portrait", "square"] as const;

const plateBase = (plan: ArtifactPlan): Record<string, unknown> => ({
	id: plan.id || `plate-${plan.kind}`,
	frame: PLAN_FRAMES.includes(plan.frame as (typeof PLAN_FRAMES)[number])
		? (plan.frame as (typeof PLAN_FRAMES)[number])
		: ("landscape" as const),
	...(plan.title ? { title: plan.title } : {}),
	...(typeof plan.footnote === "string" && plan.footnote.trim().length > 0
		? { footnote: plan.footnote.trim() }
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
			steps: arraySchema(ITEM_BOUNDS.railSteps.steps, {
				type: "object",
				required: ["name", "detail"],
				properties: {
					name: { type: "string" },
					detail: {
						type: "string",
						maxLength: STRING_CAPS.detail.max,
						description: STRING_CAPS.detail.description,
					},
				},
			}),
		},
	},
	compile(plan) {
		const steps = (plan.steps ?? [])
			.map((s) => ({
				name: String(s.name ?? "").trim(),
				detail: String(s.detail ?? "").trim(),
			}))
			.filter((s) => s.name.length > 0)
			.map((s) => ({
				name: s.name,
				...(s.detail ? { detail: s.detail } : {}),
			}));
		const counted = countFail("railSteps", "steps", steps.length);
		if (counted) return counted;
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
		const beforeItems = [...before.items];
		const afterItems = [...after.items];
		const beforeCount = countFail("compare", "items", beforeItems.length);
		if (beforeCount) return beforeCount;
		const afterCount = countFail("compare", "items", afterItems.length);
		if (afterCount) return afterCount;
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
		properties: {
			metrics: arraySchema(ITEM_BOUNDS.metrics.metrics, { type: "object" }),
		},
	},
	compile(plan) {
		const metricsRows = [...(plan.metrics ?? [])];
		const counted = countFail("metrics", "metrics", metricsRows.length);
		if (counted) return counted;
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
		properties: {
			cards: arraySchema(ITEM_BOUNDS.cards.cards, {
				type: "object",
				properties: {
					body: {
						type: "string",
						maxLength: STRING_CAPS.detail.max,
						description: STRING_CAPS.detail.description,
					},
				},
			}),
		},
	},
	compile(plan) {
		const cardRows = [...(plan.cards ?? [])];
		const counted = countFail("cards", "cards", cardRows.length);
		if (counted) return counted;
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
		properties: {
			checks: arraySchema(ITEM_BOUNDS.checklist.checks, {
				type: "object",
				properties: {
					text: {
						type: "string",
						maxLength: STRING_CAPS.detail.max,
						description: STRING_CAPS.detail.description,
					},
				},
			}),
		},
	},
	compile(plan) {
		const checks = [...(plan.checks ?? [])];
		const counted = countFail("checklist", "checks", checks.length);
		if (counted) return counted;
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
			columns: arraySchema(ITEM_BOUNDS.table.columns, { type: "object" }),
			rows: arraySchema(ITEM_BOUNDS.table.rows, { type: "object" }),
		},
	},
	compile(plan) {
		const rawCols = plan.columns ?? [];
		const colCount = countFail("table", "columns", rawCols.length);
		if (colCount) return colCount;
		const columns = rawCols.map((c, i) => ({
			key: String(c.key || `c${i}`),
			label: String(c.label || `COL ${i + 1}`).toUpperCase(),
			type: "text" as const,
			grow: i === 0,
		}));
		const keys = columns.map((c) => c.key);
		const rowCount = countFail("table", "rows", (plan.rows ?? []).length);
		if (rowCount) return rowCount;
		const rows = (plan.rows ?? []).map((r) => {
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
		properties: {
			layers: arraySchema(ITEM_BOUNDS.layers.layers, {
				type: "object",
				properties: {
					detail: {
						type: "string",
						maxLength: STRING_CAPS.detail.max,
						description: STRING_CAPS.detail.description,
					},
				},
			}),
		},
	},
	compile(plan) {
		const layerRows = [...(plan.layers ?? [])];
		const counted = countFail("layers", "layers", layerRows.length);
		if (counted) return counted;
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
		properties: {
			bars: arraySchema(ITEM_BOUNDS.bars.bars, { type: "object" }),
		},
	},
	compile(plan) {
		const barCount = countFail("bars", "bars", (plan.bars ?? []).length);
		if (barCount) return barCount;
		return finish(plan, {
			type: "bars",
			unit: plan.barUnit?.trim() || "share",
			items: (plan.bars ?? []).map((b) => ({
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
		properties: {
			segments: arraySchema(ITEM_BOUNDS.segments.segments, { type: "object" }),
		},
	},
	compile(plan) {
		const segCount = countFail("segments", "segments", (plan.segments ?? []).length);
		if (segCount) return segCount;
		const items = (plan.segments ?? []).map((s) => ({
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
		properties: {
			quadrants: arraySchema(ITEM_BOUNDS.quadrant.quadrants, { type: "object" }),
		},
	},
	compile(plan) {
		const cellsRaw = [...(plan.quadrants ?? [])];
		const counted = countFail("quadrant", "quadrants", cellsRaw.length);
		if (counted) return counted;
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
			stops: arraySchema(ITEM_BOUNDS.timeline.stops, {
				type: "object",
				required: ["at", "title"],
				properties: {
					at: { type: "string" },
					title: { type: "string" },
					detail: {
						type: "string",
						maxLength: STRING_CAPS.detail.max,
						description: STRING_CAPS.detail.description,
					},
				},
			}),
		},
	},
	compile(plan) {
		const items = (plan.stops ?? [])
			.map(stopToItem)
			.filter((s): s is NonNullable<typeof s> => s != null);
		const counted = countFail("timeline", "stops", items.length);
		if (counted) return counted;
		return finish(plan, { type: "timeline", items });
	},
};

const timelineVertical: KindModule = {
	id: "timelineVertical",
	slotsSchema: {
		type: "object",
		required: ["events"],
		properties: {
			events: arraySchema(ITEM_BOUNDS.timelineVertical.events, {
				type: "object",
				required: ["at", "title"],
				properties: {
					at: { type: "string" },
					title: { type: "string" },
					detail: {
						type: "string",
						maxLength: STRING_CAPS.detail.max,
						description: STRING_CAPS.detail.description,
					},
					code: {
						type: "string",
						maxLength: STRING_CAPS.snippet.max,
						description:
							"Optional verbatim block under the event: the call shape, payload, or result the event is about; \\n line breaks, 2 to 8 lines, never wrapped",
					},
					accent: {
						type: "boolean",
						description: "true on the one event the claim is about",
					},
				},
			}),
		},
	},
	compile(plan) {
		const items = (plan.events ?? [])
			.map((e) => {
				const base = stopToItem(e);
				if (!base) return null;
				const source = typeof e.code === "string" ? e.code.replace(/\t/g, "  ") : "";
				const codeLines = source
					.split("\n")
					.filter((l, i, all) => l.trim().length > 0 || (i > 0 && i < all.length - 1));
				return {
					...base,
					...(codeLines.filter((l) => l.trim()).length >= 2
						? { code: codeLines.join("\n") }
						: {}),
					...(e.accent ? { accent: true } : {}),
				};
			})
			.filter((s): s is NonNullable<typeof s> => s != null);
		const counted = countFail("timelineVertical", "events", items.length);
		if (counted) return counted;
		const bloated = items.find((i) => i.code && i.code.split("\n").length > 8);
		if (bloated) {
			return fail(
				"EVENT_CODE_TOO_LONG",
				`event "${bloated.date}" carries ${bloated.code?.split("\n").length} code lines; 8 is the cap inside a transcript. Use the code kind for a standalone block.`,
			);
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
			steps: arraySchema(ITEM_BOUNDS.railFlow.steps, {
				type: "object",
				required: ["name"],
				properties: {
					name: { type: "string" },
					detail: {
						type: "string",
						maxLength: STRING_CAPS.detail.max,
						description: STRING_CAPS.detail.description,
					},
				},
			}),
		},
	},
	compile(plan) {
		const steps = (plan.steps ?? [])
			.map((s) => ({
				name: String(s.name ?? "").trim(),
				detail: String(s.detail ?? "").trim(),
			}))
			.filter((s) => s.name.length > 0)
			.map((s) => ({
				name: s.name,
				...(s.detail ? { detail: s.detail } : {}),
			}));
		const counted = countFail("railFlow", "steps", steps.length);
		if (counted) return counted;
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
				minItems: ITEM_BOUNDS.graph.nodes.min,
				maxItems: ITEM_BOUNDS.graph.nodes.max,
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
				minItems: ITEM_BOUNDS.graph.edges.min,
				maxItems: ITEM_BOUNDS.graph.edges.max,
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
			.filter((n) => n.key.length > 0 && n.title.length > 0);
		const nodeCount = countFail("graph", "nodes", nodes.length);
		if (nodeCount) return nodeCount;
		const keys = new Set(nodes.map((n) => n.key));
		if (keys.size !== nodes.length) {
			return fail("GRAPH_KEY_DUPLICATE", "graph node keys must be unique");
		}
		const edges = (plan.edges ?? [])
			.map((e) => ({ from: String(e.from ?? "").trim(), to: String(e.to ?? "").trim() }))
			.filter((e) => e.from.length > 0 && e.to.length > 0);
		const edgeCount = countFail("graph", "edges", edges.length);
		if (edgeCount) return edgeCount;
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
				minItems: ITEM_BOUNDS.derivation.exprs.min,
				maxItems: ITEM_BOUNDS.derivation.exprs.max,
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
			.filter((s) => s.expr.length > 0);
		const counted = countFail("derivation", "exprs", steps.length);
		if (counted) return counted;
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

const codeKind: KindModule = {
	id: "code",
	slotsSchema: {
		type: "object",
		required: ["code"],
		properties: {
			code: {
				type: "string",
				maxLength: STRING_CAPS.snippet.max,
				description:
					"The snippet with \\n line breaks, 2 to 14 lines, drawn verbatim; a line too wide for the frame refuses instead of wrapping",
			},
			codeLabel: {
				type: "string",
				description: "Small mono caption above the block (a filename, a tool name)",
			},
			accentLines: {
				type: "array",
				items: { type: "number" },
				description: "1-based line numbers drawn in the accent",
			},
		},
	},
	compile(plan) {
		const raw = String(plan.code ?? "").replace(/\t/g, "  ");
		const lines = raw.split("\n");
		while (lines.length && !(lines[0] ?? "").trim()) lines.shift();
		while (lines.length && !(lines[lines.length - 1] ?? "").trim()) lines.pop();
		const drawn = lines.filter((l) => l.trim().length > 0);
		if (drawn.length === 0) {
			return fail("CODE_MISSING", "code needs a `code` string with the snippet to draw");
		}
		const counted = countFail("code", "lines", lines.length);
		if (counted) return counted;
		if (raw.length > STRING_CAPS.snippet.max) {
			return fail(
				STRING_CAPS.snippet.code,
				`code is ${raw.length} characters; sanity bound is ${STRING_CAPS.snippet.max}`,
			);
		}
		const label = plan.codeLabel?.trim();
		const accentLines = (plan.accentLines ?? [])
			.map(Number)
			.filter((n) => Number.isInteger(n) && n >= 1 && n <= lines.length);
		return finish(plan, {
			type: "code",
			code: lines.join("\n"),
			...(label ? { label } : {}),
			...(accentLines.length ? { accentLines } : {}),
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
	codeKind,
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
