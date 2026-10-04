// const API_URL = "http://127.0.0.1:8000";
const API_URL = "https://api.jmuller.be";

const LEEFZONE_STORAGE_KEY =
  "cfdLeefzonePostprocessingInstellingen";

const plotTypeEl =
  document.getElementById("plotType");

const sliceIndexEl =
  document.getElementById("sliceIndex");

const sliceContainer =
  document.getElementById("sliceContainer");

const sliceHelpEl =
  document.getElementById("sliceHelp");

const btnGenereerPlot =
  document.getElementById("btnGenereerPlot");

const statusEl =
  document.getElementById("status");

const informatieEl =
  document.getElementById("informatie");

const plotAfbeelding =
  document.getElementById("plotAfbeelding");

const sliceOverviewContainer =
  document.getElementById("sliceOverviewContainer");

const sliceOverviewAfbeelding =
  document.getElementById("sliceOverviewAfbeelding");

const vectorScaleContainer =
  document.getElementById("vectorScaleContainer");

const vectorScaleEl =
  document.getElementById("vectorScale");

const vectorScaleValueEl =
  document.getElementById("vectorScaleValue");

const speedThresholdContainer =
  document.getElementById("speedThresholdContainer");

const speedThresholdEl =
  document.getElementById("speedThreshold");

const speedThresholdValueEl =
  document.getElementById("speedThresholdValue");

const leefzoneActiefEl =
  document.getElementById("leefzoneActief");

const leefzonePresetEl =
  document.getElementById("leefzonePreset");

const leefzoneVeldenEl =
  document.getElementById("leefzoneVelden");

const leefzoneZMinEl =
  document.getElementById("leefzoneZMin");

const leefzoneZMaxEl =
  document.getElementById("leefzoneZMax");

const leefzoneWandafstandEl =
  document.getElementById("leefzoneWandafstand");

const leefzoneResultatenEl =
  document.getElementById("leefzoneResultaten");

let plotInformation =
  null;

let vectorScaleTimer =
  null;

let speedThresholdTimer =
  null;

let leefzoneTimer =
  null;


if (btnGenereerPlot) {
  btnGenereerPlot.addEventListener(
    "click",
    generatePlot
  );
}

plotTypeEl.addEventListener(
  "change",
  () => {
    updateSliceOptions();
    updateVectorScaleVisibility();
    updateSpeedThresholdVisibility();
    generatePlot();
  }
);

sliceIndexEl.addEventListener(
  "change",
  generatePlot
);

vectorScaleEl.addEventListener(
  "input",
  () => {
    vectorScaleValueEl.textContent =
      `${Number(vectorScaleEl.value).toFixed(1)}×`;

    const plotType =
      Number(plotTypeEl.value);

    if (!is3DPlot(plotType)) {
      return;
    }

    clearTimeout(vectorScaleTimer);

    vectorScaleTimer =
      setTimeout(
        () => {
          generatePlot();
        },
        400
      );
  }
);

speedThresholdEl.addEventListener(
  "input",
  () => {
    speedThresholdValueEl.textContent =
      `${Number(speedThresholdEl.value).toFixed(2)} m/s`;

    const plotType =
      Number(plotTypeEl.value);

    if (!isSpeedPlot(plotType)) {
      return;
    }

    clearTimeout(speedThresholdTimer);

    speedThresholdTimer =
      setTimeout(
        () => {
          generatePlot();
        },
        400
      );
  }
);


leefzoneActiefEl.addEventListener(
  "input",
  handleLeefzoneInputGewijzigd
);

leefzonePresetEl.addEventListener(
  "change",
  () => {
    pasLeefzonePresetToe();
    handleLeefzoneInputGewijzigd();
  }
);

[
  leefzoneZMinEl,
  leefzoneZMaxEl,
  leefzoneWandafstandEl
].forEach((inputElement) => {
  inputElement.addEventListener(
    "input",
    () => {
      leefzonePresetEl.value =
        "handmatig";

      handleLeefzoneInputGewijzigd();
    }
  );
});


laadLeefzoneInstellingen();
updateLeefzoneVelden();

