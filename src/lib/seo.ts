/**
 * SEO Meta Tags Manager
 * Helps set dynamic meta tags for different pages
 */

interface MetaTagConfig {
  title: string;
  description: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
}

export function setMetaTags(config: MetaTagConfig) {
  // Set title
  document.title = config.title;
  updateMeta('og:title', config.ogTitle || config.title);
  updateMeta('twitter:title', config.ogTitle || config.title);

  // Set description
  updateMeta('description', config.description);
  updateMeta('og:description', config.ogDescription || config.description);
  updateMeta('twitter:description', config.ogDescription || config.description);

  // Set keywords
  if (config.keywords) {
    updateMeta('keywords', config.keywords);
  }

  // Set og:image
  if (config.ogImage) {
    updateMeta('og:image', config.ogImage);
    updateMeta('twitter:image', config.ogImage);
  }

  // Set canonical URL
  if (config.canonicalUrl) {
    let canonicalLink = document.querySelector("link[rel='canonical']") as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = config.canonicalUrl;
  }
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

export const SEO_CONFIG = {
  home: {
    title: 'Home - TradeCircle | Find SEBI Verified Trading Advisors',
    description:
      'Get live trading signals from SEBI verified advisors. Track records transparent. Cancel anytime. No lock-in.',
    keywords:
      'trading signals, SEBI verified advisor, stock advisory, F&O trading, intraday signals, swing trading',
  },
  landing: {
    title: 'TradeCircle - India\'s Most Trusted Trading Advisory Platform',
    description:
      'Discover 500+ SEBI verified trading advisors with public track records. Subscribe to premium signals delivered to Telegram.',
    keywords:
      'SEBI registered advisor, trading signals India, verified stock advisor, F&O signals, intraday trading signals',
  },
  discover: {
    title: 'Browse SEBI Verified Trading Advisors | TradeCircle',
    description:
      'Browse 500+ SEBI verified advisors with public track records. Filter by strategy (Intraday, Swing, F&O) and accuracy.',
    keywords:
      'SEBI verified trading advisors, best intraday signals, swing trading advisors, F&O trading signals, stock market advisory',
  },
  explore: {
    title: 'Free Trading Insights from SEBI Verified Advisors | TradeCircle',
    description:
      'Discover free analysis and public posts from SEBI verified trading advisors. Follow advisors to get free insights in your feed.',
    keywords:
      'free trading insights, SEBI advisor posts, free stock analysis, trading advisor insights, free trading signals',
  },
  about: {
    title: 'About TradeCircle - How We Verify Trading Advisors',
    description:
      'Learn how TradeCircle verifies SEBI registered advisors. Our 5-step verification process ensures regulatory compliance and transparency.',
    keywords:
      'SEBI verified advisors, trading advisor verification, how to find verified stock advisor, SEBI registered analyst',
  },
  subscriptions: {
    title: 'My Subscriptions - Manage Your Trading Advisor Plans',
    description:
      'Manage your active trading advisor subscriptions. Cancel anytime with no penalties. Real-time signal delivery to Telegram.',
    keywords:
      'subscription trading signals, cancel anytime advisory, premium trading signals, advisor subscription plans',
  },
  contact: {
    title: 'Contact TradeCircle - Get Help & Support',
    description:
      'Have questions? Contact TradeCircle support team. We\'re here to help with SEBI compliance and trading advisory queries.',
    keywords: 'contact support, trading advisor support, SEBI compliance help, trading signals support',
  },
  disclaimer: {
    title: 'Disclaimer - TradeCircle Trading Advisory Platform',
    description:
      'Legal disclaimer for TradeCircle. All trading involves risk. Past performance does not guarantee future results.',
    keywords: 'trading disclaimer, investment disclaimer, risk disclosure, trading risks',
  },
  privacy: {
    title: 'Privacy Policy - TradeCircle',
    description:
      'TradeCircle privacy policy. We respect your data and comply with Indian privacy regulations.',
    keywords: 'privacy policy, data protection, user data security',
  },
  terms: {
    title: 'Terms of Service - TradeCircle',
    description:
      'Terms and conditions for using TradeCircle trading advisory platform.',
    keywords: 'terms of service, user agreement, trading platform terms',
  },
};
