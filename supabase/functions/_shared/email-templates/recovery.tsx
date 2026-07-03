/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import {
  main, container, header, brandText, brandAccent, body, h1, text, link,
  button, divider, footer, footerBar,
} from './_shared-styles.ts'

interface RecoveryEmailProps {
  siteName: string
  siteUrl?: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ siteUrl, confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your RA Circle password</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brandText}>RA <span style={brandAccent}>Circle</span></Text>
        </Section>
        <Section style={body}>
          <Heading style={h1}>Reset your password</Heading>
          <Text style={text}>
            We received a request to reset the password for your RA Circle account. Click below to choose a new one — this link expires in 60 minutes.
          </Text>
          <Button style={button} href={confirmationUrl}>Reset Password</Button>
          <Text style={{ ...text, fontSize: '13px', marginTop: '24px' }}>
            Or paste this link in your browser:<br />
            <Link href={confirmationUrl} style={link}>{confirmationUrl}</Link>
          </Text>
          <div style={divider} />
          <Text style={footer}>
            If you didn't request this, your password won't change. For your security, never share this link with anyone.
          </Text>
        </Section>
        <Section style={footerBar}>
          RA Circle · Operated by STREZONIC PVT LTD<br />
          <Link href={siteUrl || 'https://racircle.in'} style={{ color: '#64748B', textDecoration: 'underline' }}>racircle.in</Link>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail
