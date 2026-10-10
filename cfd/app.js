//Tfac lager zetten, bijvoorbeeld van 0.1 naar 0.02 en maxdT lager zetten, bijvoorbeeld van 0.2 naar 0.05
// const API_URL = "http://127.0.0.1:8000";
const API_URL = "https://api.jmuller.be";

const DEFAULT_CELGROOTTE = 0.125;

const MIN_ROOSTER_CENTRUM_AFSTAND = 3;

const STORAGE_KEY =
  "cfdBerekeningInstellingen";

const LAST_CALCULATION_SIGNATURE_KEY =
  "cfdLaatsteBerekeningSignature";

const btnBereken =
  document.getElementById("btnBereken");

const btnResetInstellingen =
  document.getElementById("btnResetInstellingen");

const statusEl =
  document.getElementById("status");

const resultaatEl =
  document.getElementById("resultaat");

const plotAfbeelding =
  document.getElementById("plotAfbeelding");

const resultaatNavigatie =
  document.getElementById("resultaatNavigatie");

const gridXEl =
  document.getElementById("gridX");

const gridYEl =
  document.getElementById("gridY");

const gridZEl =
  document.getElementById("gridZ");

const celGrootteEl =
  document.getElementById("celGrootte");

const nitEl =
  document.getElementById("nit");

const lengteXEl =
  document.getElementById("lengteX");

const lengteYEl =
  document.getElementById("lengteY");

const lengteZEl =
  document.getElementById("lengteZ");

const celGrootteWeergaveEl =
  document.getElementById("celGrootteWeergave");

const inlaatGridEl =
  document.getElementById("inlaatGrid");

const geselecteerdeInlatenEl =
  document.getElementById("geselecteerdeInlaten");

const geselecteerdeUitlatenEl =
  document.getElementById("geselecteerdeUitlaten");

const debietEl =
  document.getElementById("debiet");

const temperatuurRekenenEl =
  document.getElementById("temperatuurRekenen");

const tinlaatEl =
  document.getElementById("tinlaat");

const vloerTemperatuurEl =
  document.getElementById("vloerTemperatuur");

const geselecteerdeInlaten =
  new Set();

const geselecteerdeUitlaten =
  new Set();


btnBereken.addEventListener(
  "click",
  runCalculation
);

btnResetInstellingen.addEventListener(
  "click",
  resetNaarStandaardInstellingen
);

gridXEl.addEventListener(
  "input",
  handleInputGewijzigd
);

gridYEl.addEventListener(
  "input",
  handleInputGewijzigd
);

gridZEl.addEventListener(
  "input",
  handleInputGewijzigd
);

celGrootteEl.addEventListener(
  "input",
  handleInputGewijzigd
);

nitEl.addEventListener(
  "input",
  handleInputGewijzigd
);

debietEl.addEventListener(
  "input",
  handleInputGewijzigd
);

temperatuurRekenenEl.addEventListener(
  "change",
  handleTemperatuurInstellingenGewijzigd
);

tinlaatEl.addEventListener(
  "input",
  handleTemperatuurInstellingenGewijzigd
);

vloerTemperatuurEl.addEventListener(
  "input",
  handleTemperatuurInstellingenGewijzigd
);

document
  .querySelectorAll("input[name='selectieModus']")
  .forEach((radioKnop) => {
    radioKnop.addEventListener(
      "change",
      slaInstellingenOp
    );
  });


laadInstellingen();
handleGridInstellingenGewijzigd();
updateTemperatuurVelden();
updateResultaatvisualisatieBeschikbaarheid();


function handleInputGewijzigd() {
  handleGridInstellingenGewijzigd();
  slaInstellingenOp();
  updateResultaatvisualisatieBeschikbaarheid();
}


function handleTemperatuurInstellingenGewijzigd() {
  updateTemperatuurVelden();
  slaInstellingenOp();
  updateResultaatvisualisatieBeschikbaarheid();
}


function updateTemperatuurVelden() {
  const temperatuurActief =
    temperatuurRekenenEl.checked;

  tinlaatEl.disabled =
    !temperatuurActief;

  vloerTemperatuurEl.disabled =
    !temperatuurActief;
}

function berekenWandtemperaturen(vloerTemperatuur) {
  const referentieTemperatuur =
    20;

  const overigeWandTemperatuur =
    referentieTemperatuur +
    0.2 * (vloerTemperatuur - referentieTemperatuur);

  return [
    overigeWandTemperatuur,
    overigeWandTemperatuur,
    overigeWandTemperatuur,
    overigeWandTemperatuur,
    vloerTemperatuur,
    overigeWandTemperatuur
  ];
}


function leesGridwaarde(inputElement) {
  const waarde =
    Number(inputElement.value);

  if (
    !Number.isInteger(waarde) ||
    waarde < 1
  ) {
    return 0;
  }

  return waarde;
}


function leesCelgrootteVoorWeergave() {
  const waarde =
    Number(celGrootteEl.value);

  if (
    !Number.isFinite(waarde) ||
    waarde <= 0
  ) {
    return 0;
  }

  return waarde;
}


function getCelgrootte() {
  const celGrootte =
    Number(celGrootteEl.value);

  if (
    !Number.isFinite(celGrootte) ||
    celGrootte <= 0
  ) {
    throw new Error(
      "De celgrootte moet een positief getal in meter zijn."
    );
  }

  return celGrootte;
}


function updateWerkelijkeAfmetingen() {
  const gridX =
    leesGridwaarde(gridXEl);

  const gridY =
    leesGridwaarde(gridYEl);

  const gridZ =
    leesGridwaarde(gridZEl);

  const celGrootte =
    leesCelgrootteVoorWeergave();

  if (celGrootteWeergaveEl) {
    celGrootteWeergaveEl.textContent =
      celGrootte > 0
        ? celGrootte.toFixed(3)
        : "ongeldig";
  }

  if (celGrootte <= 0) {
    lengteXEl.textContent =
      "-";

    lengteYEl.textContent =
      "-";

    lengteZEl.textContent =
      "-";

    return;
  }

  lengteXEl.textContent =
    (gridX * celGrootte).toFixed(3);

  lengteYEl.textContent =
    (gridY * celGrootte).toFixed(3);

  lengteZEl.textContent =
    (gridZ * celGrootte).toFixed(3);
}


function handleGridInstellingenGewijzigd() {
  updateWerkelijkeAfmetingen();
  maakInlaatGrid();
}


function maakInlaatGrid() {
  const gridX =
    leesGridwaarde(gridXEl);

  const gridY =
    leesGridwaarde(gridYEl);

  inlaatGridEl.innerHTML = "";

  if (
    gridX < 1 ||
    gridY < 1
  ) {
    geselecteerdeInlaten.clear();
    geselecteerdeUitlaten.clear();

    updateGeselecteerdeInlatenTekst();
    updateGeselecteerdeUitlatenTekst();

    return;
  }

  inlaatGridEl.style.gridTemplateColumns =
    `repeat(${gridX}, 34px)`;

  verwijderOngeldigeSelecties(
    gridX,
    gridY
  );

  verwijderTeDichteRoosterSelecties();

  for (
    let y = gridY;
    y >= 1;
    y -= 1
  ) {
    for (
      let x = 1;
      x <= gridX;
      x += 1
    ) {
      const knop =
        document.createElement("button");

      const key =
        maakCelKey(x, y);

      knop.type =
        "button";

      knop.className =
        "gridCel";

      knop.textContent =
        `${x},${y}`;

      knop.dataset.x =
        x;

      knop.dataset.y =
        y;

      updateCelWeergave(
        knop,
        key
      );

      knop.addEventListener(
        "click",
        () => toggleCel(
          x,
          y,
          knop
        )
      );

      inlaatGridEl.appendChild(
        knop
      );
    }
  }

  updateGeselecteerdeInlatenTekst();
  updateGeselecteerdeUitlatenTekst();
}


function maakCelKey(x, y) {
  return `${x},${y}`;
}


function getSelectieModus() {
  const geselecteerdeModus =
    document.querySelector(
      "input[name='selectieModus']:checked"
    );

  if (!geselecteerdeModus) {
    return "inlaat";
  }

  return geselecteerdeModus.value;
}


function toggleCel(x, y, knop) {
  const key =
    maakCelKey(x, y);

  const modus =
    getSelectieModus();

  if (modus === "inlaat") {
    if (geselecteerdeInlaten.has(key)) {
      geselecteerdeInlaten.delete(key);

    } else {
      const afstandControle =
        controleerRoosterAfstand(
          x,
          y,
          key
        );

      if (!afstandControle.geldig) {
        toonRoosterAfstandFout(
          x,
          y,
          afstandControle.bestaande
        );

        return;
      }

      geselecteerdeInlaten.add(key);
      geselecteerdeUitlaten.delete(key);
    }

  } else if (modus === "uitlaat") {
    if (geselecteerdeUitlaten.has(key)) {
      geselecteerdeUitlaten.delete(key);

    } else {
      const afstandControle =
        controleerRoosterAfstand(
          x,
          y,
          key
        );

      if (!afstandControle.geldig) {
        toonRoosterAfstandFout(
          x,
          y,
          afstandControle.bestaande
        );

        return;
      }

      geselecteerdeUitlaten.add(key);
      geselecteerdeInlaten.delete(key);
    }
  }

  updateCelWeergave(
    knop,
    key
  );

  updateGeselecteerdeInlatenTekst();
  updateGeselecteerdeUitlatenTekst();

  statusEl.textContent =
    "";

  slaInstellingenOp();
  updateResultaatvisualisatieBeschikbaarheid();
}


function getAlleRoosterCentra() {
  const centra = [];

  for (const key of geselecteerdeInlaten) {
    const delen =
      key.split(",");

    centra.push({
      key: key,
      type: "inlaat",
      x: Number(delen[0]),
      y: Number(delen[1])
    });
  }

  for (const key of geselecteerdeUitlaten) {
    const delen =
      key.split(",");

    centra.push({
      key: key,
      type: "uitstroom",
      x: Number(delen[0]),
      y: Number(delen[1])
    });
  }

  return centra;
}


function roosterCentraLiggenTeDichtBijElkaar(
  x1,
  y1,
  x2,
  y2
) {
  return (
    Math.abs(x1 - x2) < MIN_ROOSTER_CENTRUM_AFSTAND &&
    Math.abs(y1 - y2) < MIN_ROOSTER_CENTRUM_AFSTAND
  );
}


function controleerRoosterAfstand(x, y, negeerKey) {
  for (const bestaand of getAlleRoosterCentra()) {
    if (bestaand.key === negeerKey) {
      continue;
    }

    if (
      roosterCentraLiggenTeDichtBijElkaar(
        x,
        y,
        bestaand.x,
        bestaand.y
      )
    ) {
      return {
        geldig: false,
        bestaande: bestaand
      };
    }
  }

  return {
    geldig: true,
    bestaande: null
  };
}


function toonRoosterAfstandFout(x, y, bestaand) {
  const bestaandTekst = bestaand
    ? `${bestaand.type} [${bestaand.x}, ${bestaand.y}]`
    : "een bestaand rooster";

  statusEl.textContent =
    `Rooster niet geplaatst: centrum [${x}, ${y}] ligt te dicht bij ${bestaandTekst}. ` +
    `Houd minimaal ${MIN_ROOSTER_CENTRUM_AFSTAND} cellen tussen de roostercentra aan.`;
}


function verwijderTeDichteRoosterSelecties() {
  const geaccepteerdeCentra = [];
  let isGewijzigd =
    false;

  const verwerkSet = (selectieSet) => {
    for (const key of Array.from(selectieSet)) {
      const delen =
        key.split(",");

      const x =
        Number(delen[0]);

      const y =
        Number(delen[1]);

      const teDicht =
        geaccepteerdeCentra.some((bestaand) =>
          roosterCentraLiggenTeDichtBijElkaar(
            x,
            y,
            bestaand.x,
            bestaand.y
          )
        );

      if (teDicht) {
        selectieSet.delete(key);
        isGewijzigd =
          true;

      } else {
        geaccepteerdeCentra.push({
          x: x,
          y: y
        });
      }
    }
  };

  verwerkSet(geselecteerdeInlaten);
  verwerkSet(geselecteerdeUitlaten);

  if (isGewijzigd) {
    slaInstellingenOp();
  }
}


