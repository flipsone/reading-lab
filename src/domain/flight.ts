// Small deterministic arcade simulation, independent of reading evidence.
export type Robot = { id: number; x: number; y: number };
export type Bolt = { id: number; x: number; y: number };
export type Flight = {
  elapsed: number;
  shipX: number;
  robots: Robot[];
  bolts: Bolt[];
  stars: number;
  fireAt: number;
  spawnAt: number;
  serial: number;
  sparks: { x: number; y: number; until: number }[];
};
export function createFlight(elapsed = 0, stars = 0): Flight {
  return {
    elapsed,
    shipX: 50,
    robots: [{ id: 0, x: 50, y: 20 }],
    bolts: [],
    stars,
    fireAt: elapsed,
    spawnAt: elapsed + 900,
    serial: 1,
    sparks: [],
  };
}
export function stepFlight(
  previous: Flight,
  ms: number,
  input: { firing: boolean; x: number; reduced: boolean },
): Flight {
  const dt = Math.max(0, Math.min(ms, 50));
  const elapsed = Math.min(12000, previous.elapsed + dt);
  const next: Flight = {
    ...previous,
    elapsed,
    shipX: Math.max(7, Math.min(93, input.x)),
    robots: previous.robots
      .map((r) => ({ ...r, y: r.y + (input.reduced ? 0 : dt * 0.009) }))
      .filter((r) => r.y < 77),
    bolts: previous.bolts
      .map((b) => ({ ...b, y: b.y - dt * 0.12 }))
      .filter((b) => b.y > 0),
    sparks: previous.sparks.filter((s) => s.until > elapsed),
  };
  if (elapsed >= previous.spawnAt) {
    next.robots.push({
      id: next.serial++,
      x: 14 + ((next.serial * 23) % 72),
      y: 12,
    });
    next.spawnAt = elapsed + 900;
  }
  if (input.firing && elapsed >= previous.fireAt) {
    next.fireAt = elapsed + 220;
    if (input.reduced) {
      const robot = next.robots.find((r) => Math.abs(r.x - next.shipX) < 14);
      if (robot) {
        next.robots = next.robots.filter((r) => r.id !== robot.id);
        next.stars++;
      }
    } else next.bolts.push({ id: next.serial++, x: next.shipX, y: 80 });
  }
  next.bolts = next.bolts.filter((bolt) => {
    const robot = next.robots.find(
      (r) => Math.abs(r.x - bolt.x) < 8 && Math.abs(r.y - bolt.y) < 7,
    );
    if (!robot) return true;
    next.robots = next.robots.filter((r) => r.id !== robot.id);
    next.stars++;
    next.sparks.push({ x: robot.x, y: robot.y, until: elapsed + 450 });
    return false;
  });
  return next;
}
