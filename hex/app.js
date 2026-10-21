// Local: http://127.0.0.1:8001  |  Live: https://hex-api.jmuller.be (set when deployed)
// const API_URL = 'http://127.0.0.1:8001';
const API_URL = 'https://hex-api.jmuller.be';
const state = { data: null, inputs: {}, refreshSeq: 0, refreshTimer: null };
const $ = id => document.getElementById(id);
function format(value, significant=4) {
 if (value===null || value===undefined || value==='') return '—';
 if (typeof value==='string') return value;
 const n=Number(value);
 if (!Number.isFinite(n)) return '—';
 if (n===0) return '0';
 // Four meaningful digits with sensible decimal notation for engineering reports.
 const magnitude=Math.floor(Math.log10(Math.abs(n)));
 const decimals=Math.max(0,Math.min(8, significant - 1 - magnitude));
 if (Math.abs(n)<1e-6 || Math.abs(n)>=1e9) return n.toExponential(significant-1);
 return n.toLocaleString('en-GB',{minimumFractionDigits:0,maximumFractionDigits:decimals});
}
function errorMessage(msg) { $('message').textContent=msg || ''; }
function populateDefaults() {
 const c=state.data;
 state.refreshSeq++; clearTimeout(state.refreshTimer);
 state.inputs={}; $('inputPanel').innerHTML=''; $('results').hidden=true; errorMessage('');
 for (const group of state.data.sections) {
  const card=document.createElement('section');card.className='card';
  const title=document.createElement('div');title.className='section-title';title.innerHTML=`<h3>${group.title}</h3><span>${group.rows.length} parameters</span>`;card.appendChild(title);
  for(const row of group.rows){
   const field=c.fields[String(row)];if(!field) continue;
   const wrapper=document.createElement('div');wrapper.className='field'+(!field.editable?' derived':'');
   const label=document.createElement('label');label.htmlFor='field-'+row;label.textContent=field.label;
   let input;
   if(field.select && field.editable){
    input=document.createElement('select');
    if(field.value===null){const blank=document.createElement('option');blank.value='';blank.textContent='Not specified';input.appendChild(blank)}
    for(const val of field.select){const opt=document.createElement('option');opt.value=val;opt.textContent=val;input.appendChild(opt)}
    input.value=field.value===null?'':String(field.value);
   }else{
    input=document.createElement('input');input.type='number';input.step='any';
    input.value=field.value===null?'':String(field.value);input.readOnly=!field.editable;
   }
   input.id='field-'+row;input.dataset.row=String(row);
   if(field.editable){
    state.inputs[String(row)]=field.value;
    input.addEventListener('input',()=>{state.inputs[String(row)]=input.value; $('results').hidden=true; $('calculationStatus').textContent='Inputs updated; derived values are refreshing.';scheduleDerivedUpdate();});
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
  const el=$('field-'+row);if(el && el.readOnly)el.value=value===null?'':String(value);
 }
 $('calculationStatus').textContent='Calculation completed on the backend.';
 $('results').scrollIntoView({behavior:'smooth',block:'start'});
}
async function run(){
 $('calculateBtn').disabled=true;errorMessage('');$('calculationStatus').textContent='Calculating…';
 const inputSnapshot=JSON.stringify(state.inputs);
 try{
  const response=await fetch(`${API_URL}/calculate`,{method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({inputs:state.inputs})});
  const body=await response.json();if(!response.ok)throw new Error(body.detail||`HTTP ${response.status}`);
  if(inputSnapshot!==JSON.stringify(state.inputs))throw new Error('Inputs changed during calculation. Please calculate again.');
  showResults(body);
 }catch(err){errorMessage(err.message);$('calculationStatus').textContent='Calculation failed.';}
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
   if(el && el.readOnly)el.value=value===null?'':String(Number(value.toPrecision?.(10)??value));
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
  $('calculateBtn').addEventListener('click',run);
  $('calculateBtn').disabled=false;$('apiStatus').textContent='● Backend connected';
  populateDefaults();
 }catch(err){$('apiStatus').textContent='● Backend offline';errorMessage('Cannot load defaults: '+err.message+'\nStart backend on 127.0.0.1:8001.');}
}
init();
