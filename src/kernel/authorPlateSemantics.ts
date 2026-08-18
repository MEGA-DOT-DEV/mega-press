import { validatePressSpec } from "../admissibility.js";
import { normalizePlateSpec } from "./normalize.js";

export type PressSemanticResult =
	| { readonly ok: true }
	| {
			readonly ok: false;
			readonly error: { readonly code: string; readonly message: string };
	  };

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const refusal = (code: string, message: string): PressSemanticResult => ({
	ok: false,
	error: { code, message },
});

const ownKeys = (value: Record<string, unknown>): string[] =>
	Object.keys(value).filter((key) => value[key] !== undefined);

const firstDifference = (left: unknown, right: unknown, path = "spec"): string | null => {
	if (Object.is(left, right)) return null;
	if (Array.isArray(left) || Array.isArray(right)) {
		if (!Array.isArray(left) || !Array.isArray(right)) return path;
		if (left.length !== right.length) return `${path}.length`;
		for (let index = 0; index < left.length; index += 1) {
			const difference = firstDifference(left[index], right[index], `${path}[${index}]`);
			if (difference) return difference;
		}
		return null;
	}
	if (!isRecord(left) || !isRecord(right)) return path;
	const leftKeys = ownKeys(left).sort();
	const rightKeys = ownKeys(right).sort();
	if (leftKeys.length !== rightKeys.length) return path;
	for (let index = 0; index < leftKeys.length; index += 1) {
		const leftKey = leftKeys[index];
		if (!leftKey || leftKey !== rightKeys[index]) return path;
		const difference = firstDifference(left[leftKey], right[leftKey], `${path}.${leftKey}`);
		if (difference) return difference;
	}
	return null;
};

/**
 * Shared editor/server authority. Content owns exact-byte and author-lock
 * policy; Press owns its vocabulary, compilation, solve, and quoin. No accepted
 * spec is normalized, repaired, or replaced before the real build boundary.
 */
export const validateCanonicalPressSpec = (spec: Record<string, unknown>): PressSemanticResult => {
	const normalized = normalizePlateSpec(structuredClone(spec));
	const difference = firstDifference(spec, normalized);
	if (difference) {
		return refusal(
			"PRESS_NORMALIZATION",
			`${difference} would be silently normalized by the reader; submit canonical Press bytes instead`,
		);
	}

	return validatePressSpec(spec);
};
