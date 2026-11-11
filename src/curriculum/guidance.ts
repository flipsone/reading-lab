import type { Phase, ErrorCategory } from "../domain/models";

export const prompts: Record<Phase, { title: string; subtitle: string }> = {
  sound: {
    title: "What sound does this letter make?",
    subtitle: "Look at the letter. Say its sound.",
  },
  oral: {
    title: "Listen. Put the sounds together.",
    subtitle: "Your grown-up will say the sounds. What word do you hear?",
  },
  demo: {
    title: "Small sounds. One whole word.",
    subtitle: "Watch your grown-up. Then blend together.",
  },
  guided: {
    title: "Let’s blend together.",
    subtitle: "Touch each letter. Connect the sounds. Say the word.",
  },
  independent: {
    title: "Your turn to read.",
    subtitle: "Start on the left. Say the sounds, then the word.",
  },
  segment: {
    title: "One word. Listen for each sound.",
    subtitle: "Repeat your grown-up’s word. Say each sound and add a counter.",
  },
  encoding: {
    title: "Hear it. Build it. Read it.",
    subtitle:
      "Repeat the word. Say each sound, choose its letter, then read your word.",
  },
  sentence: {
    title: "Words make a sentence.",
    subtitle:
      "Read from left to right. Then read it again so it sounds like talking.",
  },
  meaning: {
    title: "What does the sentence tell us?",
    subtitle:
      "Look back at the sentence. Listen to your grown-up’s question and tell or show your answer.",
  },
};

export const corrections: Record<ErrorCategory, string> = {
  unknown_sound:
    "Model the missing letter sound. Invite Reader to say it with you, then try the word again.",
  incorrect_sound:
    "Point to the letter and model its sound clearly. Say the sound together before blending.",
  blending:
    "Keep the continuous sounds flowing into the vowel. Sweep left to right, say the whole word, and invite a retry.",
  omitted:
    "Point to each letter from left to right. Include every sound, then connect them and retry.",
  added:
    "Point to each letter and say only its sound. Avoid adding uh. Blend again with just these sounds.",
  guessed:
    "Return to the first letter. Model every sound from left to right and blend the whole word together.",
  other:
    "Model the sounds slowly, connect them, and say the whole word. Invite a comfortable retry.",
  segmentation:
    "Say the whole word, then model its separate sounds with one counter per sound. Say the word together and invite another try.",
  letter_choice:
    "Say the word and separate its sounds. Match each sound to its letter from left to right, then read the word back together.",
  meaning:
    "Return to the sentence and talk about who it names and what happened. Model an answer, then invite Reader to tell or show the meaning.",
};
