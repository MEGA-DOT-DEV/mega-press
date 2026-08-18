import {
	type ArtifactPlan,
	ARTIFACT_KINDS,
} from "./kernel/platePlan.js";

export type ParseOk = { readonly ok: true; readonly plan: ArtifactPlan };
export type ParseFail = {
	readonly ok: false;
	readonly errors: readonly { readonly code: string; readonly message: string }[];
};
export type ParseResult = ParseOk | ParseFail;

const isRecord = (v: unknown): v is Record<string, unknown> =>
	typeof v === "object" && v !== null && !Array.isArray(v);

/** Strict parse. Unknown kinds and missing title/kind refuse. */
export function parseArtifact(json: unknown): ParseResult {
	if (!isRecord(json)) {
		return {
			ok: false,
			errors: [{ code: "BAD_PLAN", message: "artifact JSON must be an object" }],
		};
	}
	const kind = String(json.kind ?? "");
	if (!(ARTIFACT_KINDS as readonly string[]).includes(kind)) {
		return {
			ok: false,
			errors: [{ code: "UNKNOWN_KIND", message: `unknown artifact kind "${kind}"` }],
		};
	}
	const title = String(json.title ?? "").trim();
	if (title.length < 4) {
		return {
			ok: false,
			errors: [{ code: "BAD_TITLE", message: "title must be at least 4 characters" }],
		};
	}
	const id = String(json.id ?? `plan-${kind}`)
		.replace(/[^a-zA-Z0-9_-]/g, "-")
		.slice(0, 64);
	return { ok: true, plan: { ...(json as unknown as ArtifactPlan), kind: kind as ArtifactPlan["kind"], id, title } };
}
