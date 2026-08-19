/**
 * Structured artifact plans — model fills slots; we compile press IR.
 * No recursive freeform component trees from the model.
 */
import { buildArtifact } from "../build.js";
import { compileArtifactPlan } from "../kinds.js";

export const PLATE_PLAN_KINDS = [
	"railSteps",
	"compare",
	"metrics",
	"cards",
	"checklist",
	"note",
	"table",
	"layers",
	"hero",
	"bars",
	"segments",
	"quadrant",
	"quote",
	"timeline",
	"timelineVertical",
	"compareFlows",
	"railFlow",
	"graph",
	"derivation",
	"code",
	"tree",
	"codeSteps",
] as const;

export type PlatePlanKind = (typeof PLATE_PLAN_KINDS)[number];

/** Public names. */
export const ARTIFACT_KINDS = PLATE_PLAN_KINDS;
export type ArtifactKind = PlatePlanKind;

export type PlatePlan = {
	readonly kind: PlatePlanKind;
	readonly id: string;
	/** Frame proportions; landscape when absent. Tall sequences fit portrait/square. */
	readonly frame?: "landscape" | "portrait" | "square";
	readonly kicker?: string;
	readonly number?: string;
	readonly title?: string;
	readonly lead?: string;
	readonly footnote?: string;
	/** railSteps */
	readonly steps?: readonly { readonly name: string; readonly detail: string }[];
	/** compare — exactly two sides preferred */
	readonly before?: {
		readonly label: string;
		readonly title: string;
		readonly items: readonly string[];
	};
	readonly after?: {
		readonly label: string;
		readonly title: string;
		readonly items: readonly string[];
	};
	/** metrics */
	readonly metrics?: readonly {
		readonly label: string;
		readonly value: string;
		readonly unit: string;
	}[];
	/** cards */
	readonly cards?: readonly { readonly title: string; readonly body: string }[];
	/** checklist */
	readonly checks?: readonly { readonly text: string; readonly ok: boolean }[];
	/** table */
	readonly columns?: readonly {
		readonly key: string;
		readonly label: string;
	}[];
	readonly rows?: readonly Record<string, string>[];
	/** layers */
	readonly layers?: readonly { readonly title: string; readonly detail: string }[];
	/** note / hero */
	readonly note?: string;
	readonly heroValue?: string;
	readonly heroCaption?: string;
	/** bars */
	readonly barUnit?: string;
	readonly bars?: readonly { readonly label: string; readonly value: number }[];
	/** segments */
	readonly segmentUnit?: string;
	readonly segmentTotal?: number;
	readonly segments?: readonly { readonly label: string; readonly value: number }[];
	/** quadrant — cells TL TR BL BR */
	readonly xLabel?: string;
	readonly yLabel?: string;
	readonly quadrants?: readonly { readonly title: string; readonly detail?: string }[];
	/** quote */
	readonly quoteText?: string;
	readonly attribution?: string;
	/** timeline — horizontal stops */
	readonly stops?: readonly {
		readonly at: string;
		readonly title: string;
		readonly detail?: string;
		readonly accent?: boolean;
	}[];
	/** timeline — exactly two labelled rails stacked to contrast two runs */
	readonly tracks?: readonly {
		readonly label: string;
		readonly stops: readonly {
			readonly at: string;
			readonly title: string;
			readonly detail?: string;
			readonly accent?: boolean;
		}[];
	}[];
	/** timelineVertical — labelled events top to bottom, optionally with a verbatim block */
	readonly events?: readonly {
		readonly at: string;
		readonly title: string;
		readonly detail?: string;
		readonly code?: string;
		readonly accent?: boolean;
		/** Short mono pills under the event; a plain string is shorthand for a quiet chip. */
		readonly chips?: readonly (string | { readonly text: string; readonly accent?: boolean })[];
	}[];
	/** compareFlows — two labelled columns, each its own vertical transcript */
	readonly left?: {
		readonly label: string;
		readonly intro?: string;
		readonly events: readonly {
			readonly at: string;
			readonly title: string;
			readonly detail?: string;
			readonly code?: string;
			readonly accent?: boolean;
			readonly chips?: readonly (string | { readonly text: string; readonly accent?: boolean })[];
		}[];
	};
	readonly right?: {
		readonly label: string;
		readonly intro?: string;
		readonly events: readonly {
			readonly at: string;
			readonly title: string;
			readonly detail?: string;
			readonly code?: string;
			readonly accent?: boolean;
			readonly chips?: readonly (string | { readonly text: string; readonly accent?: boolean })[];
		}[];
	};
	/** graph */
	readonly dir?: "x" | "y";
	readonly nodes?: readonly {
		readonly key: string;
		readonly title: string;
		readonly detail?: string;
		readonly accent?: boolean;
		readonly column?: number;
		readonly row?: number;
	}[];
	readonly edges?: readonly { readonly from: string; readonly to: string }[];
	/** derivation — expression chain */
	readonly exprs?: readonly {
		readonly expr: string;
		readonly note?: string;
		readonly accent?: boolean;
	}[];
	/** code — verbatim snippet, \n-separated lines */
	readonly code?: string;
	readonly codeLabel?: string;
	readonly accentLines?: readonly number[];
	/** token colouring; omitted = auto-detect, "none" = plain ink */
	readonly codeLang?: "js" | "json" | "none";
	/** tree — a mono hierarchy: root, 2..4 branches, children at most one level deeper */
	readonly root?: { readonly name: string; readonly detail?: string };
	readonly branches?: readonly {
		readonly name: string;
		readonly items?: readonly string[];
		readonly children?: readonly {
			readonly name: string;
			readonly items?: readonly string[];
		}[];
	}[];
	/** codeSteps — 2..3 numbered, labelled verbatim blocks in sequence */
	readonly blocks?: readonly {
		readonly label: string;
		readonly caption?: string;
		readonly code: string;
	}[];
};

