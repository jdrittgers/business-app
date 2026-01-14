import helmet from 'helmet';

/**
 * Security headers middleware using Helmet
 *
 * This configures various HTTP headers to improve security:
 * - Content Security Policy (CSP)
 * - HTTP Strict Transport Security (HSTS)
 * - X-Frame-Options
 * - X-Content-Type-Options
 * - Referrer Policy
 */
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for dynamic styling
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts
      imgSrc: ["'self'", 'data:', 'https:'], // Allow images from self, data URIs, and HTTPS
      connectSrc: [
        "'self'",
        'https://api.stripe.com', // Stripe API
        'wss:', // WebSocket connections
        'ws:' // WebSocket connections (development)
      ],
      frameSrc: [
        "'self'",
        'https://js.stripe.com', // Stripe Elements
        'https://hooks.stripe.com' // Stripe webhooks testing
      ],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      workerSrc: ["'self'", 'blob:']
      // upgradeInsecureRequests handled separately in production
    }
  },

  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },

  // X-Frame-Options: Prevent clickjacking
  frameguard: {
    action: 'deny'
  },

  // X-Content-Type-Options: Prevent MIME sniffing
  noSniff: true,

  // X-XSS-Protection (legacy browsers)
  xssFilter: true,

  // Referrer Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },

  // Don't advertise that we're using Express
  hidePoweredBy: true
});

/**
 * Additional security middleware for specific routes
 */
export const strictSecurity = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"]
    }
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true
});
