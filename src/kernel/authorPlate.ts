import { validateCanonicalPressSpec } from "./authorPlateSemantics.js";

export type AuthorPlateBody = {
	readonly type: "plate";
	readonly spec: Record<string, unknown>;
	readonly lock: {
		readonly status: "locked";
		readonly errors?: readonly { readonly code: string; readonly message: string }[];
	};
};

export type AuthorPlateValidation =
	| { readonly ok: true; readonly value: AuthorPlateBody }
	| {
			readonly ok: false;
			readonly error: {
				readonly _tag: "InvalidDocument";
				readonly code: string;
				readonly message: string;
			};
	  };

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const invalid = (code: string, message: string): AuthorPlateValidation => ({
	ok: false,
	error: { _tag: "InvalidDocument", code, message },
});

const unknownFields = (
	value: Record<string, unknown>,
	allowed: ReadonlySet<string>,
): readonly string[] => Object.keys(value).filter((key) => !allowed.has(key));

/**
 * One Press-backed Artifact authority shared by edit compilation, server writes,
 * publication, and read presentation. Accepted bytes are already canonical and
 * execute the real Press compiler semantics; no persistence boundary repairs them.
 */
export const validateAuthorPlate = (value: unknown): AuthorPlateValidation => {
	if (!isRecord(value) || value.type !== "plate" || !isRecord(value.spec)) {
		return invalid("PLATE_SHAPE", "invalid plate shape");
	}
	const outerUnknown = unknownFields(value, new Set(["type", "spec", "lock"]));
	if (outerUnknown.length > 0) {
		return invalid("UNKNOWN_FIELD", `plate: unknown field(s): ${outerUnknown.join(", ")}`);
	}
	if (!isRecord(value.lock) || value.lock.status !== "locked") {
		return invalid("PLATE_LOCK", "authored plates require a locked Press result");
	}
	const lockUnknown = unknownFields(value.lock, new Set(["status", "errors"]));
	if (lockUnknown.length > 0) {
		return invalid("UNKNOWN_FIELD", `plate.lock: unknown field(s): ${lockUnknown.join(", ")}`);
	}
	if (
		value.lock.errors !== undefined &&
		(!Array.isArray(value.lock.errors) ||
			!value.lock.errors.every((error) => {
				if (!isRecord(error)) return false;
				const unknown = unknownFields(error, new Set(["code", "message"]));
				return (
					unknown.length === 0 &&
					typeof error.code === "string" &&
					Boolean(error.code.trim()) &&
					typeof error.message === "string" &&
					Boolean(error.message.trim())
				);
			}))
	) {
		return invalid("PLATE_LOCK", "plate lock errors must contain only a code and message");
	}
	const id = value.spec.id;
	const title = value.spec.title;
	if (typeof id !== "string" || !id.trim() || typeof title !== "string" || !title.trim()) {
		return invalid("BAD_SPEC", "plate id and title are required");
	}
	const body = value.spec.body;
	if (!isRecord(body) || typeof body.type !== "string" || !body.type.trim()) {
		return invalid("BAD_SPEC", "plate body type is required");
	}

	const semantic = validateCanonicalPressSpec(value.spec);
	if (!semantic.ok) {
		return invalid(
			semantic.error.code,
			`invalid plate spec: ${semantic.error.code}: ${semantic.error.message}`,
		);
	}
	return { ok: true, value: value as AuthorPlateBody };
};
