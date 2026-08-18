export type PressSpecValidation =
	| { readonly ok: true }
	| {
			readonly ok: false;
			readonly error: { readonly code: string; readonly message: string };
	  };

export function validatePressSpec(spec: Record<string, unknown>): PressSpecValidation;
