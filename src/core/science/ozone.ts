// Ozone layer: a separate system from the greenhouse effect. Ozone absorbs incoming UV
// sunlight; CFCs destroy it. Simplification: CFC-12 stands in for all ozone destroying gases,
// and ozone loss grows in a straight line with it, scaled so that today's real CFC-12 level
// gives today's real ozone loss.
import { SCIENCE } from './constants';

export function ozoneLossPercent(cfcPpb: number): number {
  const scaled =
    (Math.max(0, cfcPpb) / SCIENCE.cfc12Concentration2019.value) * SCIENCE.ozoneLossToday.value;
  return Math.min(100, scaled);
}
