/**
 * @mega/press public contract.
 * parseArtifact → buildArtifact → mountArtifact.
 */
export type {
	AccessBoundaryBoxPlan,
	AccessBoundaryDirection,
	AccessBoundaryEdgeKind,
	AccessBoundaryEdgePlan,
	AccessBoundaryRegionPlan,
	ArtifactKind,
	ArtifactPlan,
	LineChartAxisPlan,
	LineChartPointPlan,
	LineChartSeriesPlan,
	PlatePlan,
	PlatePlanKind,
} from "./kernel/platePlan.js";
export {
	ACCESS_BOUNDARY_DIRECTIONS,
	ACCESS_BOUNDARY_EDGE_KINDS,
	ARTIFACT_JSON_SCHEMA,
	ARTIFACT_KINDS,
	compileAndLockPlatePlan,
	compilePlatePlan,
	parsePlatePlan,
	PLATE_PLAN_JSON_SCHEMA,
	PLATE_PLAN_KINDS,
} from "./kernel/platePlan.js";

export type { ParseResult } from "./parse.js";
export { parseArtifact } from "./parse.js";

export type { BuildResult } from "./build.js";
export { buildArtifact } from "./build.js";

export type { EvaluateOptions, EvaluateResult } from "./evaluate.js";
export { evaluateSpec, proveArtifact } from "./evaluate.js";

export type { MountArtifactOpts, MountedArtifact } from "./mount.js";
export { ensurePressFonts, LEGIBILITY_MIN_WIDTH, MountRefusal, mountArtifact, providePressFontCss } from "./mount.js";

export { outlineToPlatePlan as outlineToArtifact, outlineToPlatePlan } from "./kernel/outlineToPlan.js";

export type {
	ArtifactModuleId,
	ArtifactModuleSchema,
	ArtifactModuleSummary,
} from "./kernel/artifactModules.js";
export {
	ARTIFACT_MODULE_IDS,
	artifactCatalogPromptBlock,
	getArtifactModuleSchema,
	isArtifactModuleId,
	listArtifactModules,
} from "./kernel/artifactModules.js";

export type { AuthorPlateBody, AuthorPlateValidation } from "./kernel/authorPlate.js";
export { validateAuthorPlate } from "./kernel/authorPlate.js";

export type { LockResult, PressError } from "./kernel/lock.js";
export { frameSize, lockPlate } from "./kernel/lock.js";

export { normalizePlateSpec } from "./kernel/normalize.js";

export type { PedagogyError } from "./kernel/platePedagogy.js";
export { assessPlatePedagogy } from "./kernel/platePedagogy.js";

export type { AllowedComponent, PlateFrame } from "./kernel/vocabulary.js";
export {
	ALLOWED_COMPONENTS,
	COMPONENT_GUIDE,
	PLATE_FRAMES,
	platesPromptSection,
	WITHHELD_COMPONENTS,
} from "./kernel/vocabulary.js";

export { getKindModule, KIND_MODULES } from "./kinds.js";

export type {
	PressChrome,
	PressChromePreset,
	PressColorTheme,
	PressFontTheme,
	PressSyntaxTheme,
	PressTheme,
	ResolvedChrome,
	ResolvedPressTheme,
} from "./theme.js";
export { DEFAULT_SYNTAX, SYNTAX_CLASSES } from "./syntax.js";
export {
	CHROME_PRESETS,
	PRESS_THEMES,
	SUPPORTED_PRESS_FONTS,
	configurePress,
	getPressTheme,
	resetPressTheme,
	resolveChrome,
	resolvePressTheme,
	withPressTheme,
} from "./theme.js";

export { createLessonController, sampleLesson } from "./lesson.js";
export type {
	Lesson, LessonStep, LessonState, LessonEventSource, LessonEvent,
	LessonObserver, LessonControllerOptions, LessonActionResult,
	LessonController, LessonSample,
} from "./lesson.js";
