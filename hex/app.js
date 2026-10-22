// Local: http://127.0.0.1:8001  |  Live: https://hex-api.jmuller.be (set when deployed)
const API_URL = 'https://hex-api.jmuller.be';
// const API_URL = 'https://hex-api.jmuller.be';
const NTU_MODE = /(?:^|\/)ntu\.html$/i.test(window.location.pathname);
const state = { data: null, inputs: {}, refreshSeq: 0, refreshTimer: null, lastNTU: null, manualHistory: [] };
const $ = id => document.getElementById(id);
function format(value, significant = 4) {
  if (value === null || value === undefined || value === '') return 'â€”';
  if (typeof value === 'string' && isNaN(Number(value))) return value;
  const n = Number(value);
  if (!Number.isFinite(n)) return 'â€”';
  return n.toLocaleString('en-US', {
    maximumSignificantDigits: significant,
    useGrouping: false
  });
}

// Number inputs require decimal points, regardless of the UI locale.
function numericInput(value, significant = 5) {
  if (value === null || value === undefined || value === '') return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  // Input type="number" needs a decimal point. Avoid scientific notation and
  // long floating-point tails while keeping the unrounded value in state.inputs.
  return n.toLocaleString('en-US', {
    maximumSignificantDigits: significant,
    useGrouping: false
  });
}
// The calculation state retains full precision; input formatting only affects the display.
// De originele Bellâ€“Delaware-rekenmotor blijft in de historische eenheden.
// Alleen de Îµ-NTU-pagina presenteert en accepteert SI-eenheden.
const SI_FACTORS = {
  // kg/h blijft kg/h.
  '14':.001,'17':.001,'26':.001,'29':.001, // cP -> Pa.s
  '15':4184,'27':4184, // kcal/kg/K -> J/kg/K
  '16':4184/3600,'28':4184/3600, // kcal/m/h/K -> W/m/K
  '18':100000,'30':100000, // bar -> Pa
  '19':3600/4184,'31':3600/4184, // mÂ².h.K/kcal -> mÂ².K/W
  // Geometrische millimeters blijven millimeters.
};
const toDisplay=(row,v)=> NTU_MODE && SI_FACTORS[String(row)] && v!==null ? Number(v)*SI_FACTORS[String(row)]:v;
const toLegacy=(row,v)=> NTU_MODE && SI_FACTORS[String(row)] ? Number(v)/SI_FACTORS[String(row)]:v;
// Preserve the original engineering terminology (English).
const translate = text => String(text);
const unitDisplay=(row,old)=>{
  if(!NTU_MODE)return old;
  if(['10','22'].includes(String(row)))return 'kg/h';
  if(['14','17','26','29'].includes(String(row)))return 'PaÂ·s';
  if(['15','27'].includes(String(row)))return 'J/(kgÂ·K)';
  if(['16','28'].includes(String(row)))return 'W/(mÂ·K)';
  if(['18','30'].includes(String(row)))return 'Pa';
  if(['19','31'].includes(String(row)))return 'mÂ²Â·K/W';
  if(['40','42','43','46','53','54','55','56','57','58','60','61','63','64'].includes(String(row)))return 'mm';
  return old;
};
const LEGACY_RESULT_FACTOR={
  'kcal/h':4184/3600,'Kcal/h':4184/3600,
  'Kcal/mÂ².h.Â°C':4184/3600,'Kcal/mÂ².h.K':4184/3600,
  'bar':100000,'kcal/(mÂ²Â·hÂ·K)':4184/3600
};
function displayedResult(row){
  let out={...row,label:translate(row.label)};
  if(!NTU_MODE)return out;
  const unit=String(row.unit||'').trim();
  const num=Number(row.value);
  if(row.value==null || !Number.isFinite(num))return out;
  // Alle voor het oorspronkelijke model gebruikte imperial/calorische
  // eenheden expliciet converteren voor de SI-resultatenweergave.
  if(/mÂ²[.Â·]h.*kcal/i.test(unit)){out.value=num*3600/4184;out.unit='mÂ²Â·K/W';}
  else if(/kcal/i.test(unit)){
    if(/kg/i.test(unit)){out.value=num*4184;out.unit='J/(kgÂ·K)';}
    else if(/mÂ²|m2/i.test(unit)){out.value=num*4184/3600;out.unit='W/(mÂ²Â·K)';}
    else if(/m[.Â·\/]/i.test(unit)){out.value=num*4184/3600;out.unit='W/(mÂ·K)';}
    else if(/h/i.test(unit)){out.value=num*4184/3600;out.unit='W';}
  } else if(/bar/i.test(unit)){out.value=num*100000;out.unit='Pa';}
  else if(/cp/i.test(unit)){out.value=num*.001;out.unit='PaÂ·s';}
  else if(/kg\/h/i.test(unit)){out.unit='kg/h';}
  else if(unit==='mm'){out.unit='mm';}
  return out;
}
const SIDE_ROWS={hot:['13','14','15','16','17'],cold:['25','26','27','28','29']};
function propertyMode(side){return NTU_MODE ? ($(side+'PropertyMode')?.value||'manual'):'manual';}
function propertySettings(){
  if(!NTU_MODE)return {};
  const result={};for(const side of ['hot','cold'])result[side]={mode:propertyMode(side),fluid:$(side+'Fluid').value,pressure_pa:Number($(side+'Pressure').value)*100000};
  return result;
}
function updatePropertyMode(){
  if(!NTU_MODE)return;
  for(const side of ['hot','cold']){
    const db=propertyMode(side)==='database';$(side+'FluidOptions').hidden=!db;
    for(const id of SIDE_ROWS[side]){
      const el=$('field-'+id);if(el){el.readOnly=db;el.closest('.field')?.classList.toggle('derived',db);}
    }
  }
  invalidateNTU();
}
function invalidateNTU(){
  if(!NTU_MODE)return;
  $('results').hidden=true;state.lastNTU=null;state.manualHistory=[];
  $('feedbackBtn').disabled=true;$('feedbackHistory').hidden=true;$('feedbackHistoryRows').replaceChildren();
}

