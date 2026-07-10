/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import {
  main, container, header, brandText, brandAccent, body, h1, text, link,
  button, divider, footer, footerBar,
} from './_shared-styles.ts'

interface MagicLinkEmailProps {
  siteName: string
  siteUrl?: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ siteUrl, confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your secure sign-in link for RA Circle</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <img src="https://racircle.in/favicon.png" alt="RA Circle" width="120" style={{ display: "block", height: "auto", maxWidth: "120px" }} />
        </Section>
        <Section style={body}>
          <Heading style={h1}>Sign in to RA Circle</Heading>
          <Text style={text}>
            Click the button below to sign in securely. This link expires in 15 minutes and can only be used once.
          </Text>
          <Button style={button} href={confirmationUrl}>Sign In</Button>
          <Text style={{ ...text, fontSize: '13px', marginTop: '24px' }}>
            Or paste this link in your browser:<br />
            <Link href={confirmationUrl} style={link}>{confirmationUrl}</Link>
          </Text>
          <div style={divider} />
          <Text style={footer}>
            If you didn't request this link, you can safely ignore this email.
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

export default MagicLinkEmail
