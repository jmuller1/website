// Local: http://127.0.0.1:8001  |  Live: https://hex-api.jmuller.be (set when deployed)
const API_URL = 'https://hex-api.jmuller.be';
// const API_URL = 'https://hex-api.jmuller.be';
const NTU_MODE = /(?:^|\/)ntu\.html$/i.test(window.location.pathname);
const state = { data: null, inputs: {}, refreshSeq: 0, refreshTimer: null, lastNTU: null, manualHistory: [] };
const $ = id => document.getElementById(id);
function format(value, significant = 4) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string' && isNaN(Number(value))) return value;
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('nl-NL', {
    maximumSignificantDigits: significant,
    useGrouping: false
  });
}
function errorMessage(msg) { $('message').textContent=msg || ''; }
function populateDefaults() {
 const c=state.data;
 state.refreshSeq++; clearTimeout(state.refreshTimer);
 state.inputs={}; $('inputPanel').innerHTML=''; $('results').hidden=true; if (NTU_MODE) { $('ntuResults').hidden=true; state.lastNTU=null; state.manualHistory=[]; $('feedbackBtn').disabled=true; $('feedbackHistory').hidden=true; $('feedbackHistoryRows').replaceChildren(); } errorMessage('');
 for (const group of state.data.sections) {
  const card=document.createElement('section');card.className='card';
  const title=document.createElement('div');title.className='section-title';title.innerHTML=`<h3>${group.title}</h3><span>${group.rows.length} parameters</span>`;card.appendChild(title);
  for(const row of group.rows){
   const field=c.fields[String(row)];if(!field) continue;
   const wrapper=document.createElement('div');wrapper.className='field'+(!field.editable?' derived':'');
   const label=document.createElement('label');label.htmlFor='field-'+row;label.textContent=NTU_MODE && row===12?'Assumed hot outlet temperature — feedback input':NTU_MODE && row===24?'Cold outlet — Bell–Delaware energy balance':field.label;
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
    input.value=field.value===null?'':(field.editable?String(field.value):format(field.value));input.readOnly=!field.editable;
   }
   input.id='field-'+row;input.dataset.row=String(row);
   if(field.editable){
    state.inputs[String(row)]=field.value;
    input.addEventListener('input',()=>{state.inputs[String(row)]=input.value; $('results').hidden=true; if (NTU_MODE) {state.lastNTU=null;state.manualHistory=[];$('feedbackBtn').disabled=true;$('feedbackHistory').hidden=true;$('feedbackHistoryRows').replaceChildren();} $('calculationStatus').textContent='Inputs updated; derived values are refreshing.';scheduleDerivedUpdate();});
   }
   const unit=document.createElement('span');unit.className='unit';unit.textContent=field.unit;
   wrapper.append(label,input,unit);card.appendChild(wrapper);
  }
  $('inputPanel').appendChild(card);
 }
 $('calculationStatus').textContent='Default values loaded.'; scheduleDerivedUpdate();
}
function fillRows(elementId, rows){
 $(elementId).replaceChildren();
 for(const row of rows){const tr=document.createElement('tr');for(const v of [row.label,row.symbol,format(row.value),row.unit]){const td=document.createElement('td');td.textContent=v||'—';tr.appendChild(td)}$(elementId).appendChild(tr)}
}
function showResults(data){
 $('results').hidden=false;$('resultsTitle').textContent='Calculation results';
 const metrics=[['Heat duty',70],['Available area',73],['Shell pressure drop',217],['Tube pressure drop',219]];
 $('keyMetrics').replaceChildren();
 for(const [heading, row] of metrics){
  const item=data.summary.find(x=>x.row===row);if(!item)continue;
  const card=document.createElement('div');card.className='metric';
  const title=document.createElement('span');title.textContent=heading;
  const val=document.createElement('strong');val.textContent=format(item.value);
  const unit=document.createElement('em');unit.textContent=item.unit;
  card.append(title,val,unit);$('keyMetrics').appendChild(card);
 }
 fillRows('summaryRows',data.summary);
 $('detailedGroups').replaceChildren();
 for(const group of data.details){
  const detail=document.createElement('details');const summary=document.createElement('summary');
  summary.textContent=`${group.name} (${group.items.length} results)`;detail.appendChild(summary);
  const table=document.createElement('table');const tbody=document.createElement('tbody');
  for(const item of group.items){const tr=document.createElement('tr');
   for(const txt of [item.label,item.symbol,format(item.value),item.unit]){const td=document.createElement('td');td.textContent=txt||'—';tr.appendChild(td)}tbody.appendChild(tr)}
  table.appendChild(tbody);detail.appendChild(table);$('detailedGroups').appendChild(detail);
 }
 for(const [row,value] of Object.entries(data.derived)){
  const el=$('field-'+row);if(el && el.readOnly)el.value=value===null?'':format(value);
 }
 if (NTU_MODE && data.ntu) { showNTU(data.ntu); recordManualStep(data.ntu); }
  $('calculationStatus').textContent='Calculation completed on the backend.';
 $('results').scrollIntoView({behavior:'smooth',block:'start'});
}
function showNTU(x) {
  const items = [
    ['C hot',x.capacity_hot,'kcal/(h·K)'],['C cold',x.capacity_cold,'kcal/(h·K)'],
    ['C min',x.capacity_min,'kcal/(h·K)'],['C max',x.capacity_max,'kcal/(h·K)'],
    ['Capacity ratio Cr',x.capacity_ratio,'—'],['Dirty U',x.overall_u_dirty,'kcal/(m²·h·K)'],
    ['Available area',x.area_available,'m²'],['UA',x.ua,'kcal/(h·K)'],
    ['NTU',x.ntu,'—'],['Effectiveness ε',x.effectiveness,'—'],
    ['Maximum heat duty',x.q_max,'kcal/h'],['Predicted heat duty',x.heat_duty,'kcal/h'],
    ['Predicted hot outlet temperature',x.hot_outlet_temperature,'°C'],
    ['Predicted cold outlet temperature',x.cold_outlet_temperature,'°C'],
    ['Bell–Delaware design duty',x.bell_delaware_design_duty,'kcal/h'],
    ['Predicted / design duty',x.duty_ratio===null?null:x.duty_ratio*100,'%']
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
  $('ntuAssumptions').textContent='Model assumptions: '+x.assumptions;
  $('ntuResults').hidden=false;
}
function recordManualStep(x) {
  // Only the hot outlet is fed back. Cold outlet (row 24) is derived by Bell–Delaware.
  const assumed = Number(state.inputs['12']);
  const predicted = x.hot_outlet_temperature;
  const delta = predicted - assumed;
  state.lastNTU = x;
  state.manualHistory.push({assumed, predicted, delta, cold:x.cold_outlet_temperature});
  $('feedbackStep').textContent = `Calculation ${state.manualHistory.length}`;
  $('feedbackAssumed').textContent = `${format(assumed, 6)} °C`;
  $('feedbackPredicted').textContent = `${format(predicted, 6)} °C`;
  $('feedbackDifference').textContent = `${format(delta, 5)} K`;
  $('feedbackTransfer').textContent = `${format(predicted, 6)} °C (ε-NTU hot out) → Hot Stream Data: assumed hot outlet temperature (input)`;
  $('feedbackBtn').disabled = false;
  $('feedbackStatus').textContent = `Next click copies the unrounded ${predicted} °C to the assumed hot outlet input and runs one new calculation. No automatic repeat.`;
  $('feedbackHistoryRows').replaceChildren();
  for (let i=0;i<state.manualHistory.length;i++) {
    const item=state.manualHistory[i], tr=document.createElement('tr');
    for(const value of [i+1,format(item.assumed,6),format(item.predicted,6),format(item.delta,5),format(item.cold,6)]) {
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
  $('field-12').value=String(next);
  state.lastNTU=null;
  $('feedbackBtn').disabled=true;
  // Stop an older pending derived-input response from overwriting the fresh result.
  state.refreshSeq++;
  clearTimeout(state.refreshTimer);
  if (latestDerivedController) latestDerivedController.abort();
  $('results').hidden=true;
  $('calculationStatus').textContent='One manual feedback step: recalculating…';
  await run();
}


async function run(){
 $('calculateBtn').disabled=true;errorMessage('');$('calculationStatus').textContent='Calculating…';
 const inputSnapshot=JSON.stringify(state.inputs);
 try{
  const response=await fetch(`${API_URL}/${NTU_MODE ? "calculate-ntu" : "calculate"}`,{method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({inputs:state.inputs,...(NTU_MODE?{arrangement:$("ntuArrangement").value}:{})})});
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
   if(el && el.readOnly)el.value=value===null?'':format(value);
  }
  errorMessage('');
  $('calculationStatus').textContent='Derived values updated. Select Calculate for the full results.';
 }catch(err){
  if(err.name==='AbortError'||seq!==state.refreshSeq)return;
  errorMessage('Derived input could not be updated: '+err.message);
  $('calculationStatus').textContent='Check the input values.';
 }
}
async function init(){
 try{
  const response=await fetch(`${API_URL}/defaults`);if(!response.ok)throw new Error(`API HTTP ${response.status}`);
  state.data=await response.json();
  $('resetBtn').addEventListener('click',populateDefaults);
   if (NTU_MODE) { $('ntuArrangement').addEventListener('change',()=>{$('results').hidden=true;state.lastNTU=null;state.manualHistory=[];$('feedbackBtn').disabled=true;}); $('feedbackBtn').addEventListener('click',applyFeedback); }
  $('calculateBtn').addEventListener('click',run);
  $('calculateBtn').disabled=false;$('apiStatus').textContent='● Backend connected';
  populateDefaults();
 }catch(err){$('apiStatus').textContent='● Backend offline';errorMessage('Cannot load defaults: '+err.message+'\nStart backend on 127.0.0.1:8001.');}
}
init();
