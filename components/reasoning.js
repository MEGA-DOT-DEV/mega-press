/**
 * PRESS / components / reasoning
 *
 * Shapes for an argument rather than for a quantity.
 *
 * The rest of the library draws what is true: a sequence that happened, a
 * quantity that was measured, a set of parts that sum to a whole. None of it
 * draws *why* something is true, which is most of what technical and
 * theoretical teaching consists of.
 *
 * A derivation is the smallest useful shape for that. It is a sequence, so it
 * borrows the rail, but it differs from `railSteps` in the one way that
 * matters: a step in a process is a thing you do, and a step in a derivation is
 * a thing that follows. The component holds the author to that difference.
 */

import { rail as deriveRail } from "../src/connect.js";
import { marker, row, stack, text } from "../src/solve.js";
import { COLOR, PressError, STROKE, space } from "../src/tokens.js";

/**
 * A chain of expressions, each one following from the last.
 *
 * The expressions are mono, because an expression is technical metadata in the
 * sense the type scale means it: an identifier, not prose. The annotations are
 * `body`, because they are commentary on the step and commentary never outranks
 * the thing it annotates.
 *
 * ## The rule this component exists to enforce
 *
 * **Every step after the first says what changed.** A derivation whose steps
 * are unannotated is a list of expressions that the author can already read and
 * the reader cannot, and it is the single most common way a technical
 * explanation fails: the writer knows which term moved, so the move looks
 * self-evident to them and to nobody else.
 *
 * This is the same class of rule as `quote()` refusing an unattributed
 * quotation and `hero()` refusing an uncaptioned number. In each case the
 * missing piece is the one that turns a display into evidence, and in each case
 * it is missing because the author already had it in their head.
 *
 * @param {object[]} steps  { expr, note?, accent? }. `note` required after the first.
 * @param {string}   [lead] what the first line is, when it is not self evident
 */
export function derivation({ steps, gap = 4, markerSize = space(2) } = {}) {
	if (!steps || steps.length < 2) {
		throw new PressError(
			"DERIVATION_TOO_SHORT",
			"derivation needs at least two steps. One expression is a statement, and a " +
				"statement belongs in a quote or a metric row.",
		);
	}
	if (steps.length > 5) {
		throw new PressError(
			"DERIVATION_TOO_LONG",
			`derivation was given ${steps.length} steps and five is the cap. Past that the ` +
				`frame is carrying a proof rather than making a claim, and the reader needs it ` +
				`broken into frames they can stop at.`,
		);
	}

	steps.forEach((s, i) => {
		if (!s?.expr) {
			throw new PressError("DERIVATION_STEP_EMPTY", `step ${i + 1} has no expression.`);
		}
		if (i > 0 && !s.note) {
			throw new PressError(
				"STEP_WITHOUT_REASON",
				`step ${i + 1} does not say what changed. Every step after the first carries a ` +
					`note naming the move, because the writer knows which term shifted and that is ` +
					`exactly why it looks self evident to them and to nobody else.`,
			);
		}
	});

	const markers = [];

	const rows = steps.map((step, _i) => {
		/* A ring until the step is reached, filled once it is: the same vocabulary
       a rail already uses, so a reader who has seen one sequence in the set can
       read this one without being taught it twice. */
		const dot = marker({
			size: markerSize,
			fill: step.accent ? COLOR.red : COLOR.ink,
			ring: false,
			alignTo: "datum",
		});
		markers.push(dot);

		return row({
			gap: 3,
			align: "baseline",
			unit: true,
			children: [
				dot,
				stack({
					gap: 1,
					grow: true,
					children: [
						text(step.expr, "datum", { color: step.accent ? COLOR.red : COLOR.text }),
						step.note ? text(step.note, "body", { color: COLOR.muted, commentary: true }) : null,
					],
				}),
			],
		});
	});

	const node = stack({ gap, children: rows });

	/* The rail is derived from the dots, so the thread of the argument cannot be
     drawn anywhere other than through the steps it threads. */
	node.press = {
		connect: () => ({
			rails: [
				deriveRail(markers, {
					axis: "y",
					weight: STROKE.connector,
					color: COLOR.black2,
				}),
			],
		}),
	};

	node.markers = markers;
	return node;
}
