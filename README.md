# Reading Adventures

**[Open the app](https://flipsone.github.io/reading-lab/)**

Thirty short reading missions across six adventure destinations, followed by Space Rescue Blaster. Includes cumulative blending, sentence reading, optional mini-stories, word building, and an adult nearby. The original five missions and observation lesson remain available.

## Players and school words

- Choose **Switch player → Parent mode: players** to create or rename players. Each has separate local progress, words, observations, and rewards.
- In a player's **Parent mode → Words from school**, paste comma- or newline-separated words and review the list. Mark words already familiar only when appropriate; this records a parent report, not an assessment.
- **Try of and boy** offers reviewed teaching cards. Other words use adult-guided whole-word practice without automatic sound analysis. New words enter game practice only after an adult confirms introduction.
- Games keep six encounters on the lesson's focus words and prefer eligible school words for the two review encounters. Reading remains untimed, with all arcade action paused.
- Optional stories or a school-word visit replace extra practice. Skipping an extra never withholds the game.

The map suggests a route but allows exploration. Later missions offer preparation for unfamiliar earlier sounds. Participation, adult observations, and game word matching remain separate; none automatically establishes mastery.

## Local data and compatibility

No accounts, analytics, microphones, or remote learner databases. Names, pasted words, and progress stay in the current browser and origin; there is no device synchronization. Use **Download current player** or **Download all players** for backups.

Storage uses a version 3 household envelope under the existing `reading-lab.progress.v1` key. Versions 1 and 2 migrate in memory, retaining lesson snapshots, observations, and game decks. Previously shared activity stays with the first player; the app cannot assign it retrospectively to individual children. New players start fresh. Unreadable source data remains protected until an explicit reset.

Optional narration uses available local English speech voices. Sounds, blending models, and dictation are adult-voiced. School words default to adult prompting; a parent can preview the local voice and change individual word settings. Missing or failed prompts require an adult script and Ready confirmation.

## Development and validation

Node.js 22.12 or newer:

```sh
npm ci
npm run dev
npm test
npm run test:e2e
npm run build
npm run format:check
```

The browser suite covers desktop and tablet layouts, profile isolation, legacy saves, school-word introduction, frozen game decks, support, touch and keyboard controls, and reduced motion. A device trial with each learner remains useful for comfort and timing.

## Deployment

`main` holds public source. GitHub Pages publishes the root of `gh-pages`, containing generated files and `.nojekyll`.

```sh
npm ci
npm run build:pages
```

Publish `dist-pages/` to `gh-pages`. Source commits alone do not redeploy. The asset base is `/reading-lab/`. The public source contains generic learner wording, original supplemental activities, and no private learning notes or learner records.

The instructional approach is informed by [IES foundational reading guidance](https://ies.ed.gov/ncee/wwc/PracticeGuide/21) and [UFLI guidance on high-frequency words](https://ufli.education.ufl.edu/resources/teaching-resources/instructional-activities/irregular-and-high-frequency-words/). These original activities are supplemental practice, not a complete curriculum or validated assessment.

Code and original content: MIT license.
