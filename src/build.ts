import { compileArtifactPlan } from "./kinds.js";
import type { ArtifactPlan } from "./kernel/platePlan.js";
import { lockPlate } from "./kernel/lock.js";
import { assessPlatePedagogy } from "./kernel/platePedagogy.js";

export type BuildOk = { readonly ok: true; readonly spec: Record<string, unknown> };
export type BuildFail = {
	readonly ok: false;
	readonly errors: readonly { readonly code: string; readonly message: string }[];
	readonly spec?: Record<string, unknown>;
};
export type BuildResult = BuildOk | BuildFail;

/** Compile + lock + pedagogy. Fail-closed — never invents slot bodies. */
export function buildArtifact(plan: ArtifactPlan): BuildResult {
	const compiled = compileArtifactPlan(plan);
	if (!compiled.ok) return compiled;
	const locked = lockPlate(compiled.spec);
	if (!locked.ok) return { ok: false, spec: locked.spec, errors: locked.errors };
	const pedagogy = assessPlatePedagogy(locked.spec);
	if (pedagogy.length > 0) {
		return { ok: false, spec: locked.spec, errors: pedagogy };
	}
	return { ok: true, spec: locked.spec };
}
