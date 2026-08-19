/**
 * Pedagogy density gates for teaching figures.
 * Structural lock is not enough — a locked note that only echoes the title
 * is not a figure.
 */

export type PedagogyError = {
	readonly code: string;
	readonly message: string;
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
	typeof v === "object" && v !== null && !Array.isArray(v);

const norm = (s: string): string =>
	s
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, " ")
		.replace(/\s+/g, " ")
		.trim();

const tokenSet = (s: string): Set<string> =>
	new Set(
		norm(s)
			.split(" ")
			.filter((t) => t.length > 2),
	);

/** Jaccard similarity of significant tokens. */
const similar = (a: string, b: string): number => {
	const A = tokenSet(a);
	const B = tokenSet(b);
	if (A.size === 0 || B.size === 0) return 0;
	let inter = 0;
	for (const t of A) if (B.has(t)) inter += 1;
	const union = A.size + B.size - inter;
	return union === 0 ? 0 : inter / union;
};

const nonEmptyStrings = (items: unknown[]): string[] =>
	items
		.map((x) => {
			if (typeof x === "string") return x.trim();
			if (isRecord(x)) {
				return String(x.detail ?? x.body ?? x.text ?? x.name ?? x.label ?? x.content ?? "").trim();
			}
			return "";
		})
		.filter((s) => s.length > 0);

/**
 * Refuse thin / title-echo plates after structural lock.
 */
