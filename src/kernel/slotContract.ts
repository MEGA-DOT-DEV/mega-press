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
	snippet: { max: 1200, code: "SNIPPET_TOO_LONG", description: sanity(1200) },
	/** A chip is one short mono label; this cap is the drawn contract, not a garbage guard. */
	chip: { max: 32, code: "CHIP_TOO_LONG", description: "One short mono label, 32 characters max." },
	trackLabel: { max: 40, code: "TRACK_LABEL_TOO_LONG", description: sanity(40) },
	/** The caps mono label naming one column of a compareFlows contrast; same measure as trackLabel. */
	flowLabel: { max: 40, code: "FLOW_LABEL_TOO_LONG", description: sanity(40) },
	/** A tree node's mono name; same measure as trackLabel/flowLabel. */
	treeName: { max: 40, code: "TREE_NAME_TOO_LONG", description: sanity(40) },
	/** One tree item is one short mono token, the same drawn contract as a chip. */
	treeItem: {
		max: 32,
		code: "TREE_ITEM_TOO_LONG",
		description: "One short mono token, 32 characters max.",
	},
	/** A codeSteps header label; same measure as trackLabel/flowLabel. */
	stepLabel: { max: 40, code: "CODESTEP_LABEL_TOO_LONG", description: sanity(40) },
	/** One compareSets tag: the same drawn contract as a chip, under its own slot name. */
	tag: {
		max: 32,
		code: "TAG_TOO_LONG",
		description: "One short mono label, 32 characters max; a sentence belongs in the intro.",
	},
	/** A compareSets panel's claim, drawn in head type. */
	setTitle: { max: 60, code: "SETS_TITLE_TOO_LONG", description: sanity(60) },
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
		tracks: {
			min: 2,
			max: 2,
			tooFew: "TRACKS_TOO_FEW",
			tooMany: "TRACKS_TOO_MANY",
			label: "labelled tracks",
		},
		/** Stops inside one track of a dual-track contrast. */
		trackStops: {
			min: 3,
			max: 4,
			tooFew: "TRACK_STOPS_TOO_FEW",
			tooMany: "TRACK_STOPS_TOO_MANY",
			label: "stops per track",
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
		/** Chips on one event: short mono pills, never extra information units. */
		chips: {
			min: 1,
			max: 6,
			tooFew: "CHIPS_TOO_FEW",
			tooMany: "CHIPS_TOO_MANY",
			label: "chips per event",
		},
	},
	compareFlows: {
		/** Events inside one column of the two-flow contrast. */
		events: {
			min: 2,
			max: 6,
			tooFew: "COMPAREFLOWS_TOO_FEW",
			tooMany: "COMPAREFLOWS_TOO_MANY",
			label: "events per side",
		},
		/** Chips on one event: the same drawn contract timelineVertical carries. */
		chips: {
			min: 1,
			max: 6,
			tooFew: "CHIPS_TOO_FEW",
			tooMany: "CHIPS_TOO_MANY",
			label: "chips per event",
		},
	},
	compareSets: {
		/** Tags inside one panel of the two-set contrast; cardinality is the argument. */
		tags: {
			min: 1,
			max: 8,
			tooFew: "SETS_TAGS_TOO_FEW",
			tooMany: "SETS_TAGS_TOO_MANY",
			label: "tags per side",
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
	code: {
		lines: {
			min: 2,
			max: 14,
			tooFew: "CODE_TOO_SHORT",
			tooMany: "CODE_TOO_LONG",
			label: "code lines",
		},
	},
	tree: {
		branches: {
			min: 2,
			max: 4,
			tooFew: "TREE_TOO_SHALLOW",
			tooMany: "TREE_TOO_MANY_BRANCHES",
			label: "branches",
		},
		/** Every drawn line, root included; the reference figure is exactly six. */
		rows: {
			min: 3,
			max: 6,
			tooFew: "TREE_TOO_SHALLOW",
			tooMany: "TREE_TOO_TALL",
			label: "rows (root included)",
		},
	},
	codeSteps: {
		blocks: {
			min: 2,
			max: 3,
			tooFew: "CODESTEPS_TOO_FEW",
			tooMany: "CODESTEPS_TOO_MANY",
			label: "numbered steps",
		},
		/** Verbatim lines inside one step's block, tighter than the shared 14. */
		lines: {
			min: 2,
			max: 10,
			tooFew: "CODESTEP_CODE_TOO_SHORT",
			tooMany: "CODESTEP_CODE_TOO_LONG",
			label: "code lines per step",
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
