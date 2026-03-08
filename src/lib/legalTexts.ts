export const ADVISOR_CHECKBOX_1_TEXT =
  'I confirm that I hold a valid SEBI registration as Investment Advisor or Research Analyst. I am solely responsible for all trading signals, advice, analysis, and content I post on TradeCircle platform operated by STREZONIC PRIVATE LIMITED (CIN: U62099MH2025PTC453360). I acknowledge that STREZONIC PRIVATE LIMITED is only a technology platform and authorized agent for payment collection on my behalf. Any SEBI violations, user complaints, or legal disputes arising from my advice are entirely my sole responsibility.';

export const ADVISOR_CHECKBOX_2_TEXT =
  'I agree to fully indemnify and hold harmless STREZONIC PRIVATE LIMITED (CIN: U62099MH2025PTC453360, PAN: ABQCS8594P), its directors and employees against any losses, fines, penalties, or legal costs arising from my trading signals, SEBI violations, or user complaints. I confirm I have read the full Platform Agent Agreement before accepting.';

export const SUBSCRIPTION_RISK_TEXT =
  'I acknowledge that stock market trading and investment signals carry significant financial risk. I take complete responsibility for all trading decisions I make. STREZONIC PRIVATE LIMITED (TradeCircle) (CIN: U62099MH2025PTC453360) operates as a technology listing platform only and holds no liability for any profits or losses from signals provided by advisors on this platform.';

export const GENERAL_TERMS_TEXT =
  'By creating an account I confirm that I understand TradeCircle is a discovery platform for SEBI-registered advisors. All investment decisions are my own responsibility. STREZONIC PRIVATE LIMITED is not liable for any financial outcomes resulting from advisor signals viewed on this platform.';

export const FOOTER_DISCLAIMERS = [
  '⚠️ Disclaimer: TradeCircle is operated by STREZONIC PRIVATE LIMITED (CIN: U62099MH2025PTC453360), a technology platform that lists SEBI-registered investment advisors. We do not provide investment advice. All trading decisions are your sole responsibility. Market investments carry risk. Past performance is not indicative of future results.',
  '⚠️ Risk Notice: The advisor signals and analysis displayed on this page are provided by an independently SEBI-registered advisor. STREZONIC PRIVATE LIMITED (TradeCircle) is not responsible for the accuracy or outcome of any signal. You are solely responsible for your investment choices. Securities trading involves risk of loss.',
  '⚠️ Important: Signals shown are for informational purposes only. STREZONIC PRIVATE LIMITED operating as TradeCircle (CIN: U62099MH2025PTC453360) is a listing platform and NOT a SEBI registered advisor. Your capital is at risk. Please consult a qualified financial advisor before making investment decisions.',
];

export function getDeviceInfo(): string {
  const ua = navigator.userAgent;
  if (/Mobi|Android/i.test(ua)) return 'mobile';
  if (/Tablet|iPad/i.test(ua)) return 'tablet';
  return 'desktop';
}

export async function getIpAddress(): Promise<string> {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    return data.ip || 'unknown';
  } catch {
    return 'unknown';
  }
}
