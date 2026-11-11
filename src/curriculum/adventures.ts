import { lessonSchema, type Lesson } from "../domain/models";
import { weekOne } from "./week-one";

export const packs = [
  {
    id: 1,
    title: "Reading Team Camp",
    theme: "wrestling",
    icon: "⭐",
    patch: "Camp captain",
  },
  {
    id: 2,
    title: "Building Crew",
    theme: "building",
    icon: "🛠️",
    patch: "Builder pilot",
  },
  {
    id: 3,
    title: "Dinosaur Discovery",
    theme: "dinosaur",
    icon: "🦖",
    patch: "Dino explorer",
  },
  {
    id: 4,
    title: "Ocean Rescue",
    theme: "ocean",
    icon: "🐙",
    patch: "Ocean rescuer",
  },
  {
    id: 5,
    title: "Sports Adventure",
    theme: "soccer",
    icon: "⚽",
    patch: "Sports captain",
  },
  {
    id: 6,
    title: "Space Expedition",
    theme: "space",
    icon: "🚀",
    patch: "Galaxy guide",
  },
] as const;
// Original authored text. Each row introduces no more than one correspondence.
const rows = [
  [
    "Find the crew's map",
    "p",
    "map pat",
    "Pat sat.",
    "Pat sat. Sam sat.",
    "Who sat?",
    "Pat; pointing to the name is welcome.",
    "Our toy crew has a building map. Help the teammates find a comfortable spot to plan!",
  ],
  [
    "Build a cat shelter",
    "c",
    "cap cat",
    "A cat can nap.",
    "A cat can nap. Sam can pat a cat.",
    "What can the cat do?",
    "Nap, sleep, or a sleeping action.",
    "The crew is making a cozy shelter for a toy cat. You are our builder today!",
  ],
  [
    "Tap the team signal",
    "",
    "can tap",
    "Sam can tap.",
    "Sam can tap. Nan can tap.",
    "What can Sam do?",
    "Tap, or a tapping action.",
    "Give the building crew a friendly signal. Everyone has a job, and yours is to lead the way.",
  ],
  [
    "Make a resting spot",
    "",
    "pan nap",
    "A cat can nap.",
    "A cat can nap. Nan can pat a cat.",
    "Who can nap?",
    "The cat.",
    "Even busy builders need a rest. Let's get a quiet spot ready for our toy animal.",
  ],
  [
    "Building crew celebration",
    "",
    "map cap",
    "Sam can pat a cat.",
    "Sam can pat a cat. A cat can nap.",
    "What can Sam pat?",
    "A cat.",
    "The shelter is ready! Visit your favorite building tools and celebrate helping your team.",
  ],
  [
    "Meet the dinosaur scout",
    "i",
    "in sit",
    "Sam can sit.",
    "Sam can sit. A cat can sit.",
    "What can Sam do?",
    "Sit, or a sitting action.",
    "Our toy dinosaur scouts are watching for footprints. Choose a teammate and a comfortable lookout spot.",
  ],
  [
    "Explore the muddy pond",
    "d",
    "dip did",
    "Sam can dip a cap.",
    "Sam can dip a cap. Nan can dip a cap.",
    "What can Sam dip?",
    "A cap.",
    "The explorers found a muddy pond. We can investigate carefully and help our teammates.",
  ],
  [
    "Dig for a discovery",
    "g",
    "pig dig",
    "A pig can dig.",
    "A pig can dig. Sam can dig.",
    "What can the pig do?",
    "Dig, or a digging action.",
    "A toy animal is helping our dinosaur team search the sand. What will the team discover?",
  ],
  [
    "Greet the explorers",
    "",
    "pin tip",
    "Sam can tip a cap.",
    "Sam can tip a cap. Nan can tip a cap.",
    "What can Sam tip?",
    "A cap, or a hat-tipping action.",
    "Welcome the returning explorers with a friendly greeting. There is room for everyone on our team.",
  ],
  [
    "Dinosaur picnic",
    "",
    "sit pig",
    "A pig can sit.",
    "A pig can sit. Sam can sit.",
    "Who can sit?",
    "A pig; Sam also sits in the story.",
    "The discovery team is ready for a picnic. Help the toy animals find their places.",
  ],
  [
    "Pack the ocean boat",
    "o",
    "on pot",
    "A pot can tip.",
    "A pot can tip. Sam can tap a pot.",
    "What can tip?",
    "A pot.",
    "Our rescue boat needs supplies. Help the crew pack carefully for an ocean adventure.",
  ],
  [
    "Meet captain Bob",
    "b",
    "bob cob",
    "Bob can pat a pig.",
    "Bob can pat a pig. A pig can dig.",
    "Who can pat a pig?",
    "Bob.",
    "Captain Bob welcomes every toy teammate aboard. Let's help him greet the animal crew.",
  ],
  [
    "Hop to the harbor",
    "h",
    "hop hat",
    "Bob can hop.",
    "Bob can hop. Sam can hop.",
    "What can Bob do?",
    "Hop, or a hopping action.",
    "The boat is at the harbor. Our toy crew is practicing a cheerful hopping warm-up.",
  ],
  [
    "Help the harbor dog",
    "",
    "dog hog",
    "A dog can hop.",
    "A dog can hop. A hog can sit.",
    "What can the dog do?",
    "Hop.",
    "An animal teammate needs help reaching the boat. Work together and make space for a friend.",
  ],
  [
    "Ocean team parade",
    "",
    "top hop",
    "A hog can hop.",
    "A hog can hop. Bob can hop.",
    "Who can hop?",
    "A hog; Bob also hops in the story.",
    "Our rescue crew is back at the harbor. Celebrate with a friendly toy-animal parade.",
  ],
  [
    "Warm up with the pup",
    "u",
    "up sun",
    "A pup can sit.",
    "A pup can sit. A pup can hop.",
    "What can the pup do?",
    "Sit; hop is also in the story.",
    "A toy pup has joined sports camp. Help our newest teammate warm up before practice.",
  ],
  [
    "Run with the team",
    "r",
    "run rat",
    "A rat can run.",
    "A rat can run. A pup can run.",
    "What can the rat do?",
    "Run, or a running action.",
    "The toy animals are trying soccer warm-ups. Everyone gets to move at a comfortable pace.",
  ],
  [
    "Rest by the log",
    "l",
    "lip log",
    "A dog can sit on a log.",
    "A dog can sit on a log. A rat can run.",
    "Where can the dog sit?",
    "On a log.",
    "After wrestling practice, our teammates need a rest. Help them find a quiet spot.",
  ],
  [
    "Set up the practice net",
    "e",
    "net leg",
    "A hen can sit.",
    "A hen can sit. A dog can run.",
    "What can the hen do?",
    "Sit.",
    "Our soccer team is setting up equipment. The toy animals can watch while the crew gets ready.",
  ],
  [
    "Sports camp celebration",
    "",
    "red hen",
    "A red hen can run.",
    "A red hen can run. A pup can hop.",
    "Who can run?",
    "A red hen.",
    "Celebrate wrestling, soccer, and football practice. Every teammate has something to contribute.",
  ],
  [
    "Board the starship",
    "sh",
    "ship shop",
    "Sam can hop on a ship.",
    "Sam can hop on a ship. A fish can dip.",
    "What can Sam hop on?",
    "A ship.",
    "Our toy astronauts are boarding a starship. Help the crew prepare for a friendly space expedition.",
  ],
  [
    "Build the moon camp",
    "ch",
    "chip chop",
    "Sam can chop a log.",
    "Sam can chop a log. A chip can drop.",
    "What can Sam chop?",
    "A log.",
    "The astronauts are building a pretend moon camp with toy supplies. Help the construction crew.",
  ],
  [
    "Find a space for the cat",
    "th",
    "thin thud",
    "A thin cat can fit.",
    "A thin cat can fit. A cat can nap.",
    "What can the cat do?",
    "Fit; nap is also in the story.",
    "A toy cat needs a cozy space on the starship. Our rescue team can help it settle in.",
  ],
  [
    "Explore the rocky planet",
    "ck",
    "duck sock",
    "A duck can sit on a rock.",
    "A duck can sit on a rock. A duck can dip.",
    "Where can the duck sit?",
    "On a rock.",
    "A toy duck is exploring a rocky planet with our astronauts. Help it find a safe resting spot.",
  ],
  [
    "Welcome the rescue team home",
    "",
    "fish chin",
    "A fish can rush.",
    "A fish can rush. A duck can dip. Sam can sit on a ship.",
    "What can the fish do?",
    "Rush, or a quick swimming action.",
    "The space team is coming home! Revisit familiar sounds and celebrate all the adventures you have tried.",
  ],
] as const;
const cues: Record<string, [string, string, boolean]> = {
  p: ["/p/", "A short lip pop; avoid adding uh.", false],
  c: ["/k/", "Use the /k/ sound as in cat; avoid adding uh.", false],
  i: ["/ɪ/", "Short i as in sit.", true],
  d: ["/d/", "A short tongue tap as in dip; avoid uh.", false],
  g: ["/g/", "Hard g as in pig; avoid uh.", false],
  o: ["/ɑ/", "Short o as in pot, using your natural accent.", true],
  b: ["/b/", "A short lip pop as in bob; avoid uh.", false],
  h: ["/h/", "A soft breath as in hop.", true],
  u: ["/ʌ/", "Short u as in sun.", true],
  r: ["/r/", "The beginning sound in run; avoid uh.", true],
  l: ["/l/", "The beginning sound in lip; avoid uh.", true],
  e: ["/ɛ/", "Short e as in net.", true],
  sh: ["/ʃ/", "Two letters make one sound, as in ship.", true],
  ch: ["/tʃ/", "Two letters make one sound, as in chip.", false],
  th: [
    "/θ/",
    "Unvoiced th as in thin: a gentle breath with the tongue between the teeth.",
    true,
  ],
  ck: [
    "/k/",
    "Two letters make one /k/ sound after a short vowel, as in duck.",
    false,
  ],
};
const grouped: Record<string, string[]> = {
  ship: ["sh", "i", "p"],
  shop: ["sh", "o", "p"],
  fish: ["f", "i", "sh"],
  chip: ["ch", "i", "p"],
  chop: ["ch", "o", "p"],
  chin: ["ch", "i", "n"],
  thin: ["th", "i", "n"],
  thud: ["th", "u", "d"],
  duck: ["d", "u", "ck"],
  sock: ["s", "o", "ck"],
  rock: ["r", "o", "ck"],
  rush: ["r", "u", "sh"],
};
let sounds = [...weekOne[0].sounds];
export const newMissions: Lesson[] = rows.map((row, index) => {
  const [
    title,
    newSound,
    focus,
    sentence,
    storyText,
    question,
    answer,
    introduction,
  ] = row;
  const number = index + 6;
  const pack = packs[Math.floor((number - 1) / 5)];
  const prerequisiteSounds = sounds.map((s) => s.grapheme);
  if (newSound) {
    const [phoneme, cue, continuous] = cues[newSound];
    sounds = [...sounds, { grapheme: newSound, phoneme, cue, continuous }];
  }
  const words = focus.split(" ");
  const vocabulary = [
    ...new Set([
      ...words,
      ...(storyText + " " + sentence).toLowerCase().match(/[a-z]+/g)!,
    ]),
  ];
  // These are authored, reviewed vocabulary entries, never arbitrary school words.
  const wordUnits = Object.fromEntries(
    vocabulary.filter((w) => w !== "a").map((w) => [w, grouped[w] ?? [...w]]),
  );
  const template = structuredClone(weekOne[0]);
  const warmup = [newSound || sounds.at(-1)!.grapheme, "a"];
  const exercises = template.exercises.map((e) => {
    let target = e.target;
    if (e.phase === "sound") target = warmup[Number(e.id.at(-1))];
    else if (["sentence", "meaning"].includes(e.phase)) target = sentence;
    else if (["together-1", "revisit-1", "extra"].includes(e.id))
      target = words[1];
    else target = words[0];
    return {
      ...e,
      target,
      ...(e.phase === "segment"
        ? {
            direction:
              "Listen to your grown-up. Repeat the word. Move one counter for each sound. Help is welcome.",
          }
        : e.phase === "encoding"
          ? {
              direction:
                "Listen to your grown-up. Choose tiles for the sounds. Read your word together. Help is welcome.",
            }
          : {}),
      ...(e.question
        ? {
            question: {
              readingId: "sentence",
              prompt: question,
              acceptable: answer,
            },
          }
        : {}),
      ...(e.optional
        ? {
            direction:
              "Choose a little story or a school word, or finish proudly. You can read together.",
          }
        : {}),
    };
  });
  return lessonSchema.parse({
    ...template,
    id: `adventure-${number}`,
    version: "2.0.0",
    contentVersion: 2,
    title,
    mission: { number, theme: pack.theme, introduction, focusWords: words },
    sounds,
    prerequisiteSounds,
    ...(newSound ? { newSound } : {}),
    wordUnits,
    sentenceWords: [
      ...new Set((sentence + " " + storyText).match(/[A-Za-z]+/g)!),
    ],
    preparationNotes: [
      "a: In sentences this little word is often pronounced /uh/. Model it in the phrase before reading.",
      "Names: Match capitals to lowercase letters and read the names together. A period ends each sentence.",
    ],
    story: { text: storyText, question, answer },
    exercises,
  });
});
export const allMissions = [...weekOne, ...newMissions];
export function missingPrerequisites(
  lesson: Lesson,
  sessions: {
    lesson: Lesson;
    practiceSteps: { exerciseId: string; action: string }[];
  }[],
) {
  const visited = new Set(
    sessions.flatMap((s) =>
      s.lesson.exercises
        .filter(
          (e) =>
            e.phase === "sound" &&
            s.practiceSteps.some(
              (p) => p.exerciseId === e.id && p.action === "practiced",
            ),
        )
        .map((e) => e.target),
    ),
  );
  return (lesson.prerequisiteSounds ?? []).filter((g) => !visited.has(g));
}
