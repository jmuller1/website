// const API_URL = "http://127.0.0.1:8000";
const API_URL = "https://api.jmuller.be";

const CELGROOTTE = 0.125;

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

const lengteXEl =
  document.getElementById("lengteX");

const lengteYEl =
  document.getElementById("lengteY");

const lengteZEl =
  document.getElementById("lengteZ");

const inlaatGridEl =
  document.getElementById("inlaatGrid");

const geselecteerdeInlatenEl =
  document.getElementById("geselecteerdeInlaten");

const debietEl =
  document.getElementById("debiet");

const geselecteerdeInlaten =
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

debietEl.addEventListener(
  "input",
  handleInputGewijzigd
);


laadInstellingen();
handleGridInstellingenGewijzigd();
updateResultaatvisualisatieBeschikbaarheid();


function handleInputGewijzigd() {
  handleGridInstellingenGewijzigd();
  slaInstellingenOp();
  updateResultaatvisualisatieBeschikbaarheid();
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


function updateWerkelijkeAfmetingen() {
  const gridX =
    leesGridwaarde(gridXEl);

  const gridY =
    leesGridwaarde(gridYEl);

  const gridZ =
    leesGridwaarde(gridZEl);

  lengteXEl.textContent =
    (gridX * CELGROOTTE).toFixed(3);

  lengteYEl.textContent =
    (gridY * CELGROOTTE).toFixed(3);

  lengteZEl.textContent =
    (gridZ * CELGROOTTE).toFixed(3);
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
    updateGeselecteerdeInlatenTekst();
    return;
  }

  inlaatGridEl.style.gridTemplateColumns =
    `repeat(${gridX}, 34px)`;

  verwijderOngeldigeInlaten(
    gridX,
    gridY
  );

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
        maakInlaatKey(x, y);

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

      if (geselecteerdeInlaten.has(key)) {
        knop.classList.add(
          "geselecteerd"
        );
      }

      knop.addEventListener(
        "click",
        () => toggleInlaatCel(
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
}


function maakInlaatKey(x, y) {
  return `${x},${y}`;
}


function toggleInlaatCel(x, y, knop) {
  const key =
    maakInlaatKey(x, y);

  if (geselecteerdeInlaten.has(key)) {
    geselecteerdeInlaten.delete(key);

    knop.classList.remove(
      "geselecteerd"
    );

  } else {
    geselecteerdeInlaten.add(key);

    knop.classList.add(
      "geselecteerd"
    );
  }

  updateGeselecteerdeInlatenTekst();
  slaInstellingenOp();
  updateResultaatvisualisatieBeschikbaarheid();
}


function verwijderOngeldigeInlaten(gridX, gridY) {
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


function getInputSignature() {
  const inputSnapshot = {
    gridX: gridXEl.value,
    gridY: gridYEl.value,
    gridZ: gridZEl.value,
    debiet: debietEl.value,
    inlaten: getGeselecteerdeInlaten()
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
    debiet: debietEl.value,
    inlaten: getGeselecteerdeInlaten()
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

    if (instellingen.debiet !== undefined) {
      debietEl.value =
        instellingen.debiet;
    }

    geselecteerdeInlaten.clear();

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
              maakInlaatKey(x, y)
            );
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

  debietEl.value =
    "200";

  geselecteerdeInlaten.clear();

  handleGridInstellingenGewijzigd();
  updateGeselecteerdeInlatenTekst();

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

    const gridverh =
      getGridverhouding();

    const inlaten =
      getGeselecteerdeInlaten();

    if (inlaten.length === 0) {
      throw new Error(
        "Selecteer minimaal één inlaatcel in het bovenaanzicht."
      );
    }

    slaInstellingenOp();

    const payload = {
      T_in: 0,
      T_init: 0,

      lengte:
        CELGROOTTE * gridverh[0],

      gridverh: gridverh,

      boven_instroom: true,
      zij_instroom: false,
      boven_instroom_zijwaards: false,

      boven_uitstroom_p: false,
      boven_uitstroom_v: false,
      zij_uitstroom: true,

      ngrid: 3,

      inlaten: inlaten,

      uitlaten: [
        [1, 1],
        [2, 2],
        [2, 3],
        [2, 4],
        [1, 4],
        [1, 2]
      ],

      debiet: debiet,
      alpha: 0,
      Rc: 12,

      pfac: 0.1,
      vfac: 0.4,
      Tfac: 0.5,
      maxdv: 0.07,
      Tcon: false,

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

      wandtemp: [
        20,
        20,
        20,
        20,
        20,
        20
      ],

      Tref: 20,
      Tinlaat: 20,
      maxdT: 0.2,
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

    resultaatEl.textContent =
      `Status: ${data.status}\n` +
      `Grid: ` +
      `${gridverh[0]} × ` +
      `${gridverh[1]} × ` +
      `${gridverh[2]}\n` +
      `Afmetingen: ` +
      `${(gridverh[0] * CELGROOTTE).toFixed(3)} × ` +
      `${(gridverh[1] * CELGROOTTE).toFixed(3)} × ` +
      `${(gridverh[2] * CELGROOTTE).toFixed(3)} m\n` +
      `Inlaten: ` +
      `${JSON.stringify(inlaten)}\n` +
      `Temperatuur grid grootte: ` +
      `${data.temperature.length}\n` +
      `Airflow grid grootte: ` +
      `${data.airflow.length}`;

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