function errorMessage(msg) { $('message').textContent=msg || ''; }
function populateDefaults() {
 const c=state.data;
 state.refreshSeq++; clearTimeout(state.refreshTimer);
 state.inputs={}; $('inputPanel').innerHTML=''; $('results').hidden=true; if (NTU_MODE) { $('ntuResults').hidden=true; state.lastNTU=null; state.manualHistory=[]; $('feedbackBtn').disabled=true; $('feedbackHistory').hidden=true; $('feedbackHistoryRows').replaceChildren(); } errorMessage('');
 for (const group of state.data.sections) {
  const card=document.createElement('section');card.className='card';
  const title=document.createElement('div');title.className='section-title';title.innerHTML=`<h3>${translate(group.title)}</h3><span>${group.rows.length} parameters</span>`;card.appendChild(title);
  for(const row of group.rows){
   const field=c.fields[String(row)];if(!field) continue;
   const wrapper=document.createElement('div');wrapper.className='field'+(!field.editable?' derived':'');
   const label=document.createElement('label');label.htmlFor='field-'+row;label.textContent=NTU_MODE && row===12?'Assumed hot outlet temperature â€” feedback input':NTU_MODE && row===24?'Cold outlet â€” Bellâ€“Delaware energy balance':translate(field.label);
   let input;
   if(field.select && field.editable){
    input=document.createElement('select');
    if(field.value===null){const blank=document.createElement('option');blank.value='';blank.textContent='Not specified';input.appendChild(blank)}
    for (const val of field.select) {
	const opt = document.createElement('option');

	opt.value = String(val);

	// Nederlandse decimale notatie voor numerieke opties
	opt.textContent = typeof val === 'number'
		? val.toLocaleString('nl-NL', {
		useGrouping: false,
			maximumFractionDigits: 6
		})
		: val;
	input.appendChild(opt);
}
    input.value=field.value===null?'':String(field.value);
   }else{
    input=document.createElement('input');input.type=field.editable?'number':'text';input.step='any';
    input.value=field.value===null?'':(field.editable?(NTU_MODE ? numericInput(toDisplay(row,field.value), 5) : String(toDisplay(row,field.value))):format(toDisplay(row,field.value)));input.readOnly=!field.editable;
   }
   input.id='field-'+row;input.dataset.row=String(row);
   if(field.editable){
    state.inputs[String(row)]=field.value;
    input.addEventListener('input',()=>{state.inputs[String(row)]=input.value===''?'':toLegacy(row,input.value); $('results').hidden=true; if (NTU_MODE) {state.lastNTU=null;state.manualHistory=[];$('feedbackBtn').disabled=true;$('feedbackHistory').hidden=true;$('feedbackHistoryRows').replaceChildren();} $('calculationStatus').textContent='Inputs updated; derived values are refreshing.';scheduleDerivedUpdate();});
   }
   const unit=document.createElement('span');unit.className='unit';unit.textContent=unitDisplay(row,field.unit);
   wrapper.append(label,input,unit);card.appendChild(wrapper);
  }
  $('inputPanel').appendChild(card);
 }
 $('calculationStatus').textContent='Default values loaded.'; scheduleDerivedUpdate();
}
function fillRows(elementId, rows){
 $(elementId).replaceChildren();
 for(const source of rows){const row=displayedResult(source);const tr=document.createElement('tr');for(const v of [row.label,row.symbol,format(row.value),row.unit]){const td=document.createElement('td');td.textContent=v||'â€”';tr.appendChild(td)}$(elementId).appendChild(tr)}
}
function showResults(data){
 $('results').hidden=false;$('resultsTitle').textContent='Calculation results';
 const metrics=[['Heat duty',70],['Available area',73],['Shell pressure drop',217],['Tube pressure drop',219]];
 $('keyMetrics').replaceChildren();
 for(const [heading, row] of metrics){
  const item=data.summary.find(x=>x.row===row);if(!item)continue;
  const card=document.createElement('div');card.className='metric';
  const title=document.createElement('span');title.textContent=translate(heading);
  const val=document.createElement('strong');val.textContent=format(displayedResult(item).value);
  const unit=document.createElement('em');unit.textContent=displayedResult(item).unit;
  card.append(title,val,unit);$('keyMetrics').appendChild(card);
 }
 fillRows('summaryRows',data.summary);
 $('detailedGroups').replaceChildren();
 for(const group of data.details){
  const detail=document.createElement('details');const summary=document.createElement('summary');
  summary.textContent=`${translate(group.name)} (${group.items.length} results)`;detail.appendChild(summary);
  const table=document.createElement('table');const tbody=document.createElement('tbody');
  for(const source of group.items){const item=displayedResult(source);const tr=document.createElement('tr');
   for(const txt of [item.label,item.symbol,format(item.value),item.unit]){const td=document.createElement('td');td.textContent=txt||'â€”';tr.appendChild(td)}tbody.appendChild(tr)}
  table.appendChild(tbody);detail.appendChild(table);$('detailedGroups').appendChild(detail);
 }
 for(const [row,value] of Object.entries(data.derived)){
  const el=$('field-'+row);if(el && el.readOnly)el.value=value===null?'':format(toDisplay(row,value));
 }
 if (NTU_MODE && data.ntu) { showNTU(data.ntu); showFluids(data); recordManualStep(data.ntu); }
  $('calculationStatus').textContent='Calculation completed on the backend.';
 $('results').scrollIntoView({behavior:'smooth',block:'start'});
}
function showNTU(x) {
  const items = [
    ['Hot capacity rate',x.capacity_hot*4184/3600,'W/K'],['Cold capacity rate',x.capacity_cold*4184/3600,'W/K'],
    ['C minimum',x.capacity_min*4184/3600,'W/K'],['C maximum',x.capacity_max*4184/3600,'W/K'],
    ['Capacity ratio Cr',x.capacity_ratio,'â€”'],['Fouled overall U',x.overall_u_dirty*4184/3600,'W/(mÂ²Â·K)'],
    ['Available area',x.area_available,'mÂ²'],['UA',x.ua*4184/3600,'W/K'],
    ['NTU',x.ntu,'â€”'],['Effectiveness Îµ',x.effectiveness,'â€”'],
    ['Maximum heat duty',x.q_max*4184/3600,'W'],['Predicted heat duty',x.heat_duty*4184/3600,'W'],
    ['Predicted hot outlet temperature',x.hot_outlet_temperature,'Â°C'],
    ['Predicted cold outlet temperature',x.cold_outlet_temperature,'Â°C'],
    ['Bellâ€“Delaware design duty',x.bell_delaware_design_duty*4184/3600,'W'],
    ['Predicted/design duty',x.duty_ratio===null?null:x.duty_ratio*100,'%']
  ];
  $('ntuRows').replaceChildren();
  for (const [name,value,unit] of items) {
    const tr=document.createElement('tr');
    for (const text of [name,format(value),unit]) {
      const td=document.createElement('td');td.textContent=text;tr.appendChild(td);
    }
    $('ntuRows').appendChild(tr);
  }
  $('ntuConfiguration').textContent=x.configuration;
  $('ntuAssumptions').textContent='Assumptions: single phase, constant properties per step, no automatic iteration.';
  $('ntuResults').hidden=false;
}
function showFluids(response){
 if(!NTU_MODE)return;
 const audit=response.fluid_properties||{};
 const lines=[];
 for(const side of ['hot','cold']){
   const rec=audit[side];if(!rec)continue;
   const names=side==='hot'?'Hot stream':'Cold stream';
   lines.push(`${names}: ${rec.medium}; mean temperature ${format(rec.temperature_bulk_c)} Â°C; wall temperature ${format(rec.temperature_wall_c)} Â°C; absolute pressure ${format(rec.pressure_pa/100000)} bar(a).`);
   const rows=SIDE_ROWS[side];const props=rec.bulk;
   const numbers=[props.density,props.viscosity,props.specific_heat,props.conductivity,rec.wall_viscosity_pa_s];
   for(let i=0;i<rows.length;i++){
     const id=rows[i];const el=$('field-'+id);if(el)el.value=numericInput(numbers[i],5);
   }
 }
 $('fluidStatus').textContent=lines.length?lines.join(' '):'Manual fluid properties active on both sides.';
}
function recordManualStep(x) {
  // Only the hot outlet is fed back. Cold outlet (row 24) is derived by Bellâ€“Delaware.
  const assumed = Number(state.inputs['12']);
  const predicted = x.hot_outlet_temperature;
  const delta = predicted - assumed;
  state.lastNTU = x;
  state.manualHistory.push({assumed, predicted, delta, cold:x.cold_outlet_temperature});
  $('feedbackStep').textContent = `Calculation ${state.manualHistory.length}`;
  $('feedbackAssumed').textContent = `${format(assumed, 4)} Â°C`;
  $('feedbackPredicted').textContent = `${format(predicted, 4)} Â°C`;
  $('feedbackDifference').textContent = `${format(delta, 4)} K`;
  $('feedbackTransfer').textContent = `${format(predicted, 4)} Â°C (Îµ-NTU hot outlet) â†’ Hot stream: assumed outlet (input)`;
  $('feedbackBtn').disabled = false;
  $('feedbackStatus').textContent = `Next click applies ${format(predicted,4)} Â°C and runs one new calculation. No automatic iteration.`;
  $('feedbackHistoryRows').replaceChildren();
  for (let i=0;i<state.manualHistory.length;i++) {
    const item=state.manualHistory[i], tr=document.createElement('tr');
    for(const value of [i+1,format(item.assumed,4),format(item.predicted,4),format(item.delta,4),format(item.cold,4)]) {
      const td=document.createElement('td');td.textContent=String(value);tr.appendChild(td);
    }
    $('feedbackHistoryRows').appendChild(tr);
  }
  $('feedbackHistory').hidden=false;
}
async function applyFeedback() {
  if (!NTU_MODE || !state.lastNTU || $('calculateBtn').disabled) return;
  const next = state.lastNTU.hot_outlet_temperature;
  if (!Number.isFinite(next)) return;
  // Deliberately preserve full numerical precision in the calculation input.
  state.inputs['12']=next;
  $('field-12').value=numericInput(toDisplay(12,next), 5);
  state.lastNTU=null;
  $('feedbackBtn').disabled=true;
  // Stop an older pending derived-input response from overwriting the fresh result.
  state.refreshSeq++;
  clearTimeout(state.refreshTimer);
  if (latestDerivedController) latestDerivedController.abort();
  $('results').hidden=true;
  $('calculationStatus').textContent='One manual feedback step: recalculatingâ€¦';
  await run();
}


