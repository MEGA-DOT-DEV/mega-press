/**
 * Headless solve + validate. No DOM. Consumes the baked metrics table.
 * Frame selection (the smallest frame that fits) lives here so a lock is an
 * enumerable state that validate() re-checks, never a silent mutation.
 */
import { buildPlate } from "./plate.js";
import { compileSpec } from "./spec.js";

export const FRAME_LADDER = ["landscape", "square", "portrait"];

/** Geometric refusals that a taller frame might clear. Width is fixed. */
const ESCALATE = new Set(["TEXT_OVERFLOW", "CONTENT_OVERFLOW", "OUTSIDE_SAFE_AREA"]);

const shape = (e) => ({
	code: String(e.code || "SOLVE_FAILED"),
	message: String(e.message || e),
	...(e.detail ? { detail: e.detail } : {}),
});

const fromThrown = (err) => {
	if (err?.report?.errors?.length) return err.report.errors.map(shape);
	if (err?.code) return [shape(err)];
	return [{ code: "SOLVE_FAILED", message: err?.message || String(err) }];
};

/** Solve + validate one spec. Does not escalate. */
export function evaluateSpec(spec) {
	try {
		const plate = buildPlate(compileSpec(spec), { validateNow: false });
		const errors = (plate.report?.errors ?? []).map(shape);
		const warnings = (plate.report?.warnings ?? []).map(shape);
		return {
			ok: errors.length === 0,
			errors,
			warnings,
			spec,
			plate,
		};
	} catch (err) {
		return {
			ok: false,
			errors: fromThrown(err),
			warnings: [],
			spec,
		};
	}
}

/**
 * Frames are earned, not declared. The ladder is walked smallest-first —
 * landscape, square, portrait — and the plate locks on the shortest frame
 * whose content fits, because every taller frame holds the same content with
 * more dead ground under it. A spec frame is a hint, not a coordinate: when
 * the walk lands on a different frame, `steppedFrom` records the hint, in
 * both directions — a tall rail steps up off landscape exactly as before,
 * and a two-block square steps down to the landscape it actually fills.
 * Every attempt is a full re-validate. No truncation, no off-scale values.
 * A host that needs an exact aspect calls evaluateSpec directly.
 */
export function proveArtifact(spec) {
	const asked = FRAME_LADDER.includes(spec.frame) ? spec.frame : "landscape";
	let last = null;
	for (let i = 0; i < FRAME_LADDER.length; i++) {
		const frame = FRAME_LADDER[i];
		const candidate =
			frame === asked
				? { ...spec, frame }
				: { ...spec, frame, steppedFrom: spec.steppedFrom ?? asked };
		const result = evaluateSpec(candidate);
		last = result;
		if (result.ok) {
			return {
				ok: true,
				spec: candidate,
				warnings: result.warnings,
				plate: result.plate,
			};
		}
		const canClimb =
			i < FRAME_LADDER.length - 1 && result.errors.some((e) => ESCALATE.has(e.code));
		if (!canClimb) {
			return {
				ok: false,
				spec: candidate,
				errors: result.errors,
				warnings: result.warnings,
			};
		}
	}
	return {
		ok: false,
		spec: last?.spec ?? spec,
		errors: last?.errors ?? [{ code: "SOLVE_FAILED", message: "prove produced no attempt" }],
		warnings: last?.warnings ?? [],
	};
}
