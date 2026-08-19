/**
 * Single source of truth for advertised slot counts and garbage-guard
 * string caps. Compile, catalog schemas, and the structural lock all
 * derive from here so `press schema` cannot disagree with what locks.
 *
 * maxLength values are sanity bounds, not fit guarantees. Geometry
 * (proveArtifact) decides whether a string fits a frame. These caps are
 * sized against the portrait frame so they never fight escalation.
 */

export type ItemBound = {
	readonly min: number;
	readonly max: number;
	readonly tooFew: string;
	readonly tooMany: string;
	readonly label: string;
};

export type StringCap = {
	readonly max: number;
	readonly code: string;
	/** Schema note: these are garbage guards, never fit arbiters. */
	readonly description: string;
};

const sanity = (max: number): string =>
	`Sanity bound (${max} characters), not a fit guarantee. Geometry decides fit.`;

export const STRING_CAPS = {
	title: { max: 140, code: "TITLE_TOO_LONG", description: sanity(140) },
	lead: { max: 200, code: "LEAD_TOO_LONG", description: sanity(200) },
	detail: { max: 250, code: "DETAIL_TOO_LONG", description: sanity(250) },
	cell: { max: 120, code: "CELL_TOO_LONG", description: sanity(120) },
} as const satisfies Record<string, StringCap>;

export const ITEM_BOUNDS = {
	railSteps: {
		steps: {
			min: 4,
			max: 6,
			tooFew: "STEPS_MISSING",
			tooMany: "STEPS_TOO_MANY",
			label: "named steps",
		},
	},
	compare: {
		items: {
			min: 2,
			max: 5,
			tooFew: "COMPARE_SIDES_MISSING",
			tooMany: "COMPARE_ITEMS_TOO_MANY",
			label: "items per side",
		},
	},
	metrics: {
		metrics: {
			min: 3,
			max: 5,
			tooFew: "METRICS_TOO_FEW",
			tooMany: "METRICS_TOO_MANY",
			label: "metric rows",
		},
	},
	cards: {
		cards: {
			min: 3,
			max: 4,
			tooFew: "CARDS_TOO_FEW",
			tooMany: "CARDS_TOO_MANY",
			label: "cards",
		},
	},
	checklist: {
		checks: {
			min: 4,
			max: 6,
			tooFew: "CHECKS_TOO_FEW",
			tooMany: "CHECKS_TOO_MANY",
			label: "check lines",
		},
	},
	table: {
		columns: {
			min: 2,
			max: 3,
			tooFew: "COLUMNS_MISSING",
			tooMany: "COLUMNS_TOO_MANY",
			label: "columns",
		},
		rows: {
			min: 3,
			max: 5,
			tooFew: "ROWS_TOO_FEW",
			tooMany: "ROWS_TOO_MANY",
			label: "data rows",
		},
	},
	layers: {
		layers: {
			min: 3,
			max: 4,
			tooFew: "LAYERS_TOO_FEW",
			tooMany: "LAYERS_TOO_MANY",
			label: "layers",
		},
	},
	bars: {
		bars: {
			min: 3,
			max: 5,
			tooFew: "BARS_TOO_FEW",
			tooMany: "BARS_TOO_MANY",
			label: "bars",
		},
	},
	segments: {
		segments: {
			min: 3,
			max: 5,
			tooFew: "SEGMENTS_TOO_FEW",
			tooMany: "SEGMENTS_TOO_MANY",
			label: "segments",
		},
	},
	quadrant: {
		quadrants: {
			min: 4,
			max: 4,
			tooFew: "QUADRANTS_MISSING",
			tooMany: "QUADRANTS_TOO_MANY",
			label: "quadrant cells",
		},
	},
	timeline: {
		stops: {
			min: 3,
			max: 5,
			tooFew: "STOPS_TOO_FEW",
			tooMany: "STOPS_TOO_MANY",
			label: "stops",
		},
	},
	timelineVertical: {
		events: {
			min: 3,
			max: 6,
			tooFew: "EVENTS_TOO_FEW",
			tooMany: "EVENTS_TOO_MANY",
			label: "events",
		},
	},
	railFlow: {
		steps: {
			min: 3,
			max: 5,
			tooFew: "STEPS_MISSING",
			tooMany: "STEPS_TOO_MANY",
			label: "named steps",
		},
	},
	graph: {
		nodes: {
			min: 3,
			max: 7,
			tooFew: "GRAPH_NODES_TOO_FEW",
			tooMany: "GRAPH_NODES_TOO_MANY",
			label: "nodes",
		},
		edges: {
			min: 2,
			max: 10,
			tooFew: "GRAPH_EDGES_MISSING",
			tooMany: "GRAPH_EDGES_TOO_MANY",
			label: "edges",
		},
	},
	derivation: {
		exprs: {
			min: 2,
			max: 5,
			tooFew: "EXPRS_TOO_FEW",
			tooMany: "EXPRS_TOO_MANY",
			label: "expression steps",
		},
	},
} as const satisfies Record<string, Record<string, ItemBound>>;

export type BoundKind = keyof typeof ITEM_BOUNDS;

export const refuseCount = (
	kind: string,
	slot: string,
	count: number,
): { readonly code: string; readonly message: string } | null => {
	const bound = (ITEM_BOUNDS as Record<string, Record<string, ItemBound>>)[kind]?.[slot];
	if (!bound) return null;
	if (count < bound.min) {
		return {
			code: bound.tooFew,
			message: `${kind} needs at least ${bound.min} ${bound.label} (got ${count})`,
		};
	}
	if (count > bound.max) {
		return {
			code: bound.tooMany,
			message: `${kind} has ${count} ${bound.label}; at most ${bound.max}`,
		};
	}
	return null;
};

export const arraySchema = (bound: ItemBound, items: Record<string, unknown>): Record<string, unknown> => ({
	type: "array",
	minItems: bound.min,
	maxItems: bound.max,
	items,
});
