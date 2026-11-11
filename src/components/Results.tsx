import type { Session } from "../domain/models";
import { errorLabels, meaningModeLabels } from "../domain/models";
import { summarize, phaseNames } from "../domain/summary";
export default function Results({ session }: { session: Session }) {
  const summary = summarize(session);
  return (
    <section className="results" aria-label="Parent results">
      <div className="eyebrow">PARENT OBSERVATIONS</div>
      <h2>A little practice. Useful discoveries.</h2>
      <p>
        {new Date(session.startedAt).toLocaleDateString()} · Lesson{" "}
        {session.lesson.version} ·{" "}
        {session.status === "completed" ? "Completed" : "Partial session"}
        {session.rehearsal ? " · Rehearsal" : ""}
      </p>
      {session.rehearsal && (
        <p className="notice">
          This is a repeated activity session. Successful responses are counted
          as practice with support, not a fresh baseline. Earlier activities
          were carried over as context and excluded from these counts; see the
          original session for their baseline results.
        </p>
      )}
      <div className="result-highlights">
        <div>
          <span>Sounds recognized independently</span>
          <strong>
            {summary.sound.independentTargets.join(" · ") ||
              "None recorded yet"}
          </strong>
        </div>
        <div>
          <span>Words decoded independently</span>
          <strong>
            {summary.decoding.independentTargets.join(" · ") ||
              "None recorded yet"}
          </strong>
        </div>
      </div>
      <p>
        <strong>Words or sentences with support or later modeling:</strong>{" "}
        {summary.helpTargets.join(", ") || "None recorded"}. Later modeling does
        not change a recorded first response.
      </p>
      <div className="table-scroll">
        <table>
          <caption>First responses by activity</caption>
          <thead>
            <tr>
              <th>Activity</th>
              <th>Independent</th>
              <th>With help</th>
              <th>Incorrect</th>
              <th>Skipped</th>
            </tr>
          </thead>
          <tbody>
            {summary.stats.map((row) => (
              <tr key={row.key}>
                <th scope="row">{row.label}</th>
                <td>
                  {row.independent}/{row.observed}
                  {row.accuracy !== null && (
                    <small>{Math.round(row.accuracy * 100)}% of observed</small>
                  )}
                </td>
                <td>
                  {row.assisted}/{row.observed}
                  {row.assistedAccuracy !== null && (
                    <small>
                      {Math.round(row.assistedAccuracy * 100)}% of observed
                    </small>
                  )}
                </td>
                <td>{row.incorrect}</td>
                <td>{row.skipped}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="fine-print">
        Fractions exclude skipped responses. Guided responses are practice, not
        independent assessment. Repeated items and corrections are never counted
        as independent decoding.
      </p>
      {session.lesson.exercises.some((e) => e.phase === "meaning") && (
        <p className="fine-print">
          Meaning rows describe how your child accessed the sentence.
          “Independent” means he answered the question without answer cues in
          that context. Adult read-aloud results describe listening
          comprehension. Sentence accuracy is recorded separately; no
          reading-speed score is calculated.
        </p>
      )}
      <h3>What to practice next</h3>
      <ul className="recommendations">
        {summary.recommendations.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <h3>Observed patterns</h3>
      <p>
        {summary.errors.length
          ? summary.errors.map((e) => `${e.label}: ${e.count}`).join(" · ")
          : "No error categories recorded."}
      </p>
      <p>
        <strong>Activities completed:</strong>{" "}
        {summary.completed.map((p) => phaseNames[p]).join(", ") || "None yet"}.
      </p>
      <p>
        {summary.retryCount} corrective{" "}
        {summary.retryCount === 1 ? "retry" : "retries"} recorded separately.
      </p>
      <details>
        <summary>View individual observations</summary>
        <div className="attempt-list">
          {session.attempts
            .filter((a) => !a.carriedForward)
            .map((a) => (
              <div key={a.id}>
                <strong>{a.target}</strong>
                <span>
                  {phaseNames[a.phase]} ·{" "}
                  {a.purpose === "first"
                    ? "First response"
                    : "Corrective retry"}{" "}
                  · {a.result}
                  {a.error ? ` · ${errorLabels[a.error]}` : ""}
                  <small>
                    {a.assistance.length} assistance events at response time ·{" "}
                    {new Date(a.timestamp).toLocaleTimeString()}
                  </small>
                  {a.wordWork && (
                    <small>
                      Board at response: {a.wordWork.counters} counters
                      {a.phase === "encoding"
                        ? ` · Letters: ${a.wordWork.letters || "none selected"}`
                        : ""}
                      . Parent score includes the spoken response.
                    </small>
                  )}
                  {a.meaningMode && (
                    <small>{meaningModeLabels[a.meaningMode]}</small>
                  )}
                </span>
              </div>
            ))}
        </div>
      </details>
      <p className="notice">
        These are parent-observed, formative results. One short session cannot
        establish mastery or diagnose a reading difficulty. Review observations
        across days before choosing the next lesson.
      </p>
    </section>
  );
}
