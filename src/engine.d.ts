export type PressPlate = {
	readonly frame: { readonly w: number; readonly h: number };
	readonly report: {
		readonly ok: boolean;
		readonly errors: readonly { readonly code?: string; readonly message?: string }[];
	};
};

declare module "./spec.js" {
	export function compileSpec(spec: unknown): unknown;
}

declare module "./plate.js" {
	export function buildPlate(
		compiled: unknown,
		opts?: { readonly validateNow?: boolean },
	): PressPlate;
	export function definePlate(spec: unknown): unknown;
}

declare module "./render.js" {
	export function mount(
		plate: PressPlate,
		host: HTMLElement,
		opts?: { readonly dpr?: number; readonly pixelSize?: number; readonly field?: unknown },
	): void;
}

declare module "./admissibility.js" {
	export type PressSpecValidation =
		| { readonly ok: true }
		| {
				readonly ok: false;
				readonly error: { readonly code: string; readonly message: string };
		  };
	export function validatePressSpec(spec: Record<string, unknown>): PressSpecValidation;
}
