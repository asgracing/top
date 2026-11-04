export function timingMarksForSegments(points, segments) {
  return segments.map(([index, fraction]) => {
    const [x, y] = points[index];
    const [nextX, nextY] = points[(index + 1) % points.length];
    const dx = nextX - x, dy = nextY - y, length = Math.hypot(dx, dy);
    if (!length || !(fraction >= 0 && fraction <= 1)) throw Error('Invalid timing line segment');
    return [x + dx * fraction, y + dy * fraction, -dy / length * 20, dx / length * 20]
      .map(value => Number(value.toFixed(2)));
  });
}
