/**
 * SEO Meta Tags Manager
 * Sets per-route title, description, canonical, og:url and JSON-LD.
 */

import { getCanonicalOrigin } from './canonicalOrigin';

interface MetaTagConfig {
  title: string;
  description: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
}

function currentUrl(): string {
  if (typeof window === 'undefined') return getCanonicalOrigin();
  return `${getCanonicalOrigin()}${window.location.pathname}`;
}

export function setMetaTags(config: MetaTagConfig) {
  const url = config.canonicalUrl || currentUrl();

  // Title
  document.title = config.title;
  updateMeta('og:title', config.ogTitle || config.title);
  updateMeta('twitter:title', config.ogTitle || config.title);

  // Description
  updateMeta('description', config.description);
  updateMeta('og:description', config.ogDescription || config.description);
  updateMeta('twitter:description', config.ogDescription || config.description);

  if (config.keywords) {
    updateMeta('keywords', config.keywords);
  }

  if (config.ogImage) {
    updateMeta('og:image', config.ogImage);
    updateMeta('twitter:image', config.ogImage);
  }

  // Self-referencing og:url + canonical
  updateMeta('og:url', url);
  setCanonical(url);
}

function setCanonical(url: string) {
  let canonicalLink = document.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.rel = 'canonical';
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.href = url;
}

function updateMeta(name: string, content: string) {
  let element = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
  if (!element) {
    element = document.querySelector(`meta[property="${name}"]`) as HTMLMetaElement;
  }
  if (!element) {
    element = document.createElement('meta');
    if (name.startsWith('og:') || name.startsWith('twitter:')) {
      element.setAttribute(name.includes('og:') ? 'property' : 'name', name);
    } else {
      element.setAttribute('name', name);
    }
    document.head.appendChild(element);
  }
  element.content = content;
}

/**
 * Inject (or replace) a JSON-LD block, keyed by id so routes can swap theirs.
 */
export function setJsonLd(id: string, data: Record<string, unknown> | null) {
  const existing = document.getElementById(id);
  if (existing) existing.remove();
  if (!data) return;
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = id;
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

export const SEO_CONFIG = {
  home: {
    title: 'Your Signal Feed | RA Circle',
    description:
      'Live trading signals from the SEBI-registered advisors you subscribe to, with entry, target and stop loss on every call.',
    keywords:
      'trading signals, SEBI verified advisor, stock advisory, F&O trading, intraday signals, swing trading, SEBI registered analyst',
  },
  landing: {
    title: 'RA Circle | SEBI-Verified Trading Advisors in India',
    description:
      'Subscribe to SEBI-registered research analysts with tamper-proof, timestamped track records. See full win/loss history before you pay. Cancel anytime.',
    keywords:
      'SEBI registered advisor, trading signals India, verified stock advisor, F&O signals, intraday trading, research analyst INH, RA Circle',
  },
  featuredAdvisors: {
    title: 'Featured SEBI-Registered Advisors | RA Circle',
    description:
      'Hand-picked SEBI-registered research analysts on RA Circle, with verified INH numbers, subscriber counts and published win rates.',
    keywords:
      'featured SEBI advisors, top research analysts India, verified trading advisors, INH registered analyst',
  },
  listedAdvisors: {
    title: 'All Listed SEBI Advisors | RA Circle',
    description:
      'Browse every SEBI-registered advisor listed on RA Circle. Compare INH registration, strategy, accuracy and subscriber numbers side by side.',
    keywords:
      'listed SEBI advisors, SEBI registered analyst list, compare trading advisors India',
  },
  discover: {
    title: 'Browse SEBI Verified Trading Advisors | RA Circle',
    description:
      'Browse SEBI-verified advisors with transparent track records. Filter by strategy (Intraday, Swing, F&O) and accuracy.',
    keywords:
      'SEBI verified trading advisors, best intraday signals, swing trading advisors, F&O trading signals, stock market advisory',
  },
  explore: {
    title: 'Free Trading Insights from SEBI Advisors | RA Circle',
    description:
      'Discover free analysis and public posts from SEBI verified trading advisors. Follow advisors to get free insights in your feed.',
    keywords:
      'free trading insights, SEBI advisor posts, free stock analysis, trading advisor insights, free trading signals',
  },
  about: {
    title: 'About RA Circle — How We Verify Trading Advisors',
    description:
      'Learn how RA Circle verifies SEBI registered advisors. Our verification process ensures regulatory compliance and transparency.',
    keywords:
      'SEBI verified advisors, trading advisor verification, how to find verified stock advisor, SEBI registered analyst',
  },
  subscriptions: {
    title: 'My Subscriptions — Manage Your Advisor Plans',
    description:
      'Manage your active trading advisor subscriptions. Cancel anytime with no penalties. Real-time signal delivery to Telegram.',
    keywords:
      'subscription trading signals, cancel anytime advisory, premium trading signals, advisor subscription plans',
  },
  contact: {
    title: 'Contact RA Circle — Get Help & Support',
    description:
      'Have questions? Contact RA Circle support team. We\'re here to help with SEBI compliance and trading advisory queries.',
    keywords: 'contact support, trading advisor support, SEBI compliance help, trading signals support',
  },
  disclaimer: {
    title: 'Disclaimer — RA Circle Trading Advisory Platform',
    description:
      'Legal disclaimer for RA Circle. All trading involves risk. Past performance does not guarantee future results.',
    keywords: 'trading disclaimer, investment disclaimer, risk disclosure, trading risks',
  },
  privacy: {
    title: 'Privacy Policy — RA Circle',
    description:
      'RA Circle privacy policy. We respect your data and comply with Indian privacy regulations.',
    keywords: 'privacy policy, data protection, user data security',
  },
  terms: {
    title: 'Terms of Service — RA Circle',
    description:
      'Terms and conditions for using RA Circle trading advisory platform.',
    keywords: 'terms of service, user agreement, trading platform terms',
  },
};
