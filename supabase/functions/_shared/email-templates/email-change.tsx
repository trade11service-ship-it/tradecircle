/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import {
  main, container, header, brandText, brandAccent, body, h1, text, link,
  button, divider, footer, footerBar,
} from './_shared-styles.ts'

interface EmailChangeEmailProps {
  siteName: string
  siteUrl?: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteUrl, oldEmail, newEmail, confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email change for RA Circle</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brandText}>RA <span style={brandAccent}>Circle</span></Text>
        </Section>
        <Section style={body}>
          <Heading style={h1}>Confirm your email change</Heading>
          <Text style={text}>
            You requested to change the email on your RA Circle account from{' '}
            <Link href={`mailto:${oldEmail}`} style={link}>{oldEmail}</Link> to{' '}
            <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>.
          </Text>
          <Button style={button} href={confirmationUrl}>Confirm Email Change</Button>
          <Text style={{ ...text, fontSize: '13px', marginTop: '24px' }}>
            Or paste this link in your browser:<br />
            <Link href={confirmationUrl} style={link}>{confirmationUrl}</Link>
          </Text>
          <div style={divider} />
          <Text style={footer}>
            If you didn't request this change, please secure your account immediately by resetting your password.
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

export default EmailChangeEmail
