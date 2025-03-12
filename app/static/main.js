"use strict";

let molstar = ContextModel;

function init_results(structure_url, warnings) {
  (async () => {
    await ContextModel.init();
    await load(structure_url, warnings);
  })().then(
    () => {},
    (error) => {
      console.error("Mol* initialization ❌", error);
    }
  );
}

async function load(structure_url, warnings) {
  await molstar.load(structure_url);

  await molstar.type.default();
  await molstar.type.showMembraneOrientation(true);
  await molstar.behavior.setWarnings(warnings);

  resetRange();
  updateRelativeColor();
  mountTypeControls();
  mountColorControls();
}

function mountTypeControls() {
  const cartoon = document.getElementById("view_cartoon");
  const surface = document.getElementById("view_surface");
  const bas = document.getElementById("view_bas");
  const showWater = document.getElementById("show_water");
  const showMembrane = document.getElementById("show_membrane_orientation");
  
  if (!cartoon || !surface || !bas || !showWater || !showMembrane) {
    console.error("View controls not found");
    return;
  };
  
  cartoon.onclick = async () => await updateDefaultType();
  surface.onclick = async () => await updateSurfaceType();
  bas.onclick = async () => await updateBallAndStickType();
  showWater.onclick = async (e) => await updateShowWater(e.target.checked);
  showMembrane.onclick = async (e) => await updateShowMembrane(e.target.checked);

  showWater.parentElement.style.visibility = molstar.type.hasWater() ? 'visible' : 'hidden'
  showMembrane.parentElement.style.visibility = 'visible'

  // molstar.state.loadingStatus.subscribe((loadingStatus) => {    
  //   cartoon.disabled = loadingStatus.kind === 'loading'
  //   surface.disabled = loadingStatus.kind === 'loading'
  //   bas.disabled = loadingStatus.kind === 'loading'
  //   showWater.disabled = loadingStatus.kind === 'loading'
  // })
}

async function updateDefaultType() {
  await molstar.type.default();
}

async function updateSurfaceType() {
  await molstar.type.surface();
}

async function updateBallAndStickType() {
  await molstar.type.ballAndStick();
}

async function updateShowWater(visible) {
  await molstar.type.setWaterVisibility(visible);
}

async function updateShowMembrane(visible) {
  await molstar.type.showMembraneOrientation(visible);
}

function mountColorControls() {
  const structureChain = document.getElementById("colors_structure_chain_id");
  const structureUniform = document.getElementById("colors_structure_uniform");
  const relative = document.getElementById("colors_relative");
  const absolute = document.getElementById("colors_absolute");
  const chargesSmoothing = document.getElementById("charges_smoothing");
  const range = document.getElementById("max_value");
  const reset = document.getElementById("reset_max_charge");
  
  if (
        !structureChain ||
        !structureUniform ||
        !relative ||
        !absolute ||
        !chargesSmoothing ||
        !range ||
        !reset
    ) {
    console.error("Color controls not found");
    return;
  }
  
  structureChain.onclick = async () => await updateDefaultColor('chain-id');
  structureUniform.onclick = async () => await updateDefaultColor('uniform');
  relative.onclick = async () => await updateRelativeColor();
  absolute.onclick = async () => await updateAbsoluteColor();
  chargesSmoothing.onclick = async (e) => await updateChargesSmoothing(e.target.checked);
  range.oninput = async () => await updateRange();
  reset.onclick = async () => await resetRange();

  // molstar.state.loadingStatus.subscribe((loadingStatus) => {    
  //   structureChain.disabled = loadingStatus.kind === 'loading'
  //   structureUniform.disabled = loadingStatus.kind === 'loading'
  //   relative.disabled = loadingStatus.kind === 'loading'
  //   absolute.disabled = loadingStatus.kind === 'loading'
  //   range.disabled = loadingStatus.kind === 'loading'
  //   reset.disabled = loadingStatus.kind === 'loading'
  // })
}

async function updateDefaultColor(carbonColor) {
  const input = document.getElementById("max_value");
  if (!input) return;
  input.setAttribute("disabled", "true");
  await molstar.color.default(carbonColor);
}

function roundMaxCharge(charge) {
  return Number(charge.toFixed(2))
}

async function resetRange() {
  const input = document.getElementById("max_value");
  if (!input) {
    console.error("Max value input not found");
    return;
  }
  const maxCharge = molstar.charges.getMaxCharge();
  input.value = roundMaxCharge(maxCharge);
  if (!input.hasAttribute("disabled")) {
    await updateRange();
  }
}

async function updateRelativeColor() {
  const input = document.getElementById("max_value");
  if (!input) {
    console.error("Max value input not found");
    return;
  }
  input.setAttribute("disabled", "true");
  await molstar.color.relative();
}

async function updateAbsoluteColor() {
  const input = document.getElementById("max_value");
  if (!input) {
    console.error("Max value input not found");
    return;
  }
  input.removeAttribute("disabled");
  await updateRange();
}

async function updateChargesSmoothing(useSmoothing) {
  await molstar.color.setChargesSmoothing(useSmoothing);
}

async function updateRange() {
  const input = document.getElementById("max_value");
  if (!input) {
    console.error("Max value input not found");
    return;
  }
  let value = Number(input.value);
  if (isNaN(value)) return;
  if (value < 0) {
    value = 0;
  } else {
    value = roundMaxCharge(value);
  }
  input.value = value;
  await molstar.color.absolute(value);
}

function addProblematicAtoms(problematicAtoms) {
  const span = document.getElementById("problematic_atoms");
  if (!span) return;
  Object.keys(problematicAtoms).forEach((id, i) => {
    const button = createProblematicAtomButton(
            id,
            problematicAtoms[id].key
        );
    const tooltip = createProblematicAtomTooltip(
            problematicAtoms[id].message
        );
    span.appendChild(button);
    span.appendChild(tooltip);
    if (i < Object.keys(problematicAtoms).length - 1) {
      const text = document.createTextNode(", ");
      span.appendChild(text);
    }
  });
}

function createProblematicAtomButton(id, key) {
  const button = document.createElement("button");
  button.id = id;
  button.className = "btn btn-link p-0 font-weight-bold";
  button.onclick = () => molstar.visual.focus(key);
  button.textContent = id;
  return button;
}

function createProblematicAtomTooltip(message) {
  const tooltip = document.createElement("i");
  tooltip.className = "bi bi-question";
  tooltip.setAttribute("data-toggle", "tooltip");
  tooltip.setAttribute("data-placement", "top");
  tooltip.setAttribute("title", message);
  return tooltip;
}