export const assessPlatePedagogy = (spec: Record<string, unknown>): readonly PedagogyError[] => {
	const errors: PedagogyError[] = [];
	const title = String(spec.title ?? "").trim();
	const body = spec.body;
	if (!isRecord(body)) {
		errors.push({ code: "PLATE_THIN", message: "body missing for pedagogy check" });
		return errors;
	}
	const type = String(body.type ?? "");

	if (type === "note") {
		const content = String(body.content ?? "").trim();
		if (content.length < 90) {
			errors.push({
				code: "PLATE_THIN",
				message:
					"note figures need ≥90 chars of substance, not a title restatement. Prefer railSteps, compare, metrics, cards, or checklist.",
			});
		}
		if (title && similar(title, content) >= 0.55) {
			errors.push({
				code: "TITLE_ECHO",
				message:
					"note body mostly repeats the title. A figure must add structure or checks the prose does not already state.",
			});
		}
		errors.push({
			code: "KIND_WEAK",
			message:
				"note is a last resort. Use railSteps (sequence), compare (before/after), metrics (budgets), cards, checklist, table, or layers.",
		});
	}

	if (type === "railSteps") {
		const items = Array.isArray(body.items) ? body.items : [];
		if (items.length < 4) {
			errors.push({
				code: "PLATE_THIN",
				message: "railSteps needs 4–6 steps with name + detail.",
			});
		}
		const details = items.filter(
			(it) => isRecord(it) && String(it.detail ?? "").trim().length >= 24,
		);
		if (details.length < 3) {
			errors.push({
				code: "PLATE_THIN",
				message: "railSteps details must be full clauses (≥24 chars) on most steps.",
			});
		}
	}

	if (type === "compare") {
		const before = isRecord(body.before) ? body.before : null;
		const after = isRecord(body.after) ? body.after : null;
		const bItems = before && Array.isArray(before.items) ? nonEmptyStrings(before.items) : [];
		const aItems = after && Array.isArray(after.items) ? nonEmptyStrings(after.items) : [];
		if (bItems.length < 2 || aItems.length < 2) {
			errors.push({
				code: "PLATE_THIN",
				message: "compare needs ≥2 concrete items on each side.",
			});
		}
	}

	if (type === "metrics") {
		const items = Array.isArray(body.items) ? body.items : [];
		if (items.length < 3) {
			errors.push({
				code: "PLATE_THIN",
				message: "metrics needs ≥3 rows with label, value, unit.",
			});
		}
	}

	if (type === "cards") {
		const items = Array.isArray(body.items) ? body.items : [];
		const rich = items.filter(
			(it) =>
				isRecord(it) &&
				String(it.title ?? "").trim().length >= 3 &&
				String(it.body ?? "").trim().length >= 40,
		);
		if (rich.length < 3) {
			errors.push({
				code: "PLATE_THIN",
				message: "cards needs ≥3 cards with real body sentences (≥40 chars).",
			});
		}
		// title echo on card bodies
		for (const it of items) {
			if (!isRecord(it)) continue;
			const cardBody = String(it.body ?? "");
			if (title && similar(title, cardBody) >= 0.7) {
				errors.push({
					code: "TITLE_ECHO",
					message: "a card body mostly repeats the plate title — add distinct mechanism content.",
				});
				break;
			}
		}
	}

	if (type === "checklist") {
		const items = Array.isArray(body.items) ? body.items : [];
		const texts = items
			.map((it) => (isRecord(it) ? String(it.text ?? "").trim() : ""))
			.filter((t) => t.length >= 16);
		if (texts.length < 4) {
			errors.push({
				code: "PLATE_THIN",
				message: "checklist needs ≥4 checkable lines (≥16 chars each).",
			});
		}
	}

	if (type === "table") {
		const rows = Array.isArray(body.rows) ? body.rows : [];
		const columns = Array.isArray(body.columns) ? body.columns : [];
		if (rows.length < 3) {
			errors.push({ code: "PLATE_THIN", message: "table needs ≥3 data rows." });
		}
		const badCols = columns.filter(
			(c) => !isRecord(c) || !String(c.key ?? "").trim() || !String(c.label ?? "").trim(),
		);
		if (columns.length < 2 || badCols.length > 0) {
			errors.push({
				code: "PLATE_THIN",
				message: "table columns need key + label on every column (press measures labels).",
			});
		}
	}

	if (type === "layers") {
		const items = Array.isArray(body.items) ? body.items : [];
		const rich = items.filter(
			(it) =>
				isRecord(it) &&
				String(it.title ?? "").trim() &&
				String(it.detail ?? "").trim().length >= 24,
		);
		if (rich.length < 3) {
			errors.push({
				code: "PLATE_THIN",
				message: "layers needs ≥3 layers with real detail clauses.",
			});
		}
	}

	if (type === "hero") {
		const value = String(body.value ?? "").trim();
		const caption = String(body.caption ?? body.unit ?? "").trim();
		if (!value || caption.length < 8) {
			errors.push({
				code: "PLATE_THIN",
				message: "hero needs a value and a caption that says what is counted.",
			});
		}
	}

	if (type === "bars") {
		const items = Array.isArray(body.items) ? body.items : [];
		const unit = String(body.unit ?? "").trim();
		if (!unit) {
			errors.push({ code: "PLATE_THIN", message: "bars needs a unit for the shared scale." });
		}
		if (items.length < 3) {
			errors.push({ code: "PLATE_THIN", message: "bars needs ≥3 items." });
		}
	}

	if (type === "segments") {
		const items = Array.isArray(body.items) ? body.items : [];
		const unit = String(body.unit ?? "").trim();
		if (!unit || items.length < 3) {
			errors.push({
				code: "PLATE_THIN",
				message: "segments needs a unit and ≥3 parts of the whole.",
			});
		}
	}

	if (type === "quadrant") {
		const cells = Array.isArray(body.cells) ? body.cells : [];
		const x = String(body.x ?? "").trim();
		const y = String(body.y ?? "").trim();
		if (!x || !y || cells.length !== 4) {
			errors.push({
				code: "PLATE_THIN",
				message: "quadrant needs x/y labels and exactly four cells.",
			});
		}
	}

	if (type === "timeline" || type === "timelineVertical") {
		const items = Array.isArray(body.items) ? body.items : [];
		if (items.length < 3) {
			errors.push({
				code: "PLATE_THIN",
				message: `${type} needs at least three stops with a label and a title.`,
			});
		}
		const detailed = items.filter(
			(it) =>
				isRecord(it) &&
				(String(it.detail ?? "").trim().length >= 16 ||
					String(it.code ?? "").trim().length > 0 ||
					(Array.isArray(it.chips) && it.chips.length > 0)),
		);
		if (detailed.length < 2) {
			errors.push({
				code: "PLATE_THIN",
				message: `${type} needs detail clauses (or a verbatim block, or chips) on most stops, not bare titles.`,
			});
		}
	}

	if (type === "compareFlows") {
		for (const key of ["left", "right"] as const) {
			const side = isRecord(body[key]) ? (body[key] as Record<string, unknown>) : null;
			const items = side && Array.isArray(side.items) ? side.items : [];
			if (items.length < 2) {
				errors.push({
					code: "PLATE_THIN",
					message: `compareFlows needs at least two events on the ${key} side; one event is not a flow.`,
				});
				continue;
			}
			const detailed = items.filter(
				(it) =>
					isRecord(it) &&
					(String(it.detail ?? "").trim().length >= 16 ||
						String(it.code ?? "").trim().length > 0 ||
						(Array.isArray(it.chips) && it.chips.length > 0)),
			);
			if (detailed.length < 2) {
				errors.push({
					code: "PLATE_THIN",
					message: `compareFlows needs detail clauses (or a verbatim block, or chips) on most ${key} events, not bare titles.`,
				});
			}
		}
	}

	if (type === "railFlow") {
		const items = Array.isArray(body.items) ? body.items : [];
		if (items.length < 3) {
			errors.push({
				code: "PLATE_THIN",
				message: "railFlow needs three to five named steps.",
			});
		}
		const detailed = items.filter(
			(it) => isRecord(it) && String(it.detail ?? "").trim().length >= 16,
		);
		if (detailed.length < 2) {
			errors.push({
				code: "PLATE_THIN",
				message: "railFlow steps need detail clauses on most steps.",
			});
		}
	}

	if (type === "graph") {
		const nodes = Array.isArray(body.nodes) ? body.nodes : [];
		const edges = Array.isArray(body.edges) ? body.edges : [];
		if (nodes.length < 3) {
			errors.push({
				code: "PLATE_THIN",
				message: "graph needs at least three nodes; two boxes are a compare, not a system.",
			});
		}
		if (edges.length < 2) {
			errors.push({
				code: "PLATE_THIN",
				message: "graph needs at least two edges so the structure carries information.",
			});
		}
	}

	if (type === "derivation") {
		const steps = Array.isArray(body.steps) ? body.steps : [];
		const noted = steps.filter(
			(s, i) => i === 0 || (isRecord(s) && String(s.note ?? "").trim().length >= 16),
		);
		if (steps.length < 2 || noted.length < steps.length) {
			errors.push({
				code: "PLATE_THIN",
				message:
					"derivation needs 2 to 5 steps and a real note (≥16 chars) on every step after the first.",
			});
		}
	}

	if (type === "tree") {
		const branches = Array.isArray(body.branches) ? body.branches : [];
		if (branches.length < 2) {
			errors.push({
				code: "PLATE_THIN",
				message: "tree needs at least two branches; one limb is a note, not a hierarchy.",
			});
		}
		// The map must name enough things to be a map: branches, children (IR
		// key `nodes`), and the items riding on their lines all count as named.
		let named = 0;
		for (const branch of branches) {
			if (!isRecord(branch)) continue;
			named += 1 + (Array.isArray(branch.items) ? branch.items.length : 0);
			const children = Array.isArray(branch.nodes) ? branch.nodes : [];
			for (const child of children) {
				if (!isRecord(child)) continue;
				named += 1 + (Array.isArray(child.items) ? child.items.length : 0);
			}
		}
		if (named < 4) {
			errors.push({
				code: "PLATE_THIN",
				message:
					"tree needs at least four named things below the root (branches, children, and items together), not a bare fork.",
			});
		}
	}

	if (type === "codeSteps") {
		const steps = Array.isArray(body.steps) ? body.steps : [];
		const solid = steps.filter(
			(s) =>
				isRecord(s) &&
				String(s.label ?? "").trim().length > 0 &&
				String(s.code ?? "")
					.split("\n")
					.filter((l) => l.trim().length > 0).length >= 2,
		);
		if (steps.length < 2 || solid.length < steps.length) {
			errors.push({
				code: "PLATE_THIN",
				message:
					"codeSteps needs 2 to 3 steps, every step labelled and carrying at least 2 verbatim code lines.",
			});
		}
	}

	if (type === "quote") {
		errors.push({
			code: "KIND_WEAK",
			message:
				"quote is a single sentence by design — refuse for teaching figures. Use railSteps, compare, metrics, cards, checklist, or table.",
		});
	}

	return errors;
};