loadPlotInformation();


function is3DPlot(plotType) {
  return plotType === 10 || plotType === 11;
}


function isSpeedPlot(plotType) {
  return plotType === 3 || plotType === 4 || plotType === 12;
}


function isSlicePlot(plotTypeData) {
  return (
    plotTypeData &&
    plotTypeData.slice_axis !== null
  );
}


function verbergSliceOverview() {
  sliceOverviewContainer.style.display =
    "none";

  sliceOverviewAfbeelding.style.display =
    "none";

  sliceOverviewAfbeelding.src =
    "";
}


function pasLeefzonePresetToe() {
  const preset =
    leefzonePresetEl.value;

  const hoogte =
    plotInformation
      ? plotInformation.length_z
      : 2.5;

  if (preset === "en16798") {
    leefzoneZMinEl.value =
      "0.05";

    leefzoneZMaxEl.value =
      "1.80";

    leefzoneWandafstandEl.value =
      "0.50";

  } else if (preset === "zittend") {
    leefzoneZMinEl.value =
      "0.05";

    leefzoneZMaxEl.value =
      "1.30";

    leefzoneWandafstandEl.value =
      "0.50";

  } else if (preset === "staand") {
    leefzoneZMinEl.value =
      "0.05";

    leefzoneZMaxEl.value =
      "1.80";

    leefzoneWandafstandEl.value =
      "0.50";

  } else if (preset === "volledig") {
    leefzoneZMinEl.value =
      "0.00";

    leefzoneZMaxEl.value =
      hoogte.toFixed(2);

    leefzoneWandafstandEl.value =
      "0.00";
  }
}


function updateLeefzoneVelden() {
  const actief =
    leefzoneActiefEl.checked;

  leefzoneVeldenEl.style.display =
    actief ? "block" : "none";

  leefzonePresetEl.disabled =
    !actief;

  leefzoneZMinEl.disabled =
    !actief;

  leefzoneZMaxEl.disabled =
    !actief;

  leefzoneWandafstandEl.disabled =
    !actief;
}


function slaLeefzoneInstellingenOp() {
  const instellingen = {
    actief: leefzoneActiefEl.checked,
    preset: leefzonePresetEl.value,
    z_min: leefzoneZMinEl.value,
    z_max: leefzoneZMaxEl.value,
    wandafstand: leefzoneWandafstandEl.value
  };

  localStorage.setItem(
    LEEFZONE_STORAGE_KEY,
    JSON.stringify(instellingen)
  );
}


function laadLeefzoneInstellingen() {
  const opgeslagenInstellingen =
    localStorage.getItem(LEEFZONE_STORAGE_KEY);

  if (!opgeslagenInstellingen) {
    return;
  }

  try {
    const instellingen =
      JSON.parse(opgeslagenInstellingen);

    if (instellingen.actief !== undefined) {
      leefzoneActiefEl.checked =
        Boolean(instellingen.actief);
    }

    if (instellingen.preset !== undefined) {
      leefzonePresetEl.value =
        instellingen.preset;
    }

    if (instellingen.z_min !== undefined) {
      leefzoneZMinEl.value =
        instellingen.z_min;
    }

    if (instellingen.z_max !== undefined) {
      leefzoneZMaxEl.value =
        instellingen.z_max;
    }

    if (instellingen.wandafstand !== undefined) {
      leefzoneWandafstandEl.value =
        instellingen.wandafstand;
    }

  } catch (error) {
    console.error(
      "Leefzone-instellingen konden niet worden geladen.",
      error
    );

    localStorage.removeItem(
      LEEFZONE_STORAGE_KEY
    );
  }
}


function handleLeefzoneInputGewijzigd() {
  updateLeefzoneVelden();
  slaLeefzoneInstellingenOp();

  if (!plotInformation) {
    return;
  }

  clearTimeout(leefzoneTimer);

  leefzoneTimer =
    setTimeout(
      () => {
        generatePlot();
      },
      400
    );
}