function updateCelWeergave(knop, key) {
  knop.classList.remove(
    "inlaat",
    "uitlaat"
  );

  if (geselecteerdeInlaten.has(key)) {
    knop.classList.add(
      "inlaat"
    );
  }

  if (geselecteerdeUitlaten.has(key)) {
    knop.classList.add(
      "uitlaat"
    );
  }
}


function verwijderOngeldigeSelecties(gridX, gridY) {
  let isGewijzigd =
    false;

  for (
    const key of Array.from(geselecteerdeInlaten)
  ) {
    const delen =
      key.split(",");

    const x =
      Number(delen[0]);

    const y =
      Number(delen[1]);

    if (
      x < 1 ||
      x > gridX ||
      y < 1 ||
      y > gridY
    ) {
      geselecteerdeInlaten.delete(key);

      isGewijzigd =
        true;
    }
  }

  for (
    const key of Array.from(geselecteerdeUitlaten)
  ) {
    const delen =
      key.split(",");

    const x =
      Number(delen[0]);

    const y =
      Number(delen[1]);

    if (
      x < 1 ||
      x > gridX ||
      y < 1 ||
      y > gridY
    ) {
      geselecteerdeUitlaten.delete(key);

      isGewijzigd =
        true;
    }
  }

  if (isGewijzigd) {
    slaInstellingenOp();
  }
}


function getGeselecteerdeInlaten() {
  return Array.from(geselecteerdeInlaten)
    .map((key) => {
      const delen =
        key.split(",");

      return [
        Number(delen[0]),
        Number(delen[1])
      ];
    })
    .sort((a, b) => {
      if (a[1] !== b[1]) {
        return b[1] - a[1];
      }

      return a[0] - b[0];
    });
}


function getGeselecteerdeUitlaten() {
  return Array.from(geselecteerdeUitlaten)
    .map((key) => {
      const delen =
        key.split(",");

      return [
        Number(delen[0]),
        Number(delen[1])
      ];
    })
    .sort((a, b) => {
      if (a[1] !== b[1]) {
        return b[1] - a[1];
      }

      return a[0] - b[0];
    });
}


function updateGeselecteerdeInlatenTekst() {
  const inlaten =
    getGeselecteerdeInlaten();

  if (inlaten.length === 0) {
    geselecteerdeInlatenEl.textContent =
      "geen";

    return;
  }

  geselecteerdeInlatenEl.textContent =
    inlaten
      .map(([x, y]) => `[${x}, ${y}]`)
      .join(", ");
}


function updateGeselecteerdeUitlatenTekst() {
  const uitlaten =
    getGeselecteerdeUitlaten();

  if (uitlaten.length === 0) {
    geselecteerdeUitlatenEl.textContent =
      "geen";

    return;
  }

  geselecteerdeUitlatenEl.textContent =
    uitlaten
      .map(([x, y]) => `[${x}, ${y}]`)
      .join(", ");
}


function getInputSignature() {
  const inputSnapshot = {
    gridX: gridXEl.value,
    gridY: gridYEl.value,
    gridZ: gridZEl.value,
    celGrootte: celGrootteEl.value,
    nit: nitEl.value,
    debiet: debietEl.value,
    temperatuurRekenen: temperatuurRekenenEl.checked,
    tinlaat: tinlaatEl.value,
    vloerTemperatuur: vloerTemperatuurEl.value,
    inlaten: getGeselecteerdeInlaten(),
    uitlaten: getGeselecteerdeUitlaten()
  };

  return JSON.stringify(inputSnapshot);
}


