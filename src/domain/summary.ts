import {
  errorLabels,
  meaningModeLabels,
  type MeaningMode,
  type Phase,
  type Session,
} from "./models";
import { itemComplete } from "./engine";
export const phaseNames: Record<Phase, string> = {
  sound: "Sound check",
  oral: "Listen & blend",
  demo: "Watch & blend",
  guided: "Blend together",
  independent: "Your turn",
  segment: "Pull apart sounds",
  encoding: "Build a word",
  sentence: "Read sentences",
  meaning: "Talk about meaning",
};
export function summarize(s: Session) {
  const first = s.attempts.filter(
    (a) => a.purpose === "first" && !a.carriedForward,
  );
  const stats = (phase: Phase, mode?: MeaningMode | "unattempted") => {
    const rows = first.filter(
      (a) =>
        a.phase === phase &&
        (!mode ||
          (mode === "unattempted" ? !a.meaningMode : a.meaningMode === mode)),
    );
    const observed = rows.filter((a) => a.result !== "skipped");
    const independent = rows.filter((a) => a.result === "independent");
    const assisted = rows.filter((a) => a.result === "assisted");
    return {
      phase,
      key: mode ?? phase,
      label:
        mode === "unattempted"
          ? "Meaning not attempted"
          : mode
            ? meaningModeLabels[mode]
            : phaseNames[phase],
      total: rows.length,
      observed: observed.length,
      independent: independent.length,
      assisted: assisted.length,
      incorrect: rows.filter((a) => a.result === "incorrect").length,
      skipped: rows.length - observed.length,
      accuracy: observed.length ? independent.length / observed.length : null,
      assistedAccuracy: observed.length
        ? assisted.length / observed.length
        : null,
      independentTargets: independent.map((a) => a.target),
      assistedTargets: assisted.map((a) => a.target),
    };
  };
  const sound = stats("sound"),
    oral = stats("oral"),
    decoding = stats("independent");
  const needsSounds = first
    .filter((a) => a.phase === "sound" && a.result !== "independent")
    .map((a) => a.target);
  const recommendations: string[] = [];
  if (needsSounds.length)
    recommendations.push(
      `Revisit ${needsSounds.join(", ")} with clean sounds. If these felt difficult, spend the next practice on sound recognition before more written blending.`,
    );
  if (oral.total && oral.independent < oral.total)
    recommendations.push(
      "Practice blending two spoken sounds with no print. Model the whole word, then invite another try.",
    );
  if (decoding.total && decoding.independent < decoding.total)
    recommendations.push(
      `Model smooth left-to-right blending, starting with ${s.lesson.exercises
        .filter((e) => e.phase === "guided")
        .slice(0, 2)
        .map((e) => e.target)
        .join(" and ")}, before returning to longer words.`,
    );
  if (
    decoding.total &&
    decoding.independent === decoding.total &&
    !needsSounds.length
  )
    recommendations.push(
      "Repeat on another day. With a parent or specialist, consider new words using the same sound patterns to check generalization.",
    );
  if (!recommendations.length)
    recommendations.push(
      "Continue gathering observations. Let comfort with the sounds guide how much blending to try.",
    );
  for (const phase of ["segment", "encoding"] as const) {
    const row = stats(phase);
    if (row.total && row.independent < row.total)
      recommendations.push(
        phase === "segment"
          ? "Say a short word together, then model one counter for each sound. Listen to the sounds Reader says; a counter total alone does not show segmentation."
          : "Practice saying a word, separating its sounds, and choosing a letter for each sound. Read it back together, then try writing it on paper.",
      );
  }
  if (
    stats("sentence").total &&
    stats("sentence").independent < stats("sentence").total
  )
    recommendations.push(
      "Revisit the sentence words, then read a short sentence together. Reread for meaning and natural phrasing without a speed target.",
    );
  if (stats("meaning").total)
    recommendations.push(
      "Talk about who is in the sentence and what happened. Keep answers after an adult read-aloud separate from answers after Your own reading; accept a short spoken answer or an action that shows the meaning.",
    );
  const errors = Object.entries(errorLabels)
    .map(([key, label]) => ({
      label,
      count: first.filter((a) => a.error === key).length,
    }))
    .filter((e) => e.count);
  const completed = [...new Set(s.lesson.exercises.map((e) => e.phase))].filter(
    (p) =>
      s.lesson.exercises
        .filter((e) => e.phase === p)
        .every((e) => itemComplete(s, e)),
  );
  const helpTargets = [
    ...new Set(
      first
        .filter(
          (a) =>
            a.phase !== "sound" &&
            a.phase !== "meaning" &&
            (a.result === "assisted" || s.assistance[a.exerciseId]?.length),
        )
        .map((a) => a.target),
    ),
  ];
  return {
    stats: [
      sound,
      oral,
      stats("guided"),
      decoding,
      stats("segment"),
      stats("encoding"),
      stats("sentence"),
      ...(
        [
          "own_reading",
          "supported_reading",
          "listening",
          "unattempted",
        ] as const
      )
        .map((mode) => stats("meaning", mode))
        .filter((row) => row.total > 0),
    ].filter((row) => s.lesson.exercises.some((e) => e.phase === row.phase)),
    completed,
    errors,
    recommendations,
    sound,
    decoding,
    helpTargets,
    retryCount: s.attempts.filter(
      (a) => a.purpose === "retry" && !a.carriedForward,
    ).length,
  };
}
