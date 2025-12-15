const ROOT_URL =
  process.env.NEXT_PUBLIC_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');

/**
 * MiniApp configuration object. Must follow the Farcaster MiniApp specification.
 *
 * @see {@link https://miniapps.farcaster.xyz/docs/guides/publishing}
 */
export const minikitConfig = {

  
 

  miniapp: {
    version: "1",
    name: "Russian Roulette",
    subtitle: "Test Your Luck",
    description: "A thrilling Russian Roulette game on Farcaster. Play for free or compete for prizes!",
    screenshotUrls: [],
    iconUrl: `${ROOT_URL}/icon.png`,
    splashImageUrl: `${ROOT_URL}/splash.png`,
    splashBackgroundColor: "#1a1a1a",
    homeUrl: ROOT_URL,
    webhookUrl: `${ROOT_URL}/api/webhook`,
    primaryCategory: "games",
    tags: ["games", "gambling", "competition"],
    heroImageUrl: `${ROOT_URL}/hero.png`,
    tagline: "Dare to pull the trigger?",
    ogTitle: "Russian Roulette - Farcaster Mini App",
    ogDescription: "A thrilling Russian Roulette game where you can play for free or compete for USDC prizes!",
    ogImageUrl: `${ROOT_URL}/hero.png`,
  },
} as const;