function updateResultaatvisualisatieBeschikbaarheid() {
  const laatsteBerekeningSignature =
    localStorage.getItem(
      LAST_CALCULATION_SIGNATURE_KEY
    );

  const huidigeInputSignature =
    getInputSignature();

  if (
    laatsteBerekeningSignature &&
    laatsteBerekeningSignature === huidigeInputSignature
  ) {
    resultaatNavigatie.style.display =
      "block";

  } else {
    resultaatNavigatie.style.display =
      "none";
  }
}


function markeerBerekeningAlsActueel() {
  localStorage.setItem(
    LAST_CALCULATION_SIGNATURE_KEY,
    getInputSignature()
  );

  resultaatNavigatie.style.display =
    "block";
}


function slaInstellingenOp() {
  const instellingen = {
    gridX: gridXEl.value,
    gridY: gridYEl.value,
    gridZ: gridZEl.value,
    celGrootte: celGrootteEl.value,
    nit: nitEl.value,
    debiet: debietEl.value,
    temperatuurRekenen: temperatuurRekenenEl.checked,
    tinlaat: tinlaatEl.value,
    vloerTemperatuur: vloerTemperatuurEl.value,
    inlaten: getGeselecteerdeInlaten(),
    uitlaten: getGeselecteerdeUitlaten(),
    selectieModus: getSelectieModus()
  };

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(instellingen)
  );
}


function laadInstellingen() {
  const opgeslagenInstellingen =
    localStorage.getItem(STORAGE_KEY);

  if (!opgeslagenInstellingen) {
    return;
  }

  try {
    const instellingen =
      JSON.parse(opgeslagenInstellingen);

    if (instellingen.gridX !== undefined) {
      gridXEl.value =
        instellingen.gridX;
    }

    if (instellingen.gridY !== undefined) {
      gridYEl.value =
        instellingen.gridY;
    }

    if (instellingen.gridZ !== undefined) {
      gridZEl.value =
        instellingen.gridZ;
    }

    if (instellingen.celGrootte !== undefined) {
      celGrootteEl.value =
        instellingen.celGrootte;
    }

    if (instellingen.nit !== undefined) {
      nitEl.value =
        instellingen.nit;
    }

    if (instellingen.debiet !== undefined) {
      debietEl.value =
        instellingen.debiet;
    }

    if (instellingen.temperatuurRekenen !== undefined) {
      temperatuurRekenenEl.checked =
        Boolean(instellingen.temperatuurRekenen);
    }

    if (instellingen.tinlaat !== undefined) {
      tinlaatEl.value =
        instellingen.tinlaat;
    }

    if (instellingen.vloerTemperatuur !== undefined) {
      vloerTemperatuurEl.value =
        instellingen.vloerTemperatuur;
    }

    if (instellingen.selectieModus !== undefined) {
      const radioKnop =
        document.querySelector(
          `input[name='selectieModus'][value='${instellingen.selectieModus}']`
        );

      if (radioKnop) {
        radioKnop.checked =
          true;
      }
    }

    geselecteerdeInlaten.clear();
    geselecteerdeUitlaten.clear();

    if (Array.isArray(instellingen.inlaten)) {
      for (const inlaat of instellingen.inlaten) {
        if (
          Array.isArray(inlaat) &&
          inlaat.length === 2
        ) {
          const x =
            Number(inlaat[0]);

          const y =
            Number(inlaat[1]);

          if (
            Number.isInteger(x) &&
            Number.isInteger(y)
          ) {
            geselecteerdeInlaten.add(
              maakCelKey(x, y)
            );
          }
        }
      }
    }

    if (Array.isArray(instellingen.uitlaten)) {
      for (const uitlaat of instellingen.uitlaten) {
        if (
          Array.isArray(uitlaat) &&
          uitlaat.length === 2
        ) {
          const x =
            Number(uitlaat[0]);

          const y =
            Number(uitlaat[1]);

          if (
            Number.isInteger(x) &&
            Number.isInteger(y)
          ) {
            const key =
              maakCelKey(x, y);

            if (!geselecteerdeInlaten.has(key)) {
              geselecteerdeUitlaten.add(key);
            }
          }
        }
      }
    }

  } catch (error) {
    console.error(
      "Opgeslagen instellingen konden niet worden geladen.",
      error
    );

    localStorage.removeItem(
      STORAGE_KEY
    );

    localStorage.removeItem(
      LAST_CALCULATION_SIGNATURE_KEY
    );
  }
}


