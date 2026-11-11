# Reading Team

A browser-local reading practice app with five short missions and an optional touchscreen space game.

Live app: https://flipsone.github.io/reading-lab/

## Use

An adult models sounds and blending while the learner controls navigation, help, and breaks. Completing a mission offers Space Rescue Blaster: drag and hold to fly and fire, then match a spoken word while all action pauses. Optional observations and game progress stay in the current browser; there are no accounts, analytics, microphones, or remote learner databases.

Local English speech synthesis is optional. When unavailable, an adult supplies the spoken word. Parent mode provides exports, observations, game voice previews, and extra rounds.

## Development

Use Node.js 22.12 or newer.

```sh
npm ci
npm run dev
npm test
npm run test:e2e
npm run build
```

## Deployment

Source is on `main`. GitHub Pages publishes the root of `gh-pages`, containing compiled files and `.nojekyll`.

```sh
npm ci
npm run build:pages
```

Publish the contents of `dist-pages/` to `gh-pages`. Changes on `main` alone do not redeploy. The Pages asset base is `/reading-lab/`.

This public source uses generic learner wording and contains no private learning notes or learner records. Browser-local progress belongs to each device and origin; records from localhost do not transfer automatically to this address.

Original supplemental activities, not a complete reading curriculum or a validated assessment. Code and original content: MIT license.
