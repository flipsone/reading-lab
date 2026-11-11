import {
  lessonSchema,
  type Exercise,
  type Lesson,
  type Progress,
} from "../domain/models";
import { lessonOne } from "./index";

const missions = [
  {
    title: "Meet the wrestling team",
    theme: "wrestling",
    words: ["am", "an"],
    build: "am",
    sentence: "Sam sat.",
    introduction:
      "Welcome to wrestling camp, Reader! Pick a teammate. Today we will help our team get ready, one little sound at a time.",
  },
  {
    title: "Get the wrestling mat ready",
    theme: "wrestling",
    words: ["am", "mat"],
    build: "mat",
    sentence: "Sam sat.",
    introduction:
      "Our team is getting the wrestling space ready. You lead the way! We can watch, practice together, and ask for help.",
  },
  {
    title: "Help the toy soldier team",
    theme: "team",
    words: ["an", "man"],
    build: "man",
    sentence: "Nan sat.",
    introduction:
      "The toy soldier team needs a helpful teammate. That is you! Let's bring our sounds together and help everyone get ready.",
  },
  {
    title: "Cheer at soccer practice",
    theme: "soccer",
    words: ["am", "fan"],
    build: "fan",
    sentence: "Sam sat.",
    introduction:
      "Our wrestling team is visiting soccer practice. Let's cheer for our teammates and practice some familiar words together.",
  },
  {
    title: "Celebrate with the team",
    theme: "football",
    words: ["am", "an"],
    build: "am",
    sentence: "Sam sat.",
    introduction:
      "It is team celebration day! Pick words you have practiced. Our wrestling and football teammates are here to join you.",
  },
] as const;

export function makeMission(
  number: number,
  choices?: { words: [string, string]; build: string; sentence: string },
): Lesson {
  const data = missions[number - 1];
  if (!data) throw new Error("Unknown mission");
  const words = choices?.words ?? [...data.words];
  const build = choices?.build ?? data.build;
  const sentence = choices?.sentence ?? data.sentence;
  if (
    choices &&
    (number !== 5 ||
      new Set(words).size !== 2 ||
      !words.includes(build) ||
      !["Sam sat.", "Nan sat."].includes(sentence))
  )
    throw new Error(
      "Choose two different familiar words and build one of them.",
    );
  const sounds = [
    ...new Set(["a", ...words.join("").replaceAll("a", "")]),
  ].slice(0, 2);
  const exercises: Exercise[] = [];
  const add = (
    id: string,
    phase: Exercise["phase"],
    target: string,
    station: Exercise["station"],
    direction: string,
    extra: Partial<Exercise> = {},
  ) => exercises.push({ id, phase, target, station, direction, ...extra });
  sounds.forEach((sound, i) =>
    add(
      `warm-${i}`,
      "sound",
      sound,
      "warmup",
      "Listen to your grown-up say this sound. Say it together. There is no hurry.",
    ),
  );
  add(
    "model",
    "demo",
    words[0],
    "blend",
    "Watch your grown-up connect the sounds. Then join in. Look, say the sounds, blend.",
  );
  words.forEach((word, i) =>
    add(
      `together-${i}`,
      "guided",
      word,
      "blend",
      "Look at each letter. Say the sounds with your grown-up, then blend them together.",
    ),
  );
  words.forEach((word, i) =>
    add(
      `revisit-${i}`,
      "independent",
      word,
      "blend",
      "Here is a word you practiced. Give it a try, or ask for help. You choose when to move on.",
      { checkpoint: true },
    ),
  );
  add(
    "counters",
    "segment",
    build,
    "build",
    "Your grown-up will say a word. Repeat it. Say each sound and add a counter. You can do it together.",
  );
  add(
    "letters",
    "encoding",
    build,
    "build",
    "Hear the word again. Say its sounds and choose letters. Read your word together. Your grown-up can show you.",
  );
  add(
    "sentence",
    "sentence",
    sentence,
    "read",
    "Meet the sentence words with your grown-up first. Then read together, or listen. Both are ways to practice.",
  );
  add(
    "meaning",
    "meaning",
    sentence,
    "read",
    "Look back at the sentence. Your grown-up will ask a question. You can tell or show your answer.",
    {
      question: {
        readingId: "sentence",
        prompt: sentence.startsWith("Sam") ? "Who sat?" : "What did Nan do?",
        acceptable: sentence.startsWith("Sam")
          ? "Sam. A short answer is enough."
          : "Sat, sat down, or a sitting action.",
      },
    },
  );
  add(
    "comfortable",
    "guided",
    words[0],
    "finish",
    "Let's finish with a familiar word. Say it together if you like. You made time to practice today!",
  );
  add(
    "extra",
    "guided",
    words[1],
    "finish",
    "Would you like one more familiar word? Try it together, or choose Finish. It is up to you.",
    { optional: true },
  );
  return lessonSchema.parse({
    id: `week-one-${number}`,
    version: "1.0.0",
    mode: "practice",
    title: data.title,
    mission: {
      number,
      introduction: data.introduction,
      theme: data.theme,
      focusWords: words,
    },
    skills: lessonOne.skills,
    sounds: lessonOne.sounds,
    sentenceWords: ["Sam", "Nan", "sat"],
    exercises,
    completion: { requireAllFirstAttempts: false, requireExplicitModel: false },
  });
}

export const weekOne = missions.map((_, i) => makeMission(i + 1));
export const curriculumRegistry = [lessonOne, ...weekOne];

export function familiarWords(progress: Progress): string[] {
  const words = progress.sessions.flatMap((session) =>
    session.lesson.exercises
      .filter(
        (e) =>
          /^[a-z]{2,3}$/.test(e.target) &&
          (session.practiceSteps.some(
            (step) => step.exerciseId === e.id && step.action === "practiced",
          ) ||
            session.attempts.some(
              (a) => a.exerciseId === e.id && a.result !== "skipped",
            )),
      )
      .map((e) => e.target),
  );
  // A child may open mission five first. These two words are explicitly modeled there.
  const unique = [...new Set(words)];
  return unique.length >= 2 ? unique : [...new Set(["am", "an", ...unique])];
}
