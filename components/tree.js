/**
 * PRESS / components / tree
 *
 * A mono hierarchy with drawn elbow connectors: the shape of `tree` output in
 * a terminal, for a capability map or a file layout read top to bottom.
 *
 * The elbows are NOT typography. Box-drawing glyphs (U+2500..257F) are not
 * guaranteed by the baked metrics table, and the house rule is that anything
 * carrying structure is a drawn stroke, not a character: the rails in
 * src/connect.js are derived lines, and these elbows are painted the same way,
 * with STROKE.connector weight in the connector ink. A glyph would also snap
 * to the type grid; a stroke lands exactly where the row geometry says.
 *
 * The whole tree is ONE information unit. A reader takes in "this root has
 * these limbs" as one map, the way a code block is one snippet and not
 * fourteen lines, so the container carries unit: true and the plate budget
 * charges 1 for the whole figure.
 *
 * Rows are single-line and verbatim, painted with the same measure the solver
 * sized them by (the codeLine pattern in components/code.js): a row wider than
 * the column refuses by name instead of wrapping, because a wrapped tree row
 * is no longer a tree row.
 *
 * Items on a branch are short mono tokens joined with a spaced middle dot.
 * U+00B7 is covered by the baked metrics table (verified: measure() of a
 * dotted run leaves metricWarnings() empty, no GLYPH_MISSING), so the
 * separator is real; if it ever fell out of the table the join would become
 * two spaces instead.
 */

import { custom } from "../src/solve.js";
import { measure } from "../src/text.js";
import {
	COLOR,
	FAMILY,
	lineHeight,
	PressError,
	space,
	STROKE,
	type,
	typeSize,
} from "../src/tokens.js";

const ROLE = "utility";

export const TREE_MIN_BRANCHES = 2;
export const TREE_MAX_BRANCHES = 4;
/** Root + branches + children. The reference figure is exactly six rows. */
export const TREE_MAX_ROWS = 6;

/** One level of indent: the elbow of depth d sits under the text of d - 1. */
const INDENT = space(5);
/** The elbow arm ends one text gap short of the row's own text. */
const ARM = space(4);
const ROW_H = lineHeight(ROLE) + space(1);
/** U+00B7, covered by the baked metrics table (see header comment). */
const SEP = " · ";

const clean = (v) => String(v ?? "").trim();

const cleanItems = (items, who) => {
	if (items === undefined) return [];
	if (!Array.isArray(items)) {
		throw new PressError("TREE_ITEMS_NOT_A_LIST", `${who}: items must be an array of short strings`);
	}
	return items.map((item) => {
		const s = clean(item);
		if (!s) {
			throw new PressError("TREE_ITEM_MISSING", `${who}: every item needs non-empty text`);
		}
		return s;
	});
};

/**
 * A branch's children ride under `nodes` in the wire IR, because `children` is
 * the spec compiler's reserved node slot (spec.js NODE_SLOTS): a JSON body
 * saying `children` would have its data recompiled as layout nodes. Hand
 * written JS may still say `children`; both names are read here.
 *
 * @param {object} spec
 * @param {{name: string, detail?: string}} spec.root  the trunk line; accent by default
 * @param {Array<{name: string, items?: string[], nodes?: Array<{name: string, items?: string[]}>}>} spec.branches
 * @param {boolean} [spec.accent]  paint the root name in the accent (default true)
 */
