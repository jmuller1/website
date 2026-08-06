// const API_URL = "http://127.0.0.1:8000";
const API_URL = "https://api.jmuller.be";

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

const vectorScaleContainer =
  document.getElementById("vectorScaleContainer");

const vectorScaleEl =
  document.getElementById("vectorScale");

const vectorScaleValueEl =
  document.getElementById("vectorScaleValue");

let plotInformation =
  null;

let vectorScaleTimer =
  null;


btnGenereerPlot.addEventListener(
  "click",
  generatePlot
);

plotTypeEl.addEventListener(
  "change",
  () => {
    updateSliceOptions();
    updateVectorScaleVisibility();
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


loadPlotInformation();


function is3DPlot(plotType) {
  return plotType === 10 || plotType === 11;
}


async function loadPlotInformation() {
  statusEl.textContent =
    "Plotinformatie laden...";

  informatieEl.textContent =
    "";

  plotAfbeelding.style.display =
    "none";

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

  btnGenereerPlot.disabled =
    true;

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

    statusEl.textContent =
      "Plot klaar.";

  } catch (error) {
    statusEl.textContent =
      "Fout";

    informatieEl.textContent =
      error.message;

    plotAfbeelding.style.display =
      "none";

    console.error(error);

  } finally {
    btnGenereerPlot.disabled =
      false;
  }
}