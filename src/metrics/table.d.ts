export const METRICS_TABLE: {
	readonly version: number;
	readonly refSize: number;
	readonly faces: Record<
		string,
		{
			readonly sha256: string;
			readonly missing: number;
			readonly ascent: number;
			readonly descent: number;
			readonly cap: number;
			readonly advances: Record<string, number>;
		}
	>;
};

export function parseFont(font: string): { size: number; names: string[] };
export function resolveFace(names: readonly string[]): {
	name: string;
	face: (typeof METRICS_TABLE)["faces"][string];
};
export function tableWidth(font: string | { size: number; names: string[] }, text: string): number;
export function tableFontMetrics(font: string | { size: number; names: string[] }): {
	ascent: number;
	descent: number;
	cap: number;
};
export function createTableMeasureContext(): {
	font: string;
	measureText(text: string): {
		width: number;
		fontBoundingBoxAscent: number;
		fontBoundingBoxDescent: number;
		actualBoundingBoxAscent: number;
		actualBoundingBoxDescent: number;
	};
};
export function metricWarnings(): readonly { readonly code: string; readonly message: string }[];
export function clearMetricWarnings(): void;