export function tree({ root, branches, accent = true } = {}) {
	if (!Array.isArray(branches) || branches.length < TREE_MIN_BRANCHES) {
		throw new PressError(
			"TREE_TOO_SHALLOW",
			`tree needs at least ${TREE_MIN_BRANCHES} branches (got ` +
				`${Array.isArray(branches) ? branches.length : 0}). One limb is a note, not a hierarchy.`,
		);
	}
	if (branches.length > TREE_MAX_BRANCHES) {
		throw new PressError(
			"TREE_TOO_MANY_BRANCHES",
			`tree has ${branches.length} branches and ${TREE_MAX_BRANCHES} is the cap. ` +
				`Past that the figure is a listing; split the map.`,
		);
	}
	const rootName = clean(root?.name);
	if (!rootName) {
		throw new PressError("TREE_ROOT_MISSING", "tree needs a root with a name: the thing the map is of.");
	}

	/* Flatten to rows the paint loop walks top to bottom. `trunk` records, per
	   ancestor level, whether that ancestor still has following siblings, which
	   is exactly the continuation stem rule of real `tree` output. */
	const rows = [
		{ depth: 0, name: rootName, detail: clean(root?.detail), items: [], last: true, trunk: [] },
	];
	branches.forEach((branch, i) => {
		const name = clean(branch?.name);
		if (!name) {
			throw new PressError("TREE_NAME_MISSING", `tree branch ${i + 1} needs a name`);
		}
		const lastBranch = i === branches.length - 1;
		rows.push({
			depth: 1,
			name,
			detail: "",
			items: cleanItems(branch?.items, `tree branch "${name}"`),
			last: lastBranch,
			trunk: [],
		});
		const children = branch?.nodes ?? branch?.children;
		if (children === undefined) return;
		if (!Array.isArray(children)) {
			throw new PressError(
				"TREE_CHILDREN_NOT_A_LIST",
				`tree branch "${name}": nodes must be an array`,
			);
		}
		children.forEach((child, j) => {
			if (child?.nodes !== undefined || child?.children !== undefined) {
				throw new PressError(
					"TREE_TOO_DEEP",
					`tree child "${clean(child?.name) || j + 1}" carries children of its own. ` +
						`Two levels below the root is the cap: a deeper hierarchy is a document, not a figure.`,
				);
			}
			const childName = clean(child?.name);
			if (!childName) {
				throw new PressError("TREE_NAME_MISSING", `tree branch "${name}" child ${j + 1} needs a name`);
			}
			rows.push({
				depth: 2,
				name: childName,
				detail: "",
				items: cleanItems(child?.items, `tree child "${childName}"`),
				last: j === children.length - 1,
				trunk: [!lastBranch],
			});
		});
	});

	if (rows.length > TREE_MAX_ROWS) {
		throw new PressError(
			"TREE_TOO_TALL",
			`tree has ${rows.length} rows and ${TREE_MAX_ROWS} is the cap (root included). ` +
				`Fold siblings into items on one line, or cut limbs the claim does not need.`,
		);
	}

	/* Item lists start on one shared vertical per sibling group, the way real
	   tree output pads names to a column, so "holds", "runs", "reaches" read as
	   one table and not three ragged lines. */
	const groups = new Map();
	for (const row of rows) {
		if (row.items.length === 0) continue;
		const key = `${row.depth}:${row.trunk.join(",")}`;
		groups.set(key, Math.max(groups.get(key) ?? 0, measure(row.name, ROLE)));
	}
	for (const row of rows) {
		const textX = row.depth * INDENT;
		const suffix = row.items.length ? row.items.join(SEP) : row.detail;
		const suffixX = row.items.length
			? textX + (groups.get(`${row.depth}:${row.trunk.join(",")}`) ?? 0) + space(2)
			: textX + measure(row.name, ROLE) + space(2);
		row.textX = textX;
		row.suffix = suffix;
		row.suffixX = suffixX;
		row.width = suffix ? suffixX + measure(suffix, ROLE) : textX + measure(row.name, ROLE);
	}

	const tracking = type(ROLE).tracking * typeSize(ROLE);

	return custom({
		unit: true,
		measure: (w) => {
			for (const row of rows) {
				if (row.width > w) {
					throw new PressError(
						"TREE_ROW_TOO_WIDE",
						`tree row "${row.name}" is ${Math.ceil(row.width)}px and the column is ` +
							`${Math.floor(w)}px. A tree row does not wrap: shorten the name or cut items.`,
					);
				}
			}
			return { w, h: rows.length * ROW_H };
		},
		paint: (ctx, rect, C) => {
			ctx.lineWidth = STROKE.connector;
			ctx.strokeStyle = C.black2;
			ctx.font = `400 ${typeSize(ROLE)}px ${FAMILY.mono}`;
			ctx.textAlign = "left";
			ctx.textBaseline = "middle";
			rows.forEach((row, i) => {
				const y = rect.y + i * ROW_H;
				const cy = y + ROW_H / 2;

				/* Continuation stems on ancestor levels that still have following
				   siblings: the vertical that carries a limb past its nephews. */
				row.trunk.forEach((alive, level) => {
					if (!alive) return;
					const xs = rect.x + level * INDENT + STROKE.connector / 2;
					ctx.beginPath();
					ctx.moveTo(xs, y);
					ctx.lineTo(xs, y + ROW_H);
					ctx.stroke();
				});

				/* The elbow itself: a stem from the row top (to the last sibling's
				   centre, past it for the ones that continue) and an arm to the text. */
				if (row.depth > 0) {
					const x0 = rect.x + (row.depth - 1) * INDENT;
					const xs = x0 + STROKE.connector / 2;
					ctx.beginPath();
					ctx.moveTo(xs, y);
					ctx.lineTo(xs, row.last ? cy : y + ROW_H);
					ctx.stroke();
					ctx.beginPath();
					ctx.moveTo(xs, cy);
					ctx.lineTo(x0 + ARM, cy);
					ctx.stroke();
				}

				if ("letterSpacing" in ctx) ctx.letterSpacing = `${tracking}px`;
				ctx.fillStyle = row.depth === 0 && accent ? C.red : C.text;
				ctx.fillText(row.name, rect.x + row.textX, cy);
				if (row.suffix) {
					ctx.fillStyle = C.muted;
					ctx.fillText(row.suffix, rect.x + row.suffixX, cy);
				}
				if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
			});
		},
	});
}
