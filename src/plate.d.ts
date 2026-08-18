export type PressPlate = {
	readonly frame: { readonly w: number; readonly h: number };
	readonly report: {
		readonly ok: boolean;
		readonly errors: readonly { readonly code?: string; readonly message?: string }[];
	};
};

export function buildPlate(
	compiled: unknown,
	opts?: { readonly validateNow?: boolean },
): PressPlate;
export function definePlate(spec: unknown): unknown;