export type ArtifactPlan = PlatePlan;

/** JSON Schema for OpenRouter json_schema / json_object guidance. */
export const PLATE_PLAN_JSON_SCHEMA: Record<string, unknown> = {
	type: "object",
	additionalProperties: false,
	required: ["kind", "id"],
	properties: {
		kind: { type: "string", enum: [...PLATE_PLAN_KINDS] },
		id: { type: "string", minLength: 2, maxLength: 64 },
		frame: { type: "string", enum: ["landscape", "portrait", "square"] },
		kicker: { type: "string", maxLength: 48 },
		number: { type: "string", maxLength: 8 },
		title: { type: "string", minLength: 8, maxLength: 140 },
		lead: { type: "string", maxLength: 200 },
		footnote: { type: "string", maxLength: 36 },
		steps: {
			type: "array",
			minItems: 4,
			maxItems: 6,
			items: {
				type: "object",
				additionalProperties: false,
				required: ["name", "detail"],
				properties: {
					name: { type: "string" },
					detail: { type: "string" },
				},
			},
		},
		before: {
			type: "object",
			additionalProperties: false,
			required: ["label", "title", "items"],
			properties: {
				label: { type: "string" },
				title: { type: "string" },
				items: { type: "array", minItems: 2, maxItems: 5, items: { type: "string" } },
			},
		},
		after: {
			type: "object",
			additionalProperties: false,
			required: ["label", "title", "items"],
			properties: {
				label: { type: "string" },
				title: { type: "string" },
				items: { type: "array", minItems: 2, maxItems: 5, items: { type: "string" } },
			},
		},
		metrics: {
			type: "array",
			minItems: 3,
			maxItems: 5,
			items: {
				type: "object",
				additionalProperties: false,
				required: ["label", "value", "unit"],
				properties: {
					label: { type: "string" },
					value: { type: "string" },
					unit: { type: "string" },
				},
			},
		},
		cards: {
			type: "array",
			minItems: 3,
			maxItems: 4,
			items: {
				type: "object",
				additionalProperties: false,
				required: ["title", "body"],
				properties: {
					title: { type: "string" },
					body: { type: "string" },
				},
			},
		},
		checks: {
			type: "array",
			minItems: 4,
			maxItems: 6,
			items: {
				type: "object",
				additionalProperties: false,
				required: ["text", "ok"],
				properties: {
					text: { type: "string" },
					ok: { type: "boolean" },
				},
			},
		},
		columns: {
			type: "array",
			minItems: 2,
			maxItems: 3,
			items: {
				type: "object",
				additionalProperties: false,
				required: ["key", "label"],
				properties: {
					key: { type: "string" },
					label: { type: "string" },
				},
			},
		},
		rows: {
			type: "array",
			minItems: 3,
			maxItems: 5,
			items: { type: "object", additionalProperties: { type: "string" } },
		},
		layers: {
			type: "array",
			minItems: 3,
			maxItems: 4,
			items: {
				type: "object",
				additionalProperties: false,
				required: ["title", "detail"],
				properties: {
					title: { type: "string" },
					detail: { type: "string" },
				},
			},
		},
		note: { type: "string", minLength: 20, maxLength: 280 },
		heroValue: { type: "string" },
		heroCaption: { type: "string" },
		stops: {
			type: "array",
			minItems: 3,
			maxItems: 5,
			items: {
				type: "object",
				additionalProperties: false,
				required: ["at", "title"],
				properties: {
					at: { type: "string", maxLength: 16 },
					title: { type: "string" },
					detail: { type: "string" },
					accent: { type: "boolean" },
				},
			},
		},
		tracks: {
			type: "array",
			minItems: 2,
			maxItems: 2,
			items: {
				type: "object",
				additionalProperties: false,
				required: ["label", "stops"],
				properties: {
					label: { type: "string", maxLength: 40 },
					stops: {
						type: "array",
						minItems: 3,
						maxItems: 4,
						items: {
							type: "object",
							additionalProperties: false,
							required: ["at", "title"],
							properties: {
								at: { type: "string", maxLength: 16 },
								title: { type: "string" },
								detail: { type: "string" },
								accent: { type: "boolean" },
							},
						},
					},
				},
			},
		},
		events: {
			type: "array",
			minItems: 3,
			maxItems: 6,
			items: {
				type: "object",
				additionalProperties: false,
				required: ["at", "title"],
				properties: {
					at: { type: "string", maxLength: 16 },
					title: { type: "string" },
					detail: { type: "string" },
					code: { type: "string", maxLength: 600 },
					accent: { type: "boolean" },
					chips: {
						type: "array",
						minItems: 1,
						maxItems: 6,
						items: {
							anyOf: [
								{ type: "string", maxLength: 32 },
								{
									type: "object",
									additionalProperties: false,
									required: ["text"],
									properties: {
										text: { type: "string", maxLength: 32 },
										accent: { type: "boolean" },
									},
								},
							],
						},
					},
				},
			},
		},
		left: {
			type: "object",
			additionalProperties: false,
			required: ["label", "events"],
			properties: {
				label: { type: "string", maxLength: 40 },
				intro: { type: "string", maxLength: 250 },
				events: {
					type: "array",
					minItems: 2,
					maxItems: 6,
					items: {
						type: "object",
						additionalProperties: false,
						required: ["at", "title"],
						properties: {
							at: { type: "string", maxLength: 16 },
							title: { type: "string" },
							detail: { type: "string" },
							code: { type: "string", maxLength: 600 },
							accent: { type: "boolean" },
							chips: {
								type: "array",
								minItems: 1,
								maxItems: 6,
								items: {
									anyOf: [
										{ type: "string", maxLength: 32 },
										{
											type: "object",
											additionalProperties: false,
											required: ["text"],
											properties: {
												text: { type: "string", maxLength: 32 },
												accent: { type: "boolean" },
											},
										},
									],
								},
							},
						},
					},
				},
			},
		},
		right: {
			type: "object",
			additionalProperties: false,
			required: ["label", "events"],
			properties: {
				label: { type: "string", maxLength: 40 },
				intro: { type: "string", maxLength: 250 },
				events: {
					type: "array",
					minItems: 2,
					maxItems: 6,
					items: {
						type: "object",
						additionalProperties: false,
						required: ["at", "title"],
						properties: {
							at: { type: "string", maxLength: 16 },
							title: { type: "string" },
							detail: { type: "string" },
							code: { type: "string", maxLength: 600 },
							accent: { type: "boolean" },
							chips: {
								type: "array",
								minItems: 1,
								maxItems: 6,
								items: {
									anyOf: [
										{ type: "string", maxLength: 32 },
										{
											type: "object",
											additionalProperties: false,
											required: ["text"],
											properties: {
												text: { type: "string", maxLength: 32 },
												accent: { type: "boolean" },
											},
										},
									],
								},
							},
						},
					},
				},
			},
		},
		dir: { type: "string", enum: ["x", "y"] },
		nodes: {
			type: "array",
			minItems: 3,
			maxItems: 7,
			items: {
				type: "object",
				additionalProperties: false,
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
			minItems: 2,
			maxItems: 10,
			items: {
				type: "object",
				additionalProperties: false,
				required: ["from", "to"],
				properties: {
					from: { type: "string" },
					to: { type: "string" },
				},
			},
		},
		exprs: {
			type: "array",
			minItems: 2,
			maxItems: 5,
			items: {
				type: "object",
				additionalProperties: false,
				required: ["expr"],
				properties: {
					expr: { type: "string" },
					note: { type: "string" },
					accent: { type: "boolean" },
				},
			},
		},
		code: { type: "string", maxLength: 1200 },
		codeLabel: { type: "string", maxLength: 48 },
		accentLines: { type: "array", maxItems: 14, items: { type: "number" } },
		codeLang: { type: "string", enum: ["js", "json", "none"] },
		root: {
			type: "object",
			additionalProperties: false,
			required: ["name"],
			properties: {
				name: { type: "string", maxLength: 40 },
				detail: { type: "string", maxLength: 40 },
			},
		},
		branches: {
			type: "array",
			minItems: 2,
			maxItems: 4,
			items: {
				type: "object",
				additionalProperties: false,
				required: ["name"],
				properties: {
					name: { type: "string", maxLength: 40 },
					items: { type: "array", minItems: 1, maxItems: 6, items: { type: "string", maxLength: 32 } },
					children: {
						type: "array",
						minItems: 1,
						maxItems: 4,
						items: {
							type: "object",
							additionalProperties: false,
							required: ["name"],
							properties: {
								name: { type: "string", maxLength: 40 },
								items: {
									type: "array",
									minItems: 1,
									maxItems: 6,
									items: { type: "string", maxLength: 32 },
								},
							},
						},
					},
				},
			},
		},
		blocks: {
			type: "array",
			minItems: 2,
			maxItems: 3,
			items: {
				type: "object",
				additionalProperties: false,
				required: ["label", "code"],
				properties: {
					label: { type: "string", maxLength: 40 },
					caption: { type: "string", maxLength: 250 },
					code: { type: "string", maxLength: 600 },
				},
			},
		},
	},
};

export const ARTIFACT_JSON_SCHEMA = PLATE_PLAN_JSON_SCHEMA;

const isRecord = (v: unknown): v is Record<string, unknown> =>
	typeof v === "object" && v !== null && !Array.isArray(v);

export function parsePlatePlan(raw: unknown): PlatePlan | null {
	if (!isRecord(raw)) return null;
	const kind = String(raw.kind ?? "");
	if (!(PLATE_PLAN_KINDS as readonly string[]).includes(kind)) return null;
	if (raw.title != null && raw.title !== "") {
		const title = String(raw.title).trim();
		if (title.length < 4) return null;
	}
	return raw as unknown as PlatePlan;
}

/** Compile a plan into press spec IR (deterministic). Thin slots fail closed. */
export function compilePlatePlan(plan: PlatePlan): Record<string, unknown> {
	const compiled = compileArtifactPlan(plan);
	if (!compiled.ok) {
		const err = compiled.errors[0];
		throw Object.assign(new Error(err?.message ?? "compile refused"), {
			code: err?.code ?? "COMPILE_REFUSED",
			errors: compiled.errors,
		});
	}
	return compiled.spec;
}

export function compileAndLockPlatePlan(plan: PlatePlan): {
	ok: boolean;
	spec: Record<string, unknown>;
	errors?: readonly { code: string; message: string }[];
} {
	const result = buildArtifact(plan);
	if (result.ok) return { ok: true, spec: result.spec };
	return { ok: false, spec: result.spec ?? {}, errors: result.errors };
}
