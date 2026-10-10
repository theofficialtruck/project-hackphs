/**
 * What kind of number a value is, so the game can show players what is real science
 * and what is a game simplification.
 *
 * - measured:        observed quantity or physical constant
 * - assessed:        an IPCC best estimate that combines observations and models
 * - model-parameter: a parameter of a simplified model, taken from published work
 * - gameplay:        chosen to make the game work; not a scientific value
 */
export type ValueKind = 'measured' | 'assessed' | 'model-parameter' | 'gameplay';

/** A value together with the information needed to explain and cite it. */
export interface Sourced<T> {
  readonly value: T;
  readonly unit: string;
  /** Plain language meaning of the value. */
  readonly description: string;
  /** Where the value comes from: document, table/section and URL. */
  readonly source: string;
  readonly kind: ValueKind;
}
