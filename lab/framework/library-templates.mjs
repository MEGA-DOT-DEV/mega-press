import {LIBRARY_STRUCTURES} from './library-structures.mjs';
import {LIBRARY_EVIDENCE} from './library-evidence.mjs';
import {LIBRARY_ANNOTATIONS} from './library-annotations.mjs';

// Discovery metadata for editable composition examples, not a new component
// registry or a closed template API. Any source can be recomposed normally.
export const LIBRARY_TEMPLATES=Object.freeze([
  ...LIBRARY_STRUCTURES,
  ...LIBRARY_EVIDENCE,
  ...LIBRARY_ANNOTATIONS,
]);
