export type PressPlate = {
	readonly theme?: import("./theme.js").PressTheme;
	readonly frame: { readonly w: number; readonly h: number };
	readonly report: {
		readonly ok: boolean;
		readonly errors: readonly { readonly code?: string; readonly message?: string }[];
	};
};

export function buildPlate(
	compiled: unknown,
	opts?: { readonly validateNow?: boolean; readonly theme?: import("./theme.js").PressTheme; readonly chrome?: import("./theme.js").PressChrome | import("./theme.js").PressChromePreset },
): PressPlate;
export function definePlate(spec: unknown): unknown;