function resetNaarStandaardInstellingen() {
  localStorage.removeItem(
    STORAGE_KEY
  );

  localStorage.removeItem(
    LAST_CALCULATION_SIGNATURE_KEY
  );

  gridXEl.value =
    "20";

  gridYEl.value =
    "20";

  gridZEl.value =
    "20";

  celGrootteEl.value =
    String(DEFAULT_CELGROOTTE);

  nitEl.value =
    "2000";

  debietEl.value =
    "200";

  temperatuurRekenenEl.checked =
    true;

  tinlaatEl.value =
    "15";

  vloerTemperatuurEl.value =
    "20";

  geselecteerdeInlaten.clear();
  geselecteerdeUitlaten.clear();

  const inlaatRadio =
    document.querySelector(
      "input[name='selectieModus'][value='inlaat']"
    );

  if (inlaatRadio) {
    inlaatRadio.checked =
      true;
  }

  handleGridInstellingenGewijzigd();
  updateTemperatuurVelden();

  updateGeselecteerdeInlatenTekst();
  updateGeselecteerdeUitlatenTekst();

  resultaatNavigatie.style.display =
    "none";

  plotAfbeelding.style.display =
    "none";

  plotAfbeelding.src =
    "";

  statusEl.textContent =
    "Standaardinstellingen hersteld.";

  resultaatEl.textContent =
    "";
}


function getGridverhouding() {
  const gridX =
    leesGridwaarde(gridXEl);

  const gridY =
    leesGridwaarde(gridYEl);

  const gridZ =
    leesGridwaarde(gridZEl);

  if (
    gridX < 1 ||
    gridY < 1 ||
    gridZ < 1
  ) {
    throw new Error(
      "De gridwaarden voor X, Y en Z moeten gehele getallen van minimaal 1 zijn."
    );
  }

  return [
    gridX,
    gridY,
    gridZ
  ];
}


function getAantalRekenstappen() {
  const nit =
    Number(nitEl.value);

  if (
    !Number.isInteger(nit) ||
    nit < 1
  ) {
    throw new Error(
      "Het aantal rekenstappen moet een geheel getal van minimaal 1 zijn."
    );
  }

  return nit;
}


