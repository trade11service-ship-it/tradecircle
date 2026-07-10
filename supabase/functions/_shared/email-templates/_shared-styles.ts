// Shared brand styles for RA Circle auth emails
export const brand = {
  slate: '#1F2937',
  sky: '#0EA5E9',
  emerald: '#10B981',
  muted: '#64748B',
  border: '#E2E8F0',
  faint: '#F8FAFC',
}

export const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
  margin: 0,
  padding: '32px 0',
}

export const container = {
  maxWidth: '520px',
  margin: '0 auto',
  padding: '0',
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  border: `1px solid ${brand.border}`,
  overflow: 'hidden' as const,
}

export const header = {
  backgroundColor: '#ffffff',
  padding: '24px 32px',
  textAlign: 'center' as const,
  borderBottom: `1px solid ${brand.border}`,
}

export const brandText = {
  fontSize: '22px',
  fontWeight: 700 as const,
  margin: 0,
  color: '#ffffff',
  letterSpacing: '-0.01em',
}

export const brandAccent = { color: brand.sky }

export const body = { padding: '32px' }

export const h1 = {
  fontSize: '22px',
  fontWeight: 700 as const,
  color: brand.slate,
  margin: '0 0 16px',
  lineHeight: '1.3',
}

export const text = {
  fontSize: '15px',
  color: '#334155',
  lineHeight: '1.6',
  margin: '0 0 20px',
}

export const link = { color: brand.sky, textDecoration: 'underline' }

export const button = {
  backgroundColor: brand.sky,
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 600 as const,
  borderRadius: '8px',
  padding: '13px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}

export const codeStyle = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '28px',
  fontWeight: 700 as const,
  color: brand.slate,
  backgroundColor: brand.faint,
  border: `1px solid ${brand.border}`,
  borderRadius: '8px',
  padding: '16px 24px',
  letterSpacing: '6px',
  display: 'inline-block',
  margin: '0 0 24px',
}

export const divider = {
  borderTop: `1px solid ${brand.border}`,
  margin: '28px 0 20px',
}

export const footer = {
  fontSize: '12px',
  color: brand.muted,
  lineHeight: '1.5',
  margin: '0',
}

export const footerBar = {
  backgroundColor: brand.faint,
  padding: '20px 32px',
  borderTop: `1px solid ${brand.border}`,
  fontSize: '12px',
  color: brand.muted,
  lineHeight: '1.5',
  textAlign: 'center' as const,
}
