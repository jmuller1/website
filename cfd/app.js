// const API_URL = "http://127.0.0.1:8000";
const API_URL = "http://178.104.112.10";

const btnBereken = document.getElementById("btnBereken");
const statusEl = document.getElementById("status");
const resultaatEl = document.getElementById("resultaat");
const plotAfbeelding = document.getElementById("plotAfbeelding");
const resultaatNavigatie = document.getElementById(
  "resultaatNavigatie"
);

btnBereken.addEventListener("click", runCalculation);


async function runCalculation() {
  btnBereken.disabled = true;

  statusEl.textContent = "Berekening gestart...";
  resultaatEl.textContent = "";

  plotAfbeelding.style.display = "none";
  plotAfbeelding.src = "";

  resultaatNavigatie.style.display = "none";

  const debiet = Number(
    document.getElementById("debiet").value
  );

  const payload = {
    T_in: 0,
    T_init: 0,
    lengte: 10.0,
    gridverh: [80, 20, 20],

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

    Fh_kachels: [0, 0],

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

  try {
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
      const foutTekst = await response.text();

      throw new Error(
        `HTTP-fout ${response.status}: ${foutTekst}`
      );
    }

    const data = await response.json();

    statusEl.textContent = "Berekening klaar";

    resultaatEl.textContent =
      `Status: ${data.status}\n` +
      `Temperatuur grid grootte: ${data.temperature.length}\n` +
      `Airflow grid grootte: ${data.airflow.length}`;

    plotAfbeelding.src =
      `${API_URL}${data.plot_url}?t=${Date.now()}`;

    plotAfbeelding.style.display = "block";

    // De knop verschijnt pas na een succesvolle berekening.
    resultaatNavigatie.style.display = "block";

  } catch (error) {
    statusEl.textContent = "Fout";
    resultaatEl.textContent = error.message;

    plotAfbeelding.style.display = "none";
    resultaatNavigatie.style.display = "none";

    console.error(error);

  } finally {
    btnBereken.disabled = false;
  }
}