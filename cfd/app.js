// const API_URL = "http://127.0.0.1:8000";
const API_URL = "https://api.jmuller.be";

const CELGROOTTE = 0.125;

const btnBereken =
  document.getElementById("btnBereken");

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


btnBereken.addEventListener(
  "click",
  runCalculation
);

gridXEl.addEventListener(
  "input",
  updateWerkelijkeAfmetingen
);

gridYEl.addEventListener(
  "input",
  updateWerkelijkeAfmetingen
);

gridZEl.addEventListener(
  "input",
  updateWerkelijkeAfmetingen
);


updateWerkelijkeAfmetingen();


function leesGridwaarde(inputElement) {
  const waarde = Number(inputElement.value);

  if (
    !Number.isInteger(waarde) ||
    waarde < 1
  ) {
    return 0;
  }

  return waarde;
}


function updateWerkelijkeAfmetingen() {
  const gridX = leesGridwaarde(gridXEl);
  const gridY = leesGridwaarde(gridYEl);
  const gridZ = leesGridwaarde(gridZEl);

  lengteXEl.textContent =
    (gridX * CELGROOTTE).toFixed(3);

  lengteYEl.textContent =
    (gridY * CELGROOTTE).toFixed(3);

  lengteZEl.textContent =
    (gridZ * CELGROOTTE).toFixed(3);
}


function getGridverhouding() {
  const gridX = leesGridwaarde(gridXEl);
  const gridY = leesGridwaarde(gridYEl);
  const gridZ = leesGridwaarde(gridZEl);

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
  btnBereken.disabled = true;

  statusEl.textContent =
    "Berekening gestart...";

  resultaatEl.textContent = "";

  plotAfbeelding.style.display = "none";
  plotAfbeelding.src = "";

  resultaatNavigatie.style.display = "none";

  try {
    const debiet = Number(
      document.getElementById("debiet").value
    );

    if (!Number.isFinite(debiet)) {
      throw new Error(
        "Vul een geldig debiet in."
      );
    }

    const gridverh =
      getGridverhouding();

    const payload = {
      T_in: 0,
      T_init: 0,

      lengte:
        CELGROOTTE * gridverh[0],

      gridverh: gridverh,

      boven_instroom: false,
      zij_instroom: true,
      boven_instroom_zijwaards: false,

      boven_uitstroom_p: false,
      boven_uitstroom_v: false,
      zij_uitstroom: true,

      ngrid: 3,

      inlaten: [
        [8, 10],
        [9, 10],
        [10, 10],
        [11, 10],
        [12, 10]
      ],

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

    const response = await fetch(
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
      `Temperatuur grid grootte: ` +
      `${data.temperature.length}\n` +
      `Airflow grid grootte: ` +
      `${data.airflow.length}`;

    plotAfbeelding.src =
      `${API_URL}${data.plot_url}` +
      `?t=${Date.now()}`;

    plotAfbeelding.style.display =
      "block";

    resultaatNavigatie.style.display =
      "block";

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
    btnBereken.disabled = false;
  }
}