function getLeefzoneInstellingen() {
  if (!leefzoneActiefEl.checked) {
    return {
      actief: false,
      preset: "uit"
    };
  }

  const zMin =
    Number(leefzoneZMinEl.value);

  const zMax =
    Number(leefzoneZMaxEl.value);

  const wandafstand =
    Number(leefzoneWandafstandEl.value);

  const ruimteHoogte =
    plotInformation
      ? plotInformation.length_z
      : zMax;

  const ruimteLengte =
    plotInformation
      ? plotInformation.length_x
      : 0;

  const ruimteBreedte =
    plotInformation
      ? plotInformation.length_y
      : 0;

  if (!Number.isFinite(zMin) || zMin < 0) {
    throw new Error(
      "De ondergrens van de leefzone moet minimaal 0 m zijn."
    );
  }

  if (!Number.isFinite(zMax) || zMax <= zMin) {
    throw new Error(
      "De bovengrens van de leefzone moet groter zijn dan de ondergrens."
    );
  }

  if (zMax > ruimteHoogte) {
    throw new Error(
      `De bovengrens van de leefzone mag niet hoger zijn dan de ruimtehoogte (${ruimteHoogte.toFixed(2)} m).`
    );
  }

  if (!Number.isFinite(wandafstand) || wandafstand < 0) {
    throw new Error(
      "De wandafstand van de leefzone moet minimaal 0 m zijn."
    );
  }

  if (ruimteLengte > 0 && wandafstand * 2 >= ruimteLengte) {
    throw new Error(
      "De wandafstand is te groot voor de lengte van de ruimte."
    );
  }

  if (ruimteBreedte > 0 && wandafstand * 2 >= ruimteBreedte) {
    throw new Error(
      "De wandafstand is te groot voor de breedte van de ruimte."
    );
  }

  return {
    actief: true,
    preset: leefzonePresetEl.value,
    z_min: zMin,
    z_max: zMax,
    wandafstand: wandafstand
  };
}


function getLeefzoneQueryString() {
  const leefzone =
    getLeefzoneInstellingen();

  const params =
    new URLSearchParams();

  params.set(
    "leefzone_actief",
    leefzone.actief ? "true" : "false"
  );

  params.set(
    "leefzone_preset",
    leefzone.preset || "uit"
  );

  if (leefzone.actief) {
    params.set(
      "leefzone_z_min",
      String(leefzone.z_min)
    );

    params.set(
      "leefzone_z_max",
      String(leefzone.z_max)
    );

    params.set(
      "leefzone_wandafstand",
      String(leefzone.wandafstand)
    );
  }

  return `&${params.toString()}`;
}


async function loadPlotInformation() {
  statusEl.textContent =
    "Plotinformatie laden...";

  informatieEl.textContent =
    "";

  plotAfbeelding.style.display =
    "none";

  if (leefzoneResultatenEl) {
    leefzoneResultatenEl.style.display =
      "none";

    leefzoneResultatenEl.textContent =
      "";
  }

  verbergSliceOverview();

  try {
    const response =
      await fetch(
        `${API_URL}/plot-info?t=${Date.now()}`
      );

    if (!response.ok) {
      const foutTekst =
        await response.text();

      throw new Error(
        `HTTP-fout ${response.status}: ${foutTekst}`
      );
    }

    plotInformation =
      await response.json();

    vulPlotTypes();
    updateSliceOptions();
    updateVectorScaleVisibility();
    updateSpeedThresholdVisibility();
    updateInformatieTekst();

    statusEl.textContent =
      "Plotinformatie geladen.";

    generatePlot();

  } catch (error) {
    statusEl.textContent =
      "Fout";

    informatieEl.textContent =
      error.message;

    console.error(error);
  }
}


function vulPlotTypes() {
  plotTypeEl.innerHTML =
    "";

  for (const plotType of plotInformation.plot_types) {
    const option =
      document.createElement("option");

    option.value =
      plotType.number;

    option.textContent =
      `${plotType.number} - ${plotType.name}`;

    plotTypeEl.appendChild(
      option
    );
  }
}


function getSelectedPlotTypeData() {
  const plotType =
    Number(plotTypeEl.value);

  return plotInformation.plot_types.find(
    (item) => item.number === plotType
  );
}


