export function createRacesSummaryView({ documentRef, translate, renderDriverLink }) {
  if (!documentRef || typeof translate !== "function" || typeof renderDriverLink !== "function") {
    throw new TypeError("Races summary view requires complete rendering dependencies");
  }
  return Object.freeze({
    render(summary) {
      if (!summary) return;
      const elements = {
        total: documentRef.getElementById("races-total-count"),
        averageActive: documentRef.getElementById("races-avg-active"),
        averageOvertakes: documentRef.getElementById("races-avg-overtakes"),
        topWinner: documentRef.getElementById("races-top-winner"),
        latestWinner: documentRef.getElementById("races-latest-winner"),
        latestBestLap: documentRef.getElementById("races-last-winner-best-lap"),
        latestBestLapCar: documentRef.getElementById("races-last-winner-best-lap-note")
      };
      if (Object.values(elements).some(element => !element)) return;
      elements.total.textContent = summary.total;
      elements.averageActive.textContent = summary.averageActive;
      elements.averageOvertakes.textContent = summary.averageOvertakes;
      elements.topWinner.innerHTML = summary.topWinner
        ? renderDriverLink(summary.topWinner.name || translate("noWinner"), summary.topWinner.public_id, "driver-link")
        : translate("noWinner");
      elements.latestWinner.innerHTML = summary.latestRace
        ? renderDriverLink(summary.latestRace.winner || translate("noWinner"), summary.latestRace.winner_public_id, "driver-link")
        : translate("noWinner");
      elements.latestBestLap.textContent = summary.latestBestLap;
      elements.latestBestLapCar.textContent = summary.latestBestLapCar;
    }
  });
}
