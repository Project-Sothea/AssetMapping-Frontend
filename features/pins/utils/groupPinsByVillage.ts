import type { Pin } from '@assetmapping/shared-types';

import { VILLAGES } from '~/shared/constants/villages';

export const ALL_VILLAGES_KEY = '__all__';
export const UNASSIGNED_VILLAGE_KEY = '__unassigned__';
export const UNASSIGNED_VILLAGE_LABEL = 'No village';

export type VillageOption = {
  key: string;
  label: string;
};

const compareText = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

export function villageKey(pin: Pin): string {
  const label = pin.cityVillage?.trim() ?? '';
  return label ? label.toLowerCase() : UNASSIGNED_VILLAGE_KEY;
}

/** Known villages plus any other village present on a pin. All is first; blank villages are last. */
export function listVillageOptions(pins: Pin[]): VillageOption[] {
  const labels = new Map<string, Map<string, number>>();
  let hasUnassigned = false;

  for (const name of VILLAGES) {
    const counts = labels.get(name.toLowerCase()) ?? new Map<string, number>();
    counts.set(name, counts.get(name) ?? 0);
    labels.set(name.toLowerCase(), counts);
  }

  for (const pin of pins) {
    const label = pin.cityVillage?.trim() ?? '';
    if (!label) {
      hasUnassigned = true;
      continue;
    }
    const key = label.toLowerCase();
    const counts = labels.get(key) ?? new Map<string, number>();
    counts.set(label, (counts.get(label) ?? 0) + 1);
    labels.set(key, counts);
  }

  const villages = [...labels.entries()]
    .map(([key, counts]) => ({ key, label: mostCommonLabel(counts) }))
    .sort((a, b) => compareText(a.label, b.label));

  const options: VillageOption[] = [{ key: ALL_VILLAGES_KEY, label: 'All villages' }, ...villages];
  if (hasUnassigned) {
    options.push({ key: UNASSIGNED_VILLAGE_KEY, label: UNASSIGNED_VILLAGE_LABEL });
  }
  return options;
}

export function comparePinNames(a: Pin, b: Pin): number {
  const byName = compareText(a.name ?? '', b.name ?? '');
  if (byName !== 0) return byName;
  return a.id.localeCompare(b.id);
}

function mostCommonLabel(labels: Map<string, number>): string {
  let best = '';
  let bestCount = -1;

  for (const [label, count] of labels) {
    if (count > bestCount || (count === bestCount && compareText(label, best) < 0)) {
      best = label;
      bestCount = count;
    }
  }

  return best;
}