function updateSliceOptions() {
  if (!plotInformation) {
    return;
  }

  const plotTypeData =
    getSelectedPlotTypeData();

  sliceIndexEl.innerHTML =
    "";

  if (
    !plotTypeData ||
    plotTypeData.slice_axis === null
  ) {
    sliceContainer.style.display =
      "none";

    verbergSliceOverview();

    return;
  }

  let maximum =
    0;

  let label =
    "";

  let hulp =
    "";

  if (plotTypeData.slice_axis === "x") {
    maximum =
      plotInformation.ni - 2;

    label =
      "x-cel";

    hulp =
      "Zijaanzicht y-z bij een gekozen x-positie.";

  } else if (plotTypeData.slice_axis === "y") {
    maximum =
      plotInformation.nj - 2;

    label =
      "y-cel";

    hulp =
      "Vooraanzicht x-z bij een gekozen y-positie.";

  } else if (plotTypeData.slice_axis === "z") {
    maximum =
      plotInformation.nk - 2;

    label =
      "z-cel";

    hulp =
      "Bovenaanzicht x-y bij een gekozen z-positie.";
  }

  for (
    let index = 1;
    index <= maximum;
    index += 1
  ) {
    const option =
      document.createElement("option");

    option.value =
      index;

    option.textContent =
      `${label} ${index}`;

    sliceIndexEl.appendChild(
      option
    );
  }

  const midden =
    Math.max(
      1,
      Math.round(maximum / 2)
    );

  sliceIndexEl.value =
    String(midden);

  sliceHelpEl.textContent =
    hulp;

  sliceContainer.style.display =
    "grid";
}


function updateVectorScaleVisibility() {
  const plotType =
    Number(plotTypeEl.value);

  if (is3DPlot(plotType)) {
    vectorScaleContainer.style.display =
      "block";

  } else {
    vectorScaleContainer.style.display =
      "none";
  }
}


function updateSpeedThresholdVisibility() {
  const plotType =
    Number(plotTypeEl.value);

  if (isSpeedPlot(plotType)) {
    speedThresholdContainer.style.display =
      "block";

  } else {
    speedThresholdContainer.style.display =
      "none";
  }
}


function updateInformatieTekst() {
  informatieEl.textContent =
    `Grid inclusief randcellen: ` +
    `${plotInformation.ni} × ` +
    `${plotInformation.nj} × ` +
    `${plotInformation.nk}\n` +
    `Fysieke afmetingen: ` +
    `${plotInformation.length_x.toFixed(3)} × ` +
    `${plotInformation.length_y.toFixed(3)} × ` +
    `${plotInformation.length_z.toFixed(3)} m\n` +
    `Celgrootte: ` +
    `${plotInformation.dx.toFixed(3)} m`;
}


async function generateSliceOverview(
  plotType,
  plotTypeData
) {
  if (!isSlicePlot(plotTypeData)) {
    verbergSliceOverview();
    return;
  }

  try {
    const overviewUrl =
      `${API_URL}/slice-overview?plot_type=${plotType}` +
      `&slice_index=${Number(sliceIndexEl.value)}` +
      getLeefzoneQueryString() +
      `&t=${Date.now()}`;

    const response =
      await fetch(overviewUrl);

    if (!response.ok) {
      throw new Error(
        `HTTP-fout ${response.status} bij doorsnede-overzicht.`
      );
    }

    const blob =
      await response.blob();

    const imageUrl =
      URL.createObjectURL(blob);

    sliceOverviewAfbeelding.onload =
      () => {
        URL.revokeObjectURL(imageUrl);
      };

    sliceOverviewAfbeelding.src =
      imageUrl;

    sliceOverviewContainer.style.display =
      "block";

    sliceOverviewAfbeelding.style.display =
      "block";

  } catch (error) {
    verbergSliceOverview();
    console.error(error);
  }
}


