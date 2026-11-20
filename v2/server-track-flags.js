// Small vector flags used by the public server directory.
function stripes(colors, vertical = false) {
  const colorsCount = colors.length;
  return colors.map((color, index) => vertical
    ? `<rect x="${index * 30 / colorsCount}" width="${30 / colorsCount}" height="20" fill="${color}"/>`
    : `<rect y="${index * 20 / colorsCount}" width="30" height="${20 / colorsCount}" fill="${color}"/>`).join('');
}

function star(x, y, radius, points = 5, innerRatio = .42) {
  const vertices = Array.from({length: points * 2}, (_, index) => {
    const angle = index * Math.PI / points - Math.PI / 2;
    const distance = radius * (index % 2 ? innerRatio : 1);
    return `${(x + Math.cos(angle) * distance).toFixed(2)},${(y + Math.sin(angle) * distance).toFixed(2)}`;
  });
  return `<polygon points="${vertices.join(' ')}" fill="#fff"/>`;
}

const unionJack = '<rect width="30" height="20" fill="#012169"/>'
  + '<path d="M0 0 30 20M30 0 0 20" stroke="#fff" stroke-width="4"/>'
  + '<path d="M0 0 15 10 0 2zM30 20 15 10 30 18zM30 0 15 10 27 0zM0 20 15 10 3 20z" fill="#c8102e"/>'
  + '<path d="M15 0v20M0 10h30" stroke="#fff" stroke-width="6"/>'
  + '<path d="M15 0v20M0 10h30" stroke="#c8102e" stroke-width="3.5"/>';

const flags = {
  it: stripes(['#009246', '#fff', '#ce2b37'], true),
  es: '<rect width="30" height="20" fill="#aa151b"/><rect y="5" width="30" height="10" fill="#f1bf00"/>'
    + '<path d="M7 9h5v3c0 2-5 2-5 0z" fill="#aa151b" stroke="#fff" stroke-width=".35"/>'
    + '<path d="M7.5 8.4 8 7.5l1.5.5 1.5-.5.5.9z" fill="#aa151b"/><path d="M9.5 9.5v3M8 11h3" stroke="#f1bf00" stroke-width=".5"/>',
  gb: unionJack,
  us: stripes(Array.from({length: 13}, (_, index) => index % 2 ? '#fff' : '#b31942'))
    + '<rect width="12" height="10.77" fill="#0a3161"/>'
    + Array.from({length: 9}, (_, row) => Array.from({length: row % 2 ? 5 : 6},
      (_, col) => star(1 + col * 2 + (row % 2), 1 + row * 1.1, .58)).join('')).join(''),
  hu: stripes(['#ce2939', '#fff', '#477050']),
  za: '<path d="M0 0h30v10H0z" fill="#de3831"/><path d="M0 10h30v10H0z" fill="#002395"/>'
    + '<path d="M0 0 15 10 0 20z" fill="#ffb612"/>'
    + '<path d="M0 4 9 10 0 16z" fill="#000"/>'
    + '<path d="M4 0h2l10 6.67h14v6.66H16L6 20H4l12-10z" fill="#fff"/>'
    + '<path d="M0 0h3.6l12 8h14.4v4H15.6l-12 8H0v-2.4L11.4 10 0 2.4z" fill="#007a4d"/>',
  au: '<rect width="30" height="20" fill="#012169"/>'
    + `<g transform="scale(.5)">${unionJack}</g>`
    + star(7.5, 15.3, 2.3, 7) + star(22.4, 15.8, 1.5, 7) + star(22.4, 4.2, 1.5, 7)
    + star(18.7, 9.6, 1.4, 7) + star(26, 8.3, 1.4, 7) + star(24, 11.5, .8),
  de: stripes(['#000', '#d00', '#ffce00']),
  fr: stripes(['#002395', '#fff', '#ed2939'], true),
  at: stripes(['#ed2939', '#fff', '#ed2939']),
  be: stripes(['#000', '#fae042', '#ed2939'], true),
  jp: '<rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="6" fill="#bc002d"/>',
  nl: stripes(['#ae1c28', '#fff', '#21468b']),
};

const tracksByCountry = {
  IT: 'monza monzatg misano imola',
  ES: 'barcelona valencia ricardotormo circuitricardotormo',
  GB: 'brandshatch brandshatchgp donington doningtonpark oultonpark silverstone snetterton',
  US: 'cota circuitoftheamericas indianapolis lagunaseca watkinsglen',
  HU: 'hungaroring',
  ZA: 'kyalami',
  AU: 'mountpanorama bathurst',
  DE: 'nurburgring nurburgring24h nordschl nordschleife',
  FR: 'paulricard',
  AT: 'redbullring',
  BE: 'spa spafrancorchamps zolder',
  JP: 'suzuka',
  NL: 'zandvoort',
};

const countryByTrack = new Map(Object.entries(tracksByCountry).flatMap(([country, tracks]) =>
  tracks.split(' ').map(track => [track, country])));

export function serverTrackCountry(trackCode) {
  const key = String(trackCode ?? '').normalize('NFD').replace(/\p{M}/gu, '')
    .toLowerCase().replace(/[^a-z0-9]/g, '').replace(/jpg$/u, '');
  return countryByTrack.get(key) ?? null;
}

export function serverCountryFlag(country) {
  return `<svg class="server-directory-flag" viewBox="0 0 30 20" aria-hidden="true" focusable="false">${flags[country.toLowerCase()]}</svg>`;
}
