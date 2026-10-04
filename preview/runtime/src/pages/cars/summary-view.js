export function createCarsSummaryView({ documentRef, renderCarLink, renderCarImage }) {
  if (!documentRef || typeof renderCarLink !== "function" || typeof renderCarImage !== "function") {
    throw new TypeError("Cars summary view requires complete rendering dependencies");
  }
  return Object.freeze({
    render(rows = []) {
      const cars = Array.isArray(rows) ? rows : [];
      const total = documentRef.getElementById("cars-total-count");
      const winner = documentRef.getElementById("cars-top-winner");
      if (!total || !winner) return;
      const topWinner = cars[0] || null;
      const mostUsed = [...cars].sort((a, b) => {
        const difference = (b?.races ?? 0) - (a?.races ?? 0);
        return difference || String(a?.car_name || "").localeCompare(String(b?.car_name || ""));
      })[0] || null;
      total.textContent = cars.length || "—";
      winner.innerHTML = topWinner ? renderCarLink(topWinner.car_name, "driver-link") : "—";
      const used = documentRef.getElementById("cars-most-used");
      if (used) used.innerHTML = mostUsed ? renderCarLink(mostUsed.car_name, "driver-link") : "—";

      const spotlight = documentRef.getElementById("cars-hero-spotlight");
      const media = documentRef.getElementById("cars-hero-spotlight-media");
      const name = documentRef.getElementById("cars-hero-spotlight-name");
      const races = documentRef.getElementById("cars-hero-spotlight-races");
      const wins = documentRef.getElementById("cars-hero-spotlight-wins");
      if (![spotlight, media, name, races, wins].every(Boolean)) return;
      spotlight.hidden = !mostUsed;
      if (!mostUsed) {
        media.replaceChildren();
        name.textContent = races.textContent = wins.textContent = "—";
        return;
      }
      media.innerHTML = renderCarImage(mostUsed, { className: "cars-hero-spotlight-image", alt: mostUsed.car_name || "" });
      name.innerHTML = renderCarLink(mostUsed.car_name || "—", "driver-link");
      races.textContent = String(mostUsed.races ?? 0);
      wins.textContent = String(mostUsed.wins ?? 0);
    }
  });
}