async function updateLeefzoneResultaten() {
  if (!leefzoneResultatenEl) {
    return;
  }

  try {
    const response =
      await fetch(
        `${API_URL}/leefzone-summary?` +
        getLeefzoneQueryString().slice(1) +
        `&t=${Date.now()}`
      );

    if (!response.ok) {
      throw new Error(
        `HTTP-fout ${response.status} bij leefzone-resultaten.`
      );
    }

    const data =
      await response.json();

    if (!data.leefzone_actief) {
      leefzoneResultatenEl.textContent =
        "Leefzone is uitgeschakeld voor deze post-processingweergave.";

      leefzoneResultatenEl.style.display =
        "block";

      return;
    }

    if (!data.leefzone_geldig) {
      leefzoneResultatenEl.textContent =
        "Leefzone actief, maar er vallen geen geldige cellen binnen de ingestelde zone.";

      leefzoneResultatenEl.style.display =
        "block";

      return;
    }

    const leefzone =
      data.leefzone;

    leefzoneResultatenEl.textContent =
      `Leefzone-resultaten\n` +
      `Preset: ${leefzone.preset}\n` +
      `Grenzen: z ${leefzone.z_min.toFixed(2)}-${leefzone.z_max.toFixed(2)} m, ` +
      `wandafstand ${leefzone.wandafstand.toFixed(2)} m\n` +
      `Aantal cellen in leefzone: ${data.aantal_cellen}\n` +
      `Gemiddelde snelheid: ${data.gemiddelde_snelheid.toFixed(3)} m/s\n` +
      `Maximale snelheid: ${data.maximale_snelheid.toFixed(3)} m/s\n` +
      `Cellen boven 0.20 m/s: ${data.percentage_boven_0_20.toFixed(1)} %\n` +
      `Cellen boven 0.30 m/s: ${data.percentage_boven_0_30.toFixed(1)} %`;

    leefzoneResultatenEl.style.display =
      "block";

  } catch (error) {
    leefzoneResultatenEl.textContent =
      error.message;

    leefzoneResultatenEl.style.display =
      "block";

    console.error(error);
  }
}


async function generatePlot() {
  if (!plotInformation) {
    return;
  }

  const plotType =
    Number(plotTypeEl.value);

  const plotTypeData =
    getSelectedPlotTypeData();

  if (!plotTypeData) {
    statusEl.textContent =
      "Geen geldig plottype gekozen.";

    return;
  }

  if (btnGenereerPlot) {
    btnGenereerPlot.disabled =
      true;
  }

  statusEl.textContent =
    "Plot genereren...";

  try {
    let plotUrl =
      `${API_URL}/plot?plot_type=${plotType}`;

    if (plotTypeData.slice_axis !== null) {
      plotUrl +=
        `&slice_index=${Number(sliceIndexEl.value)}`;
    }

    if (is3DPlot(plotType)) {
      plotUrl +=
        `&vector_scale=${Number(vectorScaleEl.value)}`;
    }

    if (isSpeedPlot(plotType)) {
      plotUrl +=
        `&speed_threshold=${Number(speedThresholdEl.value)}`;
    }

    plotUrl +=
      getLeefzoneQueryString();

    plotUrl +=
      `&t=${Date.now()}`;

    const response =
      await fetch(plotUrl);

    if (!response.ok) {
      const foutTekst =
        await response.text();

      throw new Error(
        `HTTP-fout ${response.status}: ${foutTekst}`
      );
    }

    const blob =
      await response.blob();

    const imageUrl =
      URL.createObjectURL(blob);

    plotAfbeelding.onload =
      () => {
        URL.revokeObjectURL(imageUrl);
      };

    plotAfbeelding.src =
      imageUrl;

    plotAfbeelding.style.display =
      "block";

    await generateSliceOverview(
      plotType,
      plotTypeData
    );

    await updateLeefzoneResultaten();

    statusEl.textContent =
      "Plot klaar.";

  } catch (error) {
    statusEl.textContent =
      "Fout";

    informatieEl.textContent =
      error.message;

    plotAfbeelding.style.display =
      "none";

    if (leefzoneResultatenEl) {
      leefzoneResultatenEl.style.display =
        "none";
    }

    verbergSliceOverview();

    console.error(error);

  } finally {
    if (btnGenereerPlot) {
      btnGenereerPlot.disabled =
        false;
    }
  }
}
