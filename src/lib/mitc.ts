export const MITC_VERSION = '2026-07-27';

/**
 * SEBI Most Important Terms & Conditions shown to the client before payment.
 * Kept in sync with supabase/functions/_shared/compliance.ts (buildMitc).
 */
export function buildMitc(opts: {
  advisorName: string;
  sebiRegNo: string;
  groupName: string;
  price: number;
  durationDays: number;
}): { heading: string; body: string }[] {
  const { advisorName, sebiRegNo, groupName, price, durationDays } = opts;
  return [
    {
      heading: 'Parties',
      body: `This agreement is between you ("Client") and ${advisorName}, a Research Analyst registered with SEBI under registration number ${sebiRegNo} ("RA").`,
    },
    {
      heading: 'Service',
      body: `The RA provides non-personalised research recommendations through the package "${groupName}". This is not personalised investment advice or portfolio management.`,
    },
    {
      heading: 'Fees',
      body: `₹${price} for ${durationDays} days, collected directly by the RA. RA Circle (STREZONIC PRIVATE LIMITED) is a technology provider only — it does not collect advisory fees and earns no commission on this transaction.`,
    },
    {
      heading: 'No guaranteed returns',
      body: 'Markets are subject to risk. Past performance is not indicative of future results. No profit is assured and no protection against loss is offered.',
    },
    {
      heading: 'Risk disclosure',
      body: 'You confirm you have read the standard SEBI risk disclosure and accept full responsibility for every trading and investment decision you take.',
    },
    {
      heading: 'Conflict of interest',
      body: 'The RA discloses material conflicts of interest, including holdings in recommended securities, per SEBI (Research Analysts) Regulations, 2014.',
    },
    {
      heading: 'Termination & refunds',
      body: "The subscription runs for the stated term. Refunds, if any, follow the RA's own policy. RA Circle does not process refunds on the RA's behalf.",
    },
    {
      heading: 'Grievance redressal',
      body: 'Raise complaints with the RA first. Unresolved complaints may be escalated to SEBI SCORES (scores.sebi.gov.in) and then to smartodr.in.',
    },
    {
      heading: 'Data protection',
      body: 'Identity details are processed under the DPDP Act, 2023 solely for regulatory compliance. Your PAN is stored encrypted and is always displayed masked.',
    },
    {
      heading: 'Record retention',
      body: 'A hardened copy of this agreement, with identity, consent metadata and payment reference, is retained for five years for SEBI audit.',
    },
  ];
}
