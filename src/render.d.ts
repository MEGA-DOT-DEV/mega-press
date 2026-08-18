import type { PressPlate } from "./plate.js";

export function mount(
	plate: PressPlate,
	host: HTMLElement,
	opts?: { readonly dpr?: number; readonly pixelSize?: number; readonly field?: unknown },
): void;
