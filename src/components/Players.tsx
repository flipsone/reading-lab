import { useRef, useState } from "react";
import App from "../App";
import { newProgress } from "../domain/engine";
import type { Progress } from "../domain/models";
import {
  freshHousehold,
  pausePlayer,
  readHousehold,
  writeHousehold,
  type Household,
} from "../services/household";
import { stopGamePrompt } from "../services/game-audio";
import "./adventures.css";
const avatars = ["🚀", "🦖", "⚽", "🐙", "🛠️", "⭐"] as const;
export default function Players() {
  const [initial] = useState(() => {
    try {
      return readHousehold(localStorage);
    } catch {
      return {
        household: freshHousehold(),
        error:
          "Browser storage is unavailable. Download all players before leaving.",
      };
    }
  });
  const [household, setHousehold] = useState(initial.household);
  const live = useRef(household);
  live.current = household;
  const [protectedData, setProtected] = useState(Boolean(initial.error));
  const [error, setError] = useState(initial.error);
  const [choosing, setChoosing] = useState(
    initial.household.profiles.length > 1,
  );
  const [parent, setParent] = useState(false);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<Progress["avatar"]>("🚀");
  const active = household.profiles.find(
    (p) => p.learner.id === household.activeProfileId,
  )!;
  function save(h: Household, reset = false) {
    if (protectedData && !reset) {
      live.current = h;
      setHousehold(h);
      return error;
    }
    let message: string | null;
    try {
      message = writeHousehold(localStorage, h);
    } catch {
      message =
        "Browser storage is unavailable. Download all players before leaving.";
    }
    setError(message);
    if (reset && message) return message;
    if (reset) setProtected(false);
    live.current = h;
    setHousehold(h);
    return message;
  }
  function update(p: Progress, reset = false) {
    const h = live.current;
    return save(
      {
        ...h,
        profiles: h.profiles.map((old) =>
          old.learner.id === h.activeProfileId ? p : old,
        ),
        activeProfileId: p.learner.id,
      },
      reset,
    );
  }
  function exportAll() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(live.current, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "reading-adventures-all-players.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      <nav className="player-bar" aria-label="Players">
        <span>
          {active.avatar ?? "⭐"} {active.learner.displayName}
        </span>
        <button
          className="button secondary"
          onClick={() => {
            stopGamePrompt();
            update(
              pausePlayer(
                live.current.profiles.find(
                  (p) => p.learner.id === live.current.activeProfileId,
                )!,
              ),
            );
            setChoosing(true);
            setParent(false);
          }}
        >
          Switch player
        </button>
      </nav>
      {choosing ? (
        <main className="player-picker team-card">
          <h1>Who is ready for an adventure?</h1>
          <div className="player-grid">
            {household.profiles.map((p) => (
              <button
                key={p.learner.id}
                className="player-choice"
                onClick={() => {
                  save({ ...live.current, activeProfileId: p.learner.id });
                  setChoosing(false);
                  setParent(false);
                }}
              >
                <span aria-hidden="true">{p.avatar ?? "⭐"}</span>
                {p.learner.displayName}
              </button>
            ))}
          </div>
          <button
            className="button secondary"
            onClick={() => setParent(!parent)}
          >
            {parent ? "Close player settings" : "Parent mode: players"}
          </button>
          {error && <p role="alert">{error}</p>}
          {parent && (
            <section>
              <h2>Player settings</h2>
              {household.migratedShared && (
                <p>
                  Previous shared activity stays with the first player. We
                  cannot tell which child completed it. A new player starts
                  fresh.
                </p>
              )}
              <label>
                New player name
                <input
                  maxLength={30}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <div className="team-choices" aria-label="Choose avatar">
                {avatars.map((a) => (
                  <button
                    className="button secondary"
                    key={a}
                    aria-label={`Avatar ${a}`}
                    aria-pressed={avatar === a}
                    onClick={() => setAvatar(a)}
                  >
                    {a}
                  </button>
                ))}
              </div>
              <button
                className="button primary"
                disabled={!name.trim()}
                onClick={() => {
                  const p = { ...newProgress(), avatar };
                  p.learner.displayName = name.trim();
                  save({
                    ...live.current,
                    profiles: [...live.current.profiles, p],
                  });
                  setName("");
                }}
              >
                Add player
              </button>
              {household.profiles.map((p) => (
                <label key={p.learner.id}>
                  Name for {p.avatar ?? "⭐"}
                  <input
                    aria-label={`Rename ${p.learner.displayName}`}
                    maxLength={30}
                    defaultValue={p.learner.displayName}
                    onBlur={(e) => {
                      const displayName = e.target.value.trim();
                      if (displayName)
                        save({
                          ...live.current,
                          profiles: live.current.profiles.map((x) =>
                            x.learner.id === p.learner.id
                              ? { ...x, learner: { ...x.learner, displayName } }
                              : x,
                          ),
                        });
                      else e.target.value = p.learner.displayName;
                    }}
                  />
                </label>
              ))}
              <button className="button secondary" onClick={exportAll}>
                Download all players
              </button>
              <p>
                Names and progress stay in this browser. Switching devices does
                not sync them.
              </p>
            </section>
          )}
        </main>
      ) : (
        <App
          key={active.learner.id}
          playerInitial={active}
          playerError={protectedData ? error : null}
          onPlayerSave={update}
          onExportAll={exportAll}
        />
      )}
    </>
  );
}
