// const API_URL = "http://127.0.0.1:8000";
const API_URL = "http://178.104.112.10";
const plotTypeEl = document.getElementById("plotType");
const sliceIndexEl = document.getElementById("sliceIndex");
const btnGenereerPlot = document.getElementById(
  "btnGenereerPlot"
);
const statusEl = document.getElementById("status");
const resultaatAfbeelding = document.getElementById(
  "resultaatAfbeelding"
);

let plotInformation = null;


plotTypeEl.addEventListener(
  "change",
  updateSliceOptions
);

btnGenereerPlot.addEventListener(
  "click",
  generatePlot
);

loadPlotInformation();


async function loadPlotInformation() {
  try {
    const response = await fetch(
      `${API_URL}/plot-info`
    );

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(
        `HTTP-fout ${response.status}: ${errorText}`
      );
    }

    plotInformation = await response.json();

    fillPlotTypeOptions();

    statusEl.textContent =
      `Resultaatdata geladen.\n` +
      `Gridgrootte: ` +
      `${plotInformation.ni} × ` +
      `${plotInformation.nj} × ` +
      `${plotInformation.nk}`;

    btnGenereerPlot.disabled = false;

  } catch (error) {
    statusEl.textContent =
      "Plotinformatie kon niet worden geladen.\n" +
      error.message;

    console.error(error);
  }
}


function fillPlotTypeOptions() {
  plotTypeEl.innerHTML = "";

  for (const plotType of plotInformation.plot_types) {
    const option = document.createElement("option");

    option.value = plotType.number;

    option.textContent =
      `${plotType.number} - ${plotType.name}`;

    option.dataset.sliceAxis =
      plotType.slice_axis ?? "";

    plotTypeEl.appendChild(option);
  }

  updateSliceOptions();
}


function updateSliceOptions() {
  const selectedOption =
    plotTypeEl.options[plotTypeEl.selectedIndex];

  if (!selectedOption) {
    sliceIndexEl.disabled = true;

    sliceIndexEl.innerHTML =
      '<option value="">Niet van toepassing</option>';

    return;
  }

  const sliceAxis =
    selectedOption.dataset.sliceAxis;

  sliceIndexEl.innerHTML = "";

  if (!sliceAxis) {
    sliceIndexEl.disabled = true;

    const option =
      document.createElement("option");

    option.value = "";
    option.textContent = "Niet van toepassing";

    sliceIndexEl.appendChild(option);

    return;
  }

  sliceIndexEl.disabled = false;

  let maximum;

  if (sliceAxis === "x") {
    maximum = plotInformation.ni - 2;

  } else if (sliceAxis === "y") {
    maximum = plotInformation.nj - 2;

  } else if (sliceAxis === "z") {
    maximum = plotInformation.nk - 2;

  } else {
    throw new Error(
      `Onbekende doorsnede-as: ${sliceAxis}`
    );
  }

  const minimum = 1;

  for (
    let sliceIndex = minimum;
    sliceIndex <= maximum;
    sliceIndex += 1
  ) {
    const option =
      document.createElement("option");

    option.value = sliceIndex;

    option.textContent =
      `${sliceAxis} = ${sliceIndex}`;

    sliceIndexEl.appendChild(option);
  }

  const middleIndex = Math.floor(
    sliceIndexEl.options.length / 2
  );

  sliceIndexEl.selectedIndex = middleIndex;
}


async function generatePlot() {
  const selectedOption =
    plotTypeEl.options[plotTypeEl.selectedIndex];

  if (!selectedOption) {
    statusEl.textContent =
      "Kies eerst een plottype.";

    return;
  }

  const plotType =
    Number(selectedOption.value);

  const sliceAxis =
    selectedOption.dataset.sliceAxis;

  let sliceIndex = null;

  if (sliceAxis) {
    sliceIndex =
      Number(sliceIndexEl.value);
  }

  btnGenereerPlot.disabled = true;
  plotTypeEl.disabled = true;
  sliceIndexEl.disabled = true;

  resultaatAfbeelding.style.display = "none";

  statusEl.textContent =
    "Resultaatplot wordt gegenereerd...";

  const payload = {
    plot_type: plotType,
    slice_index: sliceIndex
  };

  try {
    const response = await fetch(
      `${API_URL}/generate-result-plot`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(
        `HTTP-fout ${response.status}: ${errorText}`
      );
    }

    const data = await response.json();

    resultaatAfbeelding.src =
      `${API_URL}${data.plot_url}?t=${Date.now()}`;

    resultaatAfbeelding.style.display = "block";

    statusEl.textContent =
      "Resultaatplot is gereed.";

  } catch (error) {
    statusEl.textContent =
      "De resultaatplot kon niet worden gemaakt.\n" +
      error.message;

    console.error(error);

  } finally {
    btnGenereerPlot.disabled = false;
    plotTypeEl.disabled = false;

    updateSliceOptions();
  }
}