/**
 * PRESS / components / table
 *
 * A table is where alignment fails most visibly, because a column is a promise:
 * every cell in it starts on the same vertical, and every row sits on the same
 * baseline. Neither survives being assembled by hand.
 *
 * Here both are derived. A column is as wide as the widest thing in it, header
 * included, measured before anything is placed. Rows align on the baseline, so
 * a mono numeral and a Geist label in one row share a line even though their
 * faces and sizes differ.
 *
 * Column type also decides the face and the alignment, so a table cannot mix
 * conventions for the same kind of value:
 *
 *   text     Geist, left      labels, categories, names
 *   number   mono, right      quantities, counts, identifiers
 *   tag      mono, left       short codes and states
 */

import { ruleAcross } from "../src/connect.js";
import { row, stack, text } from "../src/solve.js";
import { measure } from "../src/text.js";
import { COLOR, STROKE, snap, space } from "../src/tokens.js";

const TYPES = {
	text: { role: "list", align: "left", color: COLOR.text, family: undefined },
	number: { role: "datum", align: "right", color: COLOR.text, family: undefined },
	tag: { role: "utility", align: "left", color: COLOR.muted, family: undefined },
};

/**
 * @param {object[]} columns  { key, label, type, grow? }
 * @param {object[]} rows     plain objects keyed by column key
 */
export function table({ columns, rows: data, gap = 3, headerRule = true, rowRules = true } = {}) {
	if (!columns || columns.length < 2) {
		throw new Error("table needs at least two columns. One column is a list.");
	}
	if (!data?.length) throw new Error("table needs at least one row.");

	for (const col of columns) {
		if (!TYPES[col.type]) {
			throw new Error(
				`table column "${col.key}" has type "${col.type}". Types are: ${Object.keys(TYPES).join(", ")}. ` +
					`The type decides the face and the alignment, so a column cannot mix conventions.`,
			);
		}
	}
	if (!columns.some((c) => c.grow)) columns[0].grow = true;

	/* Column widths, derived from the widest cell including the header. Nothing
     here is chosen, so a column cannot be one character too narrow. */
	const widths = columns.map((col) => {
		const t = TYPES[col.type];
		const header = measure(col.label, "utility");
		const cells = data.map((r) => measure(String(r[col.key] ?? ""), t.role));
		return snap(Math.max(header, ...cells) + space(2));
	});

	const cell = (value, col, i, isHeader) => {
		const t = TYPES[col.type];
		return text(isHeader ? col.label : String(value ?? ""), isHeader ? "utility" : t.role, {
			color: isHeader ? COLOR.quiet : t.color,
			align: t.align,
			grow: col.grow || undefined,
			width: col.grow ? undefined : widths[i],
		});
	};

	const header = row({
		gap: 3,
		align: "baseline",
		children: columns.map((col, i) => cell(null, col, i, true)),
	});

	const bodyRows = data.map((r) =>
		row({
			gap: 3,
			align: "baseline",
			unit: true,
			ruledRow: true,
			children: columns.map((col, i) => cell(r[col.key], col, i, false)),
		}),
	);

	const node = stack({ gap, children: [header, ...bodyRows] });

	// Half the row gap, so a rule lands between two rows instead of on the
	// descenders of the one above it.
	const half = space(gap) / 2;

	/* Every rule spans the container, so they share a measure by construction
     and RULE_MEASURE_MISMATCH cannot fire. The header rule is heavier than the
     row rules, which is the only difference between them. */
	node.press = {
		connect: () => {
			const rules = [];
			if (headerRule) {
				rules.push(
					ruleAcross(header, {
						at: "bottom",
						offset: half,
						weight: STROKE.rule,
						color: COLOR.black2,
					}),
				);
			}
			if (rowRules) {
				for (const r of bodyRows.slice(0, -1)) {
					rules.push(
						ruleAcross(r, {
							at: "bottom",
							offset: half,
							weight: STROKE.divider,
							color: COLOR.black1,
						}),
					);
				}
			}
			return { rules };
		},
	};

	node.header = header;
	node.bodyRows = bodyRows;
	return node;
}
