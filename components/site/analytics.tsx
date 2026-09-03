"use client";

import { useEffect } from "react";
import { aplicarConsentimento, lerConsentimento } from "./consentimento";

/** Reaplica o consentimento salvo depois do default 'denied' do Consent Mode. */
export function Analytics() {
  useEffect(() => {
    const atual = lerConsentimento();
    if (atual) aplicarConsentimento(atual);
  }, []);
  return null;
}
