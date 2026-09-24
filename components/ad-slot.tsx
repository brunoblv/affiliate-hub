import { adsConfig, shouldShowAds } from "@/lib/adsense/config";

type Slot = keyof typeof adsConfig.slots;

export function AdSlot({ slot, route, adsEligible }: { slot: Slot; route: string; adsEligible: boolean }) {
  if (!adsConfig.slots[slot] || !shouldShowAds(route, { adsEligible })) return null;
  // A provider component will be added with consent and real slot identifiers.
  return null;
}