async function runCalculation() {
  btnBereken.disabled =
    true;

  statusEl.textContent =
    "Berekening gestart...";

  resultaatEl.textContent =
    "";

  plotAfbeelding.style.display =
    "none";

  plotAfbeelding.src =
    "";

  resultaatNavigatie.style.display =
    "none";

  try {
    const debiet =
      Number(debietEl.value);

    if (!Number.isFinite(debiet)) {
      throw new Error(
        "Vul een geldig debiet in."
      );
    }

    const temperatuurRekenen =
      temperatuurRekenenEl.checked;

    const tinlaat =
      Number(tinlaatEl.value);

    if (temperatuurRekenen && !Number.isFinite(tinlaat)) {
      throw new Error(
        "Vul een geldige inblaasluchttemperatuur in."
      );
    }

    const vloerTemperatuur =
      Number(vloerTemperatuurEl.value);

    if (temperatuurRekenen && !Number.isFinite(vloerTemperatuur)) {
      throw new Error(
        "Vul een geldige vloertemperatuur in."
      );
    }

    const wandtemperaturen =
      berekenWandtemperaturen(vloerTemperatuur);

    const celGrootte =
      getCelgrootte();

    const gridverh =
      getGridverhouding();

    const nit =
      getAantalRekenstappen();

    const inlaten =
      getGeselecteerdeInlaten();

    const uitlaten =
      getGeselecteerdeUitlaten();

    if (inlaten.length === 0) {
      throw new Error(
        "Selecteer minimaal één inlaatcel in het bovenaanzicht."
      );
    }

    if (uitlaten.length === 0) {
      throw new Error(
        "Selecteer minimaal één uitstroomcel in het bovenaanzicht."
      );
    }

    slaInstellingenOp();

    const payload = {
      T_in: 0,
      T_init: 0,

      lengte:
        celGrootte * gridverh[0],

      gridverh: gridverh,

      boven_instroom: false,
      zij_instroom: false,
      boven_instroom_zijwaards: true,

      boven_uitstroom_p: false,
      boven_uitstroom_v: true,
      zij_uitstroom: false,

      ngrid: 3,
      nit: nit,

      inlaten: inlaten,
      uitlaten: uitlaten,

      debiet: debiet,
      alpha: 3.5,
      Rc: 6,

      pfac: 0.1,
      vfac: 0.4,
      Tfac: 0.1,  //aangepast
      maxdv: 0.07,
      Tcon: temperatuurRekenen,

      wanden: [
        [0, 0, 0, 0, 0, 0]
      ],

      kachels: [
        [6, 1, 1],
        [7, 1, 1]
      ],

      Fh_kachels: [
        0,
        0
      ],

      wandtemp: wandtemperaturen,

      Tref: 20,
      Tinlaat: tinlaat,
      maxdT: 0.2, //aangepast
      impfac: 0
    };

    const response =
      await fetch(
        `${API_URL}/calculate`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify(payload)
        }
      );

    if (!response.ok) {
      const foutTekst =
        await response.text();

      throw new Error(
        `HTTP-fout ${response.status}: ${foutTekst}`
      );
    }

    const data =
      await response.json();

    statusEl.textContent =
      "Berekening klaar";

    const rekentijdTekst =
      typeof data.calculation_time_seconds === "number"
        ? `Rekentijd backend: ${data.calculation_time_seconds.toFixed(1)} s
`
        : "";

    const uitvoerGridTekst =
      data.calculation && Array.isArray(data.calculation.grid_shape)
        ? `Uitvoergrid inclusief randcellen: ${data.calculation.grid_shape.join(" × ")}
`
        : "";

    resultaatEl.textContent =
      `Status: ${data.status}
` +
      rekentijdTekst +
      uitvoerGridTekst +
      `Grid invoer: ` +
      `${gridverh[0]} × ` +
      `${gridverh[1]} × ` +
      `${gridverh[2]}
` +
      `Rekenstappen: ` +
      `${nit}
` +
      `Celgrootte: ` +
      `${celGrootte.toFixed(3)} m
` +
      `Temperatuur meenemen: ` +
      `${temperatuurRekenen ? "ja" : "nee"}
` +
      `Inblaasluchttemperatuur: ` +
      `${tinlaat.toFixed(1)} °C
` +
      `Vloertemperatuur: ` +
      `${vloerTemperatuur.toFixed(1)} °C
` +
      `Afgeleide wandtemperatuur: ` +
      `${wandtemperaturen[0].toFixed(1)} °C
` +
      `Afmetingen: ` +
      `${(gridverh[0] * celGrootte).toFixed(3)} × ` +
      `${(gridverh[1] * celGrootte).toFixed(3)} × ` +
      `${(gridverh[2] * celGrootte).toFixed(3)} m
` +
      `Inlaten: ` +
      `${JSON.stringify(inlaten)}
` +
      `Uitstroompunten: ` +
      `${JSON.stringify(uitlaten)}`;

    plotAfbeelding.src =
      `${API_URL}${data.plot_url}` +
      `?t=${Date.now()}`;

    plotAfbeelding.style.display =
      "block";

    markeerBerekeningAlsActueel();

  } catch (error) {
    statusEl.textContent =
      "Fout";

    resultaatEl.textContent =
      error.message;

    plotAfbeelding.style.display =
      "none";

    resultaatNavigatie.style.display =
      "none";

    console.error(error);

  } finally {
    btnBereken.disabled =
      false;
  }
}