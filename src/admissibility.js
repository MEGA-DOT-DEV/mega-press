import { buildPlate } from "./plate.js";
import { compileSpec } from "./spec.js";

const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
const wideGrapheme =
	/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Extended_Pictographic}]/u;

/**
 * Convex's isolate has neither a DOM nor OffscreenCanvas. Press still needs a
 * synchronous measurement surface to execute its real solve and quoin there.
 * This conservative, deterministic context is installed only when the runtime
 * has no canvas at all; browsers and the Node canvas verifier keep native font
 * metrics. Component construction, composition, solving, and validation still
 * run through compileSpec -> buildPlate({ validateNow: true }).
 */
function ensureMeasureSurface() {
	try {
		if (
			typeof OffscreenCanvas !== "undefined" &&
			typeof new OffscreenCanvas(1, 1).getContext("2d")?.measureText === "function"
		) {
			return;
		}
	} catch {
		// Fall through to the deterministic isolate surface.
	}
	try {
		if (
			typeof document !== "undefined" &&
			typeof document.createElement("canvas").getContext("2d")?.measureText === "function"
		) {
			return;
		}
	} catch {
		// Fall through to the deterministic isolate surface.
	}

	class HeadlessMeasureContext {
		font = "16px sans-serif";

		measureText(value) {
			const text = String(value);
			const size = Number(/(\d+(?:\.\d+)?)\s*px/.exec(this.font)?.[1] ?? 16);
			let em = 0;
			for (const { segment } of graphemeSegmenter.segment(text)) {
				if (/^\s$/u.test(segment)) em += 0.34;
				else if (wideGrapheme.test(segment)) em += 1;
				else if (/^[ilI1.,:;'|!]$/u.test(segment)) em += 0.32;
				else if (/^[mwMW@#%&]$/u.test(segment)) em += 0.86;
				else em += 0.58;
			}
			return {
				width: em * size,
				actualBoundingBoxAscent: size * 0.72,
				actualBoundingBoxDescent: size * 0.2,
				fontBoundingBoxAscent: size * 0.8,
				fontBoundingBoxDescent: size * 0.2,
			};
		}
	}

	class HeadlessOffscreenCanvas {
		getContext(type) {
			return type === "2d" ? new HeadlessMeasureContext() : null;
		}
	}

	globalThis.OffscreenCanvas = HeadlessOffscreenCanvas;
}

function refusal(error) {
	const reportErrors = Array.isArray(error?.report?.errors) ? error.report.errors : [];
	if (reportErrors.length > 0) {
		const first = reportErrors[0];
		return {
			ok: false,
			error: {
				code: String(first?.code ?? "PRESS_REFUSED"),
				message: reportErrors
					.map(
						(item) =>
							`${String(item?.code ?? "PRESS_REFUSED")}: ${String(item?.message ?? "Press refused the plate")}`,
					)
					.join("; "),
			},
		};
	}
	return {
		ok: false,
		error: {
			code: typeof error?.code === "string" ? error.code : "PRESS_BUILD",
			message:
				typeof error?.message === "string" ? error.message : String(error ?? "Press build refused"),
		},
	};
}

/** Execute the canonical Press compiler, solver, and validator without repair. */
export function validatePressSpec(spec) {
	ensureMeasureSurface();
	try {
		const plate = buildPlate(compileSpec(structuredClone(spec)), { validateNow: true });
		if (!plate?.report?.ok) {
			return refusal({ report: plate?.report, message: "Press validation report was not ok" });
		}
		return { ok: true };
	} catch (error) {
		return refusal(error);
	}
}