async function run(){
 $('calculateBtn').disabled=true;errorMessage('');$('calculationStatus').textContent='Calculatingâ€¦';
 const inputSnapshot=JSON.stringify(state.inputs);
 try{
  const response=await fetch(`${API_URL}/${NTU_MODE ? "calculate-ntu" : "calculate"}`,{method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({inputs:state.inputs,...(NTU_MODE?{arrangement:$("ntuArrangement").value,properties:propertySettings()}:{})})});
  const body=await response.json();if(!response.ok)throw new Error(body.detail||`HTTP ${response.status}`);
  if(inputSnapshot!==JSON.stringify(state.inputs))throw new Error('Inputs changed during calculation. Please calculate again.');
  showResults(body);
 }catch(err){if (NTU_MODE){state.lastNTU=null;$('feedbackBtn').disabled=true;}errorMessage(err.message);$('calculationStatus').textContent='Calculation failed.';}
 finally{$('calculateBtn').disabled=false;}
}
let latestDerivedController=null;
function scheduleDerivedUpdate() {
 const seq=++state.refreshSeq;
 clearTimeout(state.refreshTimer);
 if(latestDerivedController) latestDerivedController.abort();
 if(NTU_MODE && (propertyMode('hot')==='database'||propertyMode('cold')==='database')){$('calculationStatus').textContent='Select Calculate to update CoolProp properties and derived values.';return;}
 state.refreshTimer=setTimeout(()=>updateDerived(seq),250);
}
async function updateDerived(seq){
 const controller=new AbortController();latestDerivedController=controller;
 try{
  const response=await fetch(`${API_URL}/derived-inputs`,{method:'POST',
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({inputs:state.inputs}),signal:controller.signal});
  const body=await response.json();
  if(!response.ok)throw new Error(body.detail||`HTTP ${response.status}`);
  if(seq!==state.refreshSeq)return;
  for(const [row,value] of Object.entries(body.derived)){
   const el=$('field-'+row);
   if(el && el.readOnly)el.value=value===null?'':format(toDisplay(row,value));
  }
  errorMessage('');
  $('calculationStatus').textContent='Derived values updated. Select Calculate for the full results.';
 }catch(err){
  if(err.name==='AbortError'||seq!==state.refreshSeq)return;
  errorMessage('Failed to update derived inputs: '+err.message);
  $('calculationStatus').textContent='Check input values.';
 }
}
async function init(){
 try{
  const response=await fetch(`${API_URL}/defaults`);if(!response.ok)throw new Error(`API HTTP ${response.status}`);
  state.data=await response.json();
  $('resetBtn').addEventListener('click',populateDefaults);
   if (NTU_MODE) { $('ntuArrangement').addEventListener('change',()=>{$('results').hidden=true;state.lastNTU=null;state.manualHistory=[];$('feedbackBtn').disabled=true;}); $('feedbackBtn').addEventListener('click',applyFeedback);
    for(const side of ['hot','cold']){
      $(side+'PropertyMode').addEventListener('change',()=>{updatePropertyMode();scheduleDerivedUpdate();});
      for(const postfix of ['Fluid','Pressure'])$(side+postfix).addEventListener('change',invalidateNTU);
    }
    try {const r=await fetch(`${API_URL}/fluids`);if(!r.ok)throw new Error('Fluid list unavailable');const j=await r.json();
      for(const side of ['hot','cold']){const select=$(side+'Fluid');for(const medium of j.media){const opt=document.createElement('option');opt.value=medium.id;opt.textContent=medium.naam;select.appendChild(opt);}select.value='water';}
    } catch(e){$('fluidStatus').textContent='Failed to load fluid list: '+e.message;}
    updatePropertyMode(); }
  $('calculateBtn').addEventListener('click',run);
  $('calculateBtn').disabled=false;$('apiStatus').textContent='â— Backend connected';
  populateDefaults();
 }catch(err){$('apiStatus').textContent='â— Backend offline';errorMessage('Failed to load default values: '+err.message+'\nStart backend on 127.0.0.1:8001.');}
}
init();

