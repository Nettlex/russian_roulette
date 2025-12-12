# Base Mini App Quickstart

This is a **Mini App** template built using [OnchainKit](https://onchainkit.xyz) and the [Farcaster SDK](https://docs.farcaster.xyz/). It is designed to help you build and deploy a Mini App that can be published to the [Base App](https://www.base.dev) and Farcaster.

> [!IMPORTANT]
> This is a workshop template. Please follow the instructions below to configure and deploy your app.

## Prerequisites

Before getting started, make sure you have:

*   A [Farcaster](https://farcaster.xyz/) account (for testing)
*   A [Vercel](https://vercel.com/) account for hosting
*   A [Coinbase Developer Platform](https://portal.cdp.coinbase.com/) Client API Key
*   Basic knowledge of [Base Build](https://www.base.dev) platform

## Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/Trio-Blockchain-Labs/mini-app-quickstart-template.git
cd mini-app-quickstart-template
npm install
```

### 2. Configure Environment

Create a `.env.local` file:

```bash
NEXT_PUBLIC_PROJECT_NAME="Base Mini App"
NEXT_PUBLIC_ONCHAINKIT_API_KEY=<YOUR-CDP-API-KEY>
NEXT_PUBLIC_URL=http://localhost:3000
```

### 3. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your app.

## Customization

### Minikit Configuration

The `minikit.config.ts` file configures your app's manifest.

1.  Open `minikit.config.ts`.
2.  Update `name`, `subtitle`, and `description` to match your app idea.
3.  **Note:** Skip the `accountAssociation` for now; we will add this after deployment.

## Deployment

### 1. Deploy to Vercel

```bash
vercel --prod
```

### 2. Update Production Env

In your Vercel project settings, add:

*   `NEXT_PUBLIC_PROJECT_NAME`
*   `NEXT_PUBLIC_ONCHAINKIT_API_KEY`
*   `NEXT_PUBLIC_URL` (Your Vercel deployment URL)

## Base Build & Publishing

To publish your app to the Base App ecosystem:

1.  Go to [Base Build](https://www.base.dev).
2.  Create a new project.
3.  Follow the instructions to link your Vercel deployment.
4.  Use the **Account Association** tools on Base Build to sign your manifest.
5.  Update `minikit.config.ts` with the signature and redeploy.

For detailed docs, visit [docs.base.org](https://docs.base.org/docs/mini-apps/quickstart/create-new-miniapp/).

---

## Disclaimer

This project is a **demo application** for educational purposes only.
