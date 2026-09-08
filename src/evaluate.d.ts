export const FRAME_LADDER: readonly ["landscape", "square", "portrait"];

export type EvaluateIssue = {
	readonly code: string;
	readonly message: string;
	readonly detail?: unknown;
};

export type EvaluateOk = {
	readonly ok: true;
	readonly spec: Record<string, unknown>;
	readonly warnings: readonly EvaluateIssue[];
	readonly plate?: unknown;
};

export type EvaluateFail = {
	readonly ok: false;
	readonly spec: Record<string, unknown>;
	readonly errors: readonly EvaluateIssue[];
	readonly warnings: readonly EvaluateIssue[];
};

export type EvaluateResult = EvaluateOk | EvaluateFail;

export type EvaluateOptions = { readonly theme?: import("./theme.js").PressTheme };
export function evaluateSpec(spec: Record<string, unknown>, opts?: EvaluateOptions): EvaluateResult;
export function proveArtifact(spec: Record<string, unknown>, opts?: EvaluateOptions): EvaluateResult;
