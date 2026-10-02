/* OASIS — climate-responsive shelter design engine
   Concept model only: values are for comparison, communication and ANSYS handoff.
*/
const $ = (id) => document.getElementById(id);
const qs = (s) => document.querySelector(s);
const qsa = (s) => [...document.querySelectorAll(s)];

const MATERIAL_CATALOG = {
  stone:{name:'Stone + mineral wool',u:.24,k:1.7,rho:2400,cp:790,cost:1850,note:'Durable local stone face with continuous insulation; useful where enclosure mass and durability matter.'},
  earth:{name:'Rammed earth + insulation',u:.28,k:1.55,rho:2100,cp:880,cost:1600,note:'High thermal capacity with exterior insulation; useful where local earth is available.'},
  brick:{name:'Adobe / mud brick + insulation',u:.50,k:.60,rho:1700,cp:840,cost:1250,note:'Higher heat transfer; use with a proper insulation layer and weatherproof finish.'},
  sip:{name:'Insulated panel system',u:.18,k:.032,rho:38,cp:1450,cost:2100,note:'Low heat transfer and fast assembly; add internal mass for a steadier indoor profile.'}
};

const fallbackClimate = {
  source:'REFERENCE DATA', place:'Leh, Ladakh', lat:34.15, lon:77.58, elevation:3500,
  temp:[-14,-15,-16,-16,-14,-10,-5,0,4,7,9,10,10,8,5,1,-3,-6,-8,-10,-11,-12,-13,-14],
  solar:[0,0,0,0,0,0,80,270,480,650,720,740,720,650,510,330,120,15,0,0,0,0,0,0],
  wind:[6,6,7,7,8,8,10,12,14,15,16,17,17,16,14,12,10,8,8,8,7,7,6,6],
  cloud:Array(24).fill(8), humidity:Array(24).fill(35), rain:Array(24).fill(0),
  times:Array.from({length:24},(_,i)=>`${String(i).padStart(2,'0')}:00`)
};

const state = {
  climate:structuredClone(fallbackClimate),
  materials:structuredClone(MATERIAL_CATALOG),
  selectedMaterial:'stone', latest:null, activeModule:'site', autoAdapt:true,
  airflow:true, thermalColours:true,
  view:{yaw:-.72,pitch:.38,zoom:1,dragging:false,lastX:0,lastY:0},
  // Starter package is deliberately modest: the sliders remain available for
  // remote/off-grid sites that genuinely need more autonomy.
  self:{pv:1.2,battery:2.4,water:750,vent:.35}
};

const fmt = (v,d=1) => {
  const n=Number(v); return Number.isFinite(n)?n.toLocaleString(undefined,{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
};
const fmt0 = (v) => fmt(v,0);
const money = (v) => Number.isFinite(Number(v)) ? `₹ ${Math.round(Number(v)).toLocaleString('en-IN')}` : '₹ —';
const moneyLakh = (v) => Number.isFinite(Number(v)) ? `₹ ${(Number(v)/100000).toFixed(2)} lakh` : '₹ —';
const mean = (arr) => { const vals=(arr||[]).map(Number).filter(Number.isFinite); return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0; };
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const escapeHtml = (s) => String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const finite = (v,f=0) => Number.isFinite(Number(v))?Number(v):f;

function formData(){ return new FormData($('designForm')); }
function num(name){ return finite(formData().get(name),0); }
function selectedWall(){ return String(formData().get('wall') || state.selectedMaterial); }
function design(){
  const fd=formData();
  return {
    length:finite(fd.get('length'),7), width:finite(fd.get('width'),5), height:finite(fd.get('height'),2.6),
    glazing:clamp(finite(fd.get('glazing'),30)/100,.05,.65), mass:Math.max(0,finite(fd.get('mass'),0)), initial:finite(fd.get('initial'),18),
    orientation:((finite(fd.get('orientation'),180)%360)+360)%360,
    ventMode:String(fd.get('ventMode')||'balanced'), ach:clamp(finite(fd.get('ach'),.35),.1,6),
    shade:clamp(finite(fd.get('shade'),.85),.45,1), wall:selectedWall()
  };
}

function normalizeClimate(c){
  const out={...c};
  const fill=(arr,f)=>Array.from({length:24},(_,i)=>{
    const n=Number(arr?.[i]); return Number.isFinite(n)?n:f;
  });
  out.temp=fill(c.temp,0); out.solar=fill(c.solar,0); out.wind=fill(c.wind,0); out.cloud=fill(c.cloud,0);
  out.humidity=fill(c.humidity,50); out.rain=fill(c.rain,0);
  out.times=Array.from({length:24},(_,i)=>c.times?.[i] ?? `${String(i).padStart(2,'0')}:00`);
  out.elevation=finite(c.elevation,0); out.lat=finite(c.lat,0); out.lon=finite(c.lon,0); out.place=c.place||'Selected site';
  return out;
}

function climateType(){
  const c=normalizeClimate(state.climate); const t=c.temp, avg=mean(t), minT=Math.min(...t), maxT=Math.max(...t), e=finite(c.elevation,0);
  if(avg<10 || minT<=2 || e>=2200) return 'HIGH-ALTITUDE COLD';
  if(avg>=27 || maxT>=35) return 'HOT / SUMMER';
  if(avg>=20) return 'COMPOSITE';
  return 'TEMPERATE';
}

function archetype(){
  const type=climateType();
  if(type==='HIGH-ALTITUDE COLD') return {
    name:'Compact heat-retaining enclosure', short:'COLD • COMPACT • SEALED', vent:'sealed', ach:.35,
    glazing:24, mass:4.8, shade:.88, orientation:180, length:6.6, width:4.6, height:2.55,
    roof:'gable-insulated', canopy:false, story:'Smaller openings, thick envelope, south solar gain and a buffered entry reduce heat loss.'
  };
  if(type==='HOT / SUMMER') return {
    name:'Open cross-ventilated pavilion', short:'HOT • SHADED • CROSS-VENTILATED', vent:'open', ach:3.4,
    glazing:34, mass:2.2, shade:.55, orientation:0, length:7.6, width:5.8, height:3.0,
    roof:'shaded-low', canopy:true, story:'Larger opposite openings, deep shading and high-level exhaust encourage cross-flow and heat release.'
  };
  return {
    name:'Balanced seasonal enclosure', short:'BALANCED • OPERABLE • FLEXIBLE', vent:'balanced', ach:1.2,
    glazing:28, mass:3.4, shade:.72, orientation:165, length:7.0, width:5.0, height:2.7,
    roof:'gable-low', canopy:false, story:'Moderate glazing, operable openings and controllable shading balance heat retention and ventilation.'
  };
}

function climateGuidance(type=climateType()){
  if(type==='HIGH-ALTITUDE COLD') return 'Cold conditions: reduce uncontrolled air leakage, keep the form compact, use solar gain on the sun-facing facade and place thermal mass inside the insulated envelope.';
  if(type==='HOT / SUMMER') return 'Hot conditions: use shaded openings on opposite sides, high-level exhaust, a deeper roof overhang and a taller internal volume to release heat.';
  return 'Seasonal conditions: use operable openings, moderate shading and useful thermal mass so the enclosure can switch between heat retention and purge ventilation.';
}

function applyClimatePreset(preset=null,showToast=true){
  const fixed={
    cold:{name:'Compact heat-retaining enclosure',short:'COLD • COMPACT • SEALED',vent:'sealed',ach:.35,glazing:24,mass:4.8,shade:.88,orientation:180,length:6.6,width:4.6,height:2.55,roof:'gable-insulated',canopy:false,story:'Smaller openings, thick envelope, south solar gain and a buffered entry reduce heat loss.'},
    summer:{name:'Open cross-ventilated pavilion',short:'HOT • SHADED • CROSS-VENTILATED',vent:'open',ach:3.4,glazing:34,mass:2.2,shade:.55,orientation:0,length:7.6,width:5.8,height:3.0,roof:'shaded-low',canopy:true,story:'Larger opposite openings, deep shading and high-level exhaust encourage cross-flow and heat release.'},
    balanced:{name:'Balanced seasonal enclosure',short:'BALANCED • OPERABLE • FLEXIBLE',vent:'balanced',ach:1.2,glazing:28,mass:3.4,shade:.72,orientation:165,length:7.0,width:5.0,height:2.7,roof:'gable-low',canopy:false,story:'Moderate glazing, operable openings and controllable shading balance heat retention and ventilation.'}
  };
  const p=fixed[preset]||archetype();
  const fields={glazing:p.glazing,mass:p.mass,ach:p.ach,shade:p.shade,orientation:p.orientation,length:p.length,width:p.width,height:p.height};
  Object.entries(fields).forEach(([k,v])=>{const el=qs(`[name="${k}"]`);if(el)el.value=v;});
  const vm=qs('[name="ventMode"]');if(vm)vm.value=p.vent;
  state.self.vent=p.ach;if($('ventSize'))$('ventSize').value=p.ach;
  $('adaptiveText').textContent=`${p.name}: ${p.story}`;
  $('siteRecommendation').textContent=climateGuidance();
  updateBuildLabels();
  if(showToast)toast('Climate-responsive design updated.');
}

function applyClimateAuto(){ if(state.autoAdapt) applyClimatePreset(null,false); }

function orientationLabel(deg){ const dirs=['N','NE','E','SE','S','SW','W','NW']; return dirs[Math.round(((deg%360)+360)%360/45)%8]; }
function displayHour(v,i){
  const raw=String(v??'');
  if(/^\d{2}:\d{2}/.test(raw)) return raw.slice(0,5);
  const dt=new Date(raw); return Number.isNaN(dt.getTime())?`${String(i).padStart(2,'0')}:00`:dt.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',hour12:false});
}
function currentIndex(times){
  if(!Array.isArray(times)||!times.length)return 0;
  let best=0,dist=Infinity,now=Date.now();
  times.forEach((t,i)=>{const ms=new Date(t).getTime(); if(Number.isFinite(ms)){const d=Math.abs(ms-now);if(d<dist){dist=d;best=i}}});
  return clamp(best,0,Math.max(0,times.length-1));
}

async function loadWeather(lat,lon){
  lat=finite(lat,NaN);lon=finite(lon,NaN);
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat<-90||lat>90||lon<-180||lon>180){toast('Enter valid latitude and longitude.');return;}
  $('weatherStatus').textContent='Loading live climate…';
  try{
    const params=new URLSearchParams({latitude:lat,longitude:lon,hourly:'temperature_2m,shortwave_radiation,wind_speed_10m,cloud_cover,relative_humidity_2m,precipitation',forecast_days:'2',timezone:'auto'});
    const r=await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if(!r.ok)throw new Error('Weather service unavailable');
    const data=await r.json();
    const k=currentIndex(data.hourly?.time); const take=(name,f)=>Array.from({length:24},(_,i)=>finite(data.hourly?.[name]?.[k+i],i?finite(data.hourly?.[name]?.[k+i-1],f):f));
    const times=Array.from({length:24},(_,i)=>data.hourly?.time?.[k+i]||`${String(i).padStart(2,'0')}:00`);
    state.climate=normalizeClimate({source:'LIVE WEATHER',place:`${lat.toFixed(3)}°, ${lon.toFixed(3)}°`,lat,lon,elevation:Math.round(finite(data.elevation,0)),temp:take('temperature_2m',0),solar:take('shortwave_radiation',0),wind:take('wind_speed_10m',4),cloud:take('cloud_cover',0),humidity:take('relative_humidity_2m',50),rain:take('precipitation',0),times});
    $('locationHelp').textContent='Live hourly climate loaded. The design, airflow strategy, thermal model and system capacities now follow this site.';
    updateSiteCards(); applyClimateAuto(); runModel(); go('climate'); toast('Live climate loaded.');
  }catch(err){
    console.warn(err);
    $('weatherStatus').textContent='Live weather unavailable • reference climate retained';
    $('dataSource').textContent='REFERENCE DATA';
    $('locationHelp').textContent='The live weather lookup failed, so the reference climate remains active. You can continue offline or retry later.';
    updateSiteCards();runModel();toast('Live weather unavailable; reference data retained.');
  }
}
function locate(){
  if(!window.isSecureContext && location.hostname!=='localhost'){ $('weatherStatus').textContent='Location requires HTTPS or localhost.'; $('locationHelp').textContent='Open the app through localhost or an HTTPS deployment, then allow location. Manual coordinates remain available.'; return; }
  if(!navigator.geolocation){$('locationHelp').textContent='This browser does not provide geolocation. Use manual coordinates.';return;}
  $('locationHelp').textContent='Approve the browser location prompt. The coordinates are then used for the weather lookup.';
  navigator.geolocation.getCurrentPosition(p=>loadWeather(p.coords.latitude,p.coords.longitude),err=>{const m={1:'Location was blocked. Allow Location for this site.',2:'Location could not be determined. Check device location services.',3:'Location request timed out. Use manual coordinates.'};$('locationHelp').textContent=m[err.code]||'Location could not be read. Use manual coordinates.';$('manualPanel').classList.remove('hidden');});
}

function updateBuildLabels(){
  const t=climateType(),d=design(),a=archetype();
  $('climateClass').textContent=t;$('planOrientation').textContent=`${Math.round(d.orientation)}° / ${orientationLabel(d.orientation)} ↑`;
  $('adaptiveBanner').style.borderLeftColor=t==='HOT / SUMMER'?'#2e957e':t==='HIGH-ALTITUDE COLD'?'#d5a83e':'#277d94';
  $('adaptiveText').textContent=`${a.name}: ${a.story}`;
  if($('planStrategy'))$('planStrategy').textContent=a.name;
  if($('ansysModelTitle'))$('ansysModelTitle').textContent=`${a.name} • thermal + airflow projection`;
}

function updateSiteCards(){
  state.climate=normalizeClimate(state.climate); const c=state.climate,i=currentIndex(c.times),avg=mean(c.temp),type=climateType(),a=archetype();
  $('weatherStatus').textContent=`${c.source==='LIVE WEATHER'?'Live climate':'Reference climate'} • ${c.place}`;$('sitePlace').textContent=c.place;
  $('siteSource').textContent=c.source;$('siteSource').className=`status-pill ${c.source==='LIVE WEATHER'?'live':''}`;
  $('ambientValue').textContent=`${fmt(c.temp[i])}°`;$('ambientDetail').textContent=`Hour ${displayHour(c.times[i],i)} • ${c.source.toLowerCase()}`;
  $('solarValue').innerHTML=`${fmt(c.solar[i],0)} <i>W/m²</i>`;$('solarDetail').textContent=`Cloud ${fmt(c.cloud[i],0)}%`;
  $('windValue').innerHTML=`${fmt(c.wind[i],0)} <i>km/h</i>`;$('windDetail').textContent=`Peak ${fmt(Math.max(...c.wind),0)} km/h`;
  $('elevationValue').innerHTML=`${fmt0(c.elevation)} <i>m</i>`;$('elevationDetail').textContent=a.name.toLowerCase();
  $('summaryCoords').textContent=`${c.lat.toFixed(3)}, ${c.lon.toFixed(3)}`;$('summaryMean').textContent=`${fmt(avg)} °C`; $('summaryRange').textContent=`${fmt0(Math.min(...c.temp))} / ${fmt0(Math.max(...c.temp))} °C`; $('summaryPeakSolar').textContent=`${fmt0(Math.max(...c.solar))} W/m²`;
  $('climateClass').textContent=type;$('climateDataLabel').textContent=c.source.includes('LIVE')?'LIVE':'REFERENCE'; if($('dataSource'))$('dataSource').textContent=c.source;
  $('meanTemp').textContent=`${fmt(avg)} °C`;$('dailySolar').textContent=`${fmt(c.solar.reduce((a,b)=>a+b,0)/1000)} kWh/m²`;$('peakWind').textContent=`${fmt0(Math.max(...c.wind))} km/h`;$('meanCloud').textContent=`${fmt0(mean(c.cloud))} %`;
  $('climateGuidance').textContent=climateGuidance(type);
  const badges=type==='HIGH-ALTITUDE COLD'?['SEALED ENVELOPE','SOLAR STORAGE','PROTECTED ENTRY']:type==='HOT / SUMMER'?['CROSS VENTILATION','SOLAR SHADING','OPENABLE FACADES']:['SEASONAL VENT','SOLAR CONTROL','FLEXIBLE MASS'];
  $('climateBadges').innerHTML=badges.map(x=>`<span>${x}</span>`).join('');
  drawClimateProfile();
}

function drawClimateProfile(){
  const svg=$('climateChart'); if(!svg)return; const c=normalizeClimate(state.climate),W=900,H=350,pad={l:55,r:22},top=28;
  const plotW=W-pad.l-pad.r, x=i=>pad.l+i*plotW/23;
  const tmin=Math.floor((Math.min(...c.temp)-2)/5)*5, tmax=Math.ceil((Math.max(...c.temp)+2)/5)*5;
  const tempY=v=>top+(tmax-v)*(118)/(Math.max(8,tmax-tmin));
  const solarTop=182,solarH=62,windTop=273,windH=35;
  const solarMax=Math.max(100,...c.solar),windMax=Math.max(5,...c.wind);
  const solarY=v=>solarTop+solarH-(v/solarMax)*solarH, windY=v=>windTop+windH-(v/windMax)*windH;
  let s=`<defs><linearGradient id="climateBg" x1="0" x2="1"><stop offset="0" stop-color="#eef6f8"/><stop offset="1" stop-color="#f8f7f1"/></linearGradient></defs>`;
  s+=`<rect x="0" y="0" width="900" height="350" rx="3" fill="url(#climateBg)"/>`;
  s+=`<text x="55" y="18" fill="#5b7582" font-family="DM Mono" font-size="9">TEMPERATURE • °C</text><text x="55" y="176" fill="#5b7582" font-family="DM Mono" font-size="9">SOLAR • W/m²</text><text x="55" y="268" fill="#5b7582" font-family="DM Mono" font-size="9">WIND • km/h</text>`;
  for(let j=0;j<4;j++){const yy=top+j*39;s+=`<line x1="${pad.l}" y1="${yy}" x2="${W-pad.r}" y2="${yy}" stroke="#d5dfdd"/><text x="8" y="${yy+4}" fill="#71868e" font-family="DM Mono" font-size="9">${fmt0(tmax-j*(tmax-tmin)/3)}°</text>`;}
  for(let i=0;i<24;i+=3){const xx=x(i);s+=`<line x1="${xx}" y1="24" x2="${xx}" y2="315" stroke="#e1e6e4" stroke-dasharray="2 5"/><text x="${xx-10}" y="337" fill="#6c828a" font-family="DM Mono" font-size="9">${escapeHtml(displayHour(c.times[i],i))}</text>`;}
  const tempPath=c.temp.map((v,i)=>`${i?'L':'M'} ${x(i).toFixed(1)} ${tempY(v).toFixed(1)}`).join(' ');
  s+=`<path d="${tempPath}" fill="none" stroke="#2f91ba" stroke-width="3"/><circle cx="${x(0)}" cy="${tempY(c.temp[0])}" r="3.5" fill="#2f91ba"/>`;
  c.temp.forEach((v,i)=>{s+=`<circle cx="${x(i)}" cy="${tempY(v)}" r="2.2" fill="#2f91ba"><title>${displayHour(c.times[i],i)} • ${fmt(v)} °C</title></circle>`;});
  for(let i=0;i<24;i++){const xx=x(i),bw=Math.max(6,plotW/34),yy=solarY(c.solar[i]);s+=`<rect x="${xx-bw/2}" y="${yy}" width="${bw}" height="${solarTop+solarH-yy}" fill="#e5ad32" opacity=".78"><title>${displayHour(c.times[i],i)} • ${fmt0(c.solar[i])} W/m²</title></rect>`;}
  const windPath=c.wind.map((v,i)=>`${i?'L':'M'} ${x(i).toFixed(1)} ${windY(v).toFixed(1)}`).join(' ');
  s+=`<path d="${windPath}" fill="none" stroke="#2e957e" stroke-width="2.4"/>`;
  c.wind.forEach((v,i)=>{s+=`<circle cx="${x(i)}" cy="${windY(v)}" r="1.8" fill="#2e957e"/>`;});
  s+=`<text x="${W-160}" y="24" fill="#3a7696" font-family="DM Mono" font-size="9">24-HOUR SITE SERIES</text>`;
  svg.innerHTML=s;
}

function drawPlan(d){
  const svg=$('blueprint'); if(!svg)return; const type=climateType(),a=archetype();
  const ratio=clamp(d.length/d.width,.85,1.8),pw=560,ph=clamp(pw/ratio,180,300),x=100,y=95,south=y+ph;
  const opening=Math.max(55,Math.min(pw*.48,pw*d.glazing*1.35));
  const wall=10, massW=clamp(pw*(d.mass/Math.max(1,d.length*d.width))*.9,.10*pw,.26*pw);
  const arrowMarker=`<marker id="planArrow" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L0 6 L8 3 Z" fill="#61d2ff"/></marker>`;
  let inner=`<defs>${arrowMarker}<pattern id="pgrid" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M18 0H0V18" fill="none" stroke="#407a9d" stroke-width=".55" opacity=".28"/></pattern></defs><rect width="760" height="480" fill="#0b2d49"/><rect width="760" height="480" fill="url(#pgrid)"/>`;
  inner+=`<text x="30" y="46" fill="#bceafa" font-family="DM Mono" font-size="12">N</text><path d="M36 76V53M27 63L36 53 45 63" stroke="#bceafa" stroke-width="2" fill="none"/>`;
  inner+=`<text x="${x}" y="${y-26}" fill="#97c8dc" font-family="DM Mono" font-size="11">${fmt(d.length)} m</text><text x="${x+pw+14}" y="${y+ph/2}" fill="#97c8dc" font-family="DM Mono" font-size="11">${fmt(d.width)} m</text>`;
  inner+=`<rect x="${x}" y="${y}" width="${pw}" height="${ph}" rx="3" fill="#123f5d" stroke="#d1effb" stroke-width="4"/>`;
  // Insulation / envelope boundary and core
  if(type==='HIGH-ALTITUDE COLD'){
    // Cold-site layout: south is explicitly at the bottom of the drawing.
    // This keeps solar glazing, internal mass and the protected entry in their
    // correct passive-solar relationship.
    const glazeW=clamp(opening*.42,pw*.18,pw*.32), glazeX=x+(pw-glazeW)/2;
    inner+=`<text x="${x+pw/2-22}" y="${y-26}" fill="#97c8dc" font-family="DM Mono" font-size="10">NORTH</text><text x="${x+pw/2-55}" y="${south+24}" fill="#f7ca5a" font-family="DM Mono" font-size="10">SOUTH / WINTER SUN</text>`;
    inner+=`<rect x="${x+wall}" y="${y+wall}" width="${pw-2*wall}" height="${ph-2*wall}" fill="#0f3653" stroke="#86bdd3" stroke-width="2"/><text x="${x+18}" y="${y+24}" fill="#8fc6dc" font-family="DM Mono" font-size="9">CONTINUOUS INSULATED ENVELOPE</text>`;
    inner+=`<rect x="${x+pw*.17}" y="${y+ph*.16}" width="${pw*.58}" height="${ph*.63}" fill="#214f6b" stroke="#73b9db"/><text x="${x+pw*.31}" y="${y+ph*.40}" fill="#cdeefa" font-family="DM Mono" font-size="11">COMPACT LIVING ZONE</text>`;
    inner+=`<rect x="${x+pw*.27}" y="${y+ph*.63}" width="${pw*.38}" height="${ph*.11}" fill="#a85f45" stroke="#efb59e"/><text x="${x+pw*.31}" y="${y+ph*.60}" fill="#fff1df" font-family="DM Mono" font-size="9">THERMAL MASS • SUNLIT</text>`;
    inner+=`<rect x="${glazeX}" y="${south-7}" width="${glazeW}" height="7" fill="#e8b437"/><text x="${glazeX+4}" y="${south-13}" fill="#f7ca5a" font-family="DM Mono" font-size="9">SOUTH SOLAR GLAZING</text>`;
    inner+=`<rect x="${x+pw*.76}" y="${y+ph*.16}" width="${pw*.14}" height="${ph*.27}" fill="#516e7f" stroke="#f2d06d"/><text x="${x+pw*.73}" y="${y+ph*.12}" fill="#f7ca5a" font-family="DM Mono" font-size="9">AIRLOCK / ENTRY</text>`;
    inner+=`<rect x="${x+pw*.08}" y="${y+ph*.28}" width="${pw*.07}" height="${ph*.14}" fill="#59c6e9" stroke="#9de9ff"/><text x="${x+pw*.05}" y="${y+ph*.24}" fill="#8ddbf2" font-family="DM Mono" font-size="8">FILTERED INLET</text>`;
    inner+=`<path d="M${x+pw*.14} ${y+ph*.35} C${x+pw*.28} ${y+ph*.35},${x+pw*.38} ${y+ph*.39},${x+pw*.50} ${y+ph*.42} S${x+pw*.70} ${y+ph*.36},${x+pw*.76} ${y+ph*.30}" fill="none" stroke="#61d2ff" stroke-width="2.6" stroke-dasharray="7 6" marker-end="url(#planArrow)"/><text x="${x+pw*.28}" y="${y+ph*.31}" fill="#8ddbf2" font-family="DM Mono" font-size="8">CONTROLLED FRESH-AIR PATH • 0.35 ACH</text>`;
  } else if(type==='HOT / SUMMER'){
    inner+=`<rect x="${x+wall}" y="${y+wall}" width="${pw-2*wall}" height="${ph-2*wall}" fill="#123d59" stroke="#74c2d9" stroke-width="2"/>`;
    inner+=`<rect x="${x+pw*.18}" y="${y+ph*.25}" width="${pw*.64}" height="${ph*.50}" fill="#1f5974" stroke="#8ad8ec"/>`;
    inner+=`<rect x="${x+pw*.24}" y="${y+ph*.33}" width="${pw*.52}" height="${ph*.15}" fill="#285f78"/><text x="${x+pw*.40}" y="${y+ph*.425}" fill="#d9f7ff" font-family="DM Mono" font-size="11">OPEN LIVING ZONE</text>`;
    inner+=`<rect x="${x+pw*.06}" y="${y+ph*.30}" width="${pw*.09}" height="${ph*.30}" fill="#59c6e9" stroke="#9de9ff"/><rect x="${x+pw*.85}" y="${y+ph*.30}" width="${pw*.09}" height="${ph*.30}" fill="#59c6e9" stroke="#9de9ff"/>`;
    inner+=`<path d="M${x+pw*.13} ${y+ph*.38} C${x+pw*.32} ${y+ph*.25},${x+pw*.55} ${y+ph*.25},${x+pw*.86} ${y+ph*.38}" fill="none" stroke="#61d2ff" stroke-width="4" stroke-dasharray="10 7" marker-end="url(#planArrow)"/><path d="M${x+pw*.86} ${y+ph*.58} C${x+pw*.63} ${y+ph*.67},${x+pw*.36} ${y+ph*.67},${x+pw*.13} ${y+ph*.58}" fill="none" stroke="#61d2ff" stroke-width="4" stroke-dasharray="10 7" marker-end="url(#planArrow)"/>`;
    inner+=`<rect x="${x+pw*.32}" y="${y-ph*.14}" width="${pw*.36}" height="${ph*.08}" fill="#376e83" stroke="#f0c35a" stroke-width="2"/><text x="${x+pw*.39}" y="${y-ph*.18}" fill="#f7ca5a" font-family="DM Mono" font-size="9">DEEP SHADE CANOPY</text>`;
    inner+=`<text x="${x+pw*.07}" y="${y+ph*.73}" fill="#8ddbf2" font-family="DM Mono" font-size="9">COOL AIR IN</text><text x="${x+pw*.70}" y="${y+ph*.73}" fill="#8ddbf2" font-family="DM Mono" font-size="9">AIR OUT</text>`;
  } else {
    inner+=`<rect x="${x+wall}" y="${y+wall}" width="${pw-2*wall}" height="${ph-2*wall}" fill="#113c57" stroke="#83c1d5" stroke-width="2"/>`;
    inner+=`<rect x="${x+pw*.23}" y="${y+ph*.22}" width="${pw*.54}" height="${ph*.56}" fill="#205778" stroke="#75b8d9"/>`;
    inner+=`<rect x="${x+pw*.54}" y="${y+ph*.22}" width="${massW}" height="${ph*.54}" fill="#af674b" opacity=".9"/><text x="${x+pw*.28}" y="${y+ph*.48}" fill="#d4f0fb" font-family="DM Mono" font-size="11">LIVING / CORE</text><text x="${x+pw*.56}" y="${y+ph*.49}" fill="#fff1df" font-family="DM Mono" font-size="9">MASS</text>`;
    inner+=`<rect x="${x+pw*.08}" y="${south-ph*.72}" width="${pw*.08}" height="${ph*.18}" fill="#59c6e9"/><rect x="${x+pw*.84}" y="${south-ph*.72}" width="${pw*.08}" height="${ph*.18}" fill="#59c6e9"/>`;
    inner+=`<path d="M${x+pw*.16} ${y+ph*.36} C${x+pw*.35} ${y+ph*.28},${x+pw*.65} ${y+ph*.28},${x+pw*.84} ${y+ph*.36}" fill="none" stroke="#61d2ff" stroke-width="3" stroke-dasharray="9 7" marker-end="url(#planArrow)"/>`;
    inner+=`<line x1="${x+pw*.25}" y1="${south}" x2="${x+pw*.75}" y2="${south}" stroke="#e7b33d" stroke-width="9"/><text x="${x+pw*.38}" y="${south+22}" fill="#f5c85a" font-family="DM Mono" font-size="9">CONTROLLED SOLAR GLAZING</text>`;
    inner+=`<rect x="${x+pw*.82}" y="${y+ph*.64}" width="${pw*.08}" height="${ph*.15}" fill="#516e7f" stroke="#f2d06d"/><text x="${x+pw*.70}" y="${y+ph*.87}" fill="#f7ca5a" font-family="DM Mono" font-size="9">BUFFERED ENTRY</text>`;
  }
  inner+=`<text x="${x}" y="${south+52}" fill="#7db7ce" font-family="DM Mono" font-size="10">${escapeHtml(a.short)} • ${d.height.toFixed(1)} m internal height • ${d.ach.toFixed(1)} air changes/hour</text>`;
  svg.innerHTML=inner;
}

function calcModel(){
  const d=design(),m=state.materials[d.wall]||state.materials.stone,c=normalizeClimate(state.climate);
  const floor=d.length*d.width,wallGross=2*(d.length+d.width)*d.height,glazingArea=Math.min(wallGross*.65,wallGross*d.glazing),opaqueWall=Math.max(0,wallGross-glazingArea),roof=floor*(climateType()==='HOT / SUMMER'?1.06:1.10),volume=floor*d.height;
  const roofU=climateType()==='HIGH-ALTITUDE COLD'?.18:.24,floorU=.28,glazingU=1.8;
  const ua=(opaqueWall*m.u)+(roof*roofU)+(floor*floorU)+(glazingArea*glazingU);
  const massCapacity=d.mass*m.rho*m.cp,airCapacity=volume*1.2*1005,capacity=Math.max(airCapacity+massCapacity,1);
  const shgc=climateType()==='HOT / SUMMER'?.48:.62;
  const ventCoeff=(d.ach*volume*1.2*1005/3600)*(1+Math.max(0,mean(c.wind)-5)/75),effectiveUA=ua+ventCoeff;
  const T=[d.initial],heat=[],solarGain=[];
  for(let i=0;i<24;i++){
    const ti=T[T.length-1],to=finite(c.temp[i],0),I=Math.max(0,finite(c.solar[i],0));
    const solar=I*glazingArea*shgc*d.shade,loss=effectiveUA*(ti-to),net=solar-loss;
    const next=clamp(ti+net*3600/capacity*.82,-20,55);T.push(next);heat.push(net);solarGain.push(solar/1000);
  }
  T.shift();
  return {d,m,floor,wallGross,glazingArea,opaqueWall,roof,volume,ua,ventCoeff,effectiveUA,capacity,massCapacity,airCapacity,T,heat,solarGain,totalGain:solarGain.reduce((a,b)=>a+b,0),minIndoor:Math.min(...T),maxIndoor:Math.max(...T),ventFlow:d.ach*volume};
}
function updateLatest(){state.latest=calcModel();return state.latest;}

function drawTemperatureChart(x){
  const canvas=$('temperatureChart'),ctx=canvas?.getContext('2d');if(!ctx)return;const c=normalizeClimate(state.climate);
  const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);ctx.fillStyle='#f8f7f1';ctx.fillRect(0,0,w,h);
  const pad={l:54,r:18,t:18,b:38};const all=[...x.T,...c.temp].filter(Number.isFinite);if(!all.length){ctx.fillStyle='#67808a';ctx.font='12px Manrope';ctx.fillText('Climate data unavailable',60,80);return;}
  let min=Math.floor(Math.min(...all)/5)*5-5,max=Math.ceil(Math.max(...all)/5)*5+5;if(max-min<12){max+=6;min-=6}
  const px=i=>pad.l+i*(w-pad.l-pad.r)/23,py=v=>pad.t+(max-v)*(h-pad.t-pad.b)/(max-min);
  ctx.strokeStyle='#d9e2df';ctx.lineWidth=1;ctx.font='10px DM Mono';ctx.fillStyle='#67808a';
  for(let v=Math.ceil(min/5)*5;v<=max;v+=5){ctx.beginPath();ctx.moveTo(pad.l,py(v));ctx.lineTo(w-pad.r,py(v));ctx.stroke();ctx.fillText(`${v}°`,8,py(v)+4);}
  const zero=h-pad.b,peak=Math.max(...x.heat.map(Math.abs),500);x.heat.forEach((v,i)=>{const bh=Math.min(38,Math.abs(v)/peak*38);ctx.fillStyle=v>=0?'#8fc8bb':'#e0a79a';ctx.globalAlpha=.7;ctx.fillRect(px(i)-5,zero-bh,10,bh);});ctx.globalAlpha=1;
  const line=(arr,color,width=3,dash=[])=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.beginPath();arr.forEach((v,i)=>{if(!Number.isFinite(v))return;i?ctx.lineTo(px(i),py(v)):ctx.moveTo(px(i),py(v));});ctx.stroke();ctx.setLineDash([]);};
  line(c.temp,'#3a90bb',2,[6,5]);line(x.T,'#e3a931',3,[]);
  ctx.fillStyle='#66808b';ctx.font='10px DM Mono';[0,6,12,18,23].forEach(i=>ctx.fillText(displayHour(c.times[i],i),px(i)-8,h-12));
}

function drawThermalField(x){
  const canvas=$('thermalField'),ctx=canvas?.getContext('2d');if(!ctx)return;const w=canvas.width,h=canvas.height,type=climateType();ctx.clearRect(0,0,w,h);
  ctx.fillStyle='#092d49';ctx.fillRect(0,0,w,h);
  const tMin=x.minIndoor,tMax=x.maxIndoor,mid=(tMin+tMax)/2,sx=50,sy=45,sw=w-100,sh=235;
  const grad=ctx.createLinearGradient(sx,0,sx+sw,0);grad.addColorStop(0,'#2c78ba');grad.addColorStop(.28,'#4db4d7');grad.addColorStop(.52,'#dbe8e6');grad.addColorStop(.74,'#f3bd42');grad.addColorStop(1,'#d86256');
  ctx.fillStyle=grad;ctx.globalAlpha=.78;ctx.fillRect(sx,sy,sw,sh);ctx.globalAlpha=1;ctx.strokeStyle='#d1effb';ctx.lineWidth=4;ctx.strokeRect(sx,sy,sw,sh);
  if(type==='HIGH-ALTITUDE COLD'){
    ctx.fillStyle='rgba(33,86,112,.35)';ctx.fillRect(sx+sw*.08,sy+sh*.1,sw*.28,sh*.8);
    ctx.fillStyle='rgba(235,165,72,.42)';ctx.fillRect(sx+sw*.43,sy+sh*.24,sw*.23,sh*.52);
    ctx.fillStyle='rgba(8,28,48,.38)';ctx.fillRect(sx+sw*.82,sy+sh*.58,sw*.10,sh*.18);
  }else if(type==='HOT / SUMMER'){
    ctx.fillStyle='rgba(46,132,167,.34)';ctx.fillRect(sx+sw*.04,sy+sh*.16,sw*.27,sh*.68);
    ctx.fillStyle='rgba(244,186,57,.44)';ctx.fillRect(sx+sw*.46,sy+sh*.2,sw*.28,sh*.48);
    ctx.fillStyle='rgba(205,85,74,.58)';ctx.fillRect(sx+sw*.78,sy+sh*.10,sw*.14,sh*.35);
    ctx.fillStyle='rgba(12,63,86,.55)';ctx.fillRect(sx+sw*.78,sy+sh*.58,sw*.12,sh*.25);
  }else{
    ctx.fillStyle='rgba(74,172,198,.30)';ctx.fillRect(sx+sw*.07,sy+sh*.16,sw*.22,sh*.68);
    ctx.fillStyle='rgba(226,167,57,.44)';ctx.fillRect(sx+sw*.50,sy+sh*.25,sw*.26,sh*.48);
  }
  ctx.fillStyle='#edf8fc';ctx.font='11px DM Mono';ctx.fillText(type==='HOT / SUMMER'?'COOL INLET':'EXTERIOR',sx+18,sy+sh+25);ctx.fillText('ACTIVE ZONE',sx+sw*.43,sy+sh+25);ctx.fillText(type==='HOT / SUMMER'?'HIGH-LEVEL EXHAUST':'ENTRY BUFFER',sx+sw*.74,sy+sh+25);
  ctx.fillStyle='#bad8e6';ctx.font='12px Manrope';ctx.fillText(`Predicted indoor range: ${fmt(tMin)} to ${fmt(tMax)} °C`,sx,sy+sh+78);ctx.font='10px DM Mono';ctx.fillText(`Midpoint ${fmt(mid)} °C • colour field is a conceptual visualization, not a CFD result`,sx,sy+sh+98);
  $('thermalReadout').textContent=`${archetype().name}: the field separates cooler intake/exterior, the occupied thermal zone and the main warm/solar or exhaust region. Colour is relative to the current 24-hour model range.`;
}

function materialHeatLossRows(x){
  const rows=Object.entries(state.materials).map(([key,m])=>({key,name:m.name,ua:(x.opaqueWall*m.u)+(x.roof*.22)+(x.floor*.28)+(x.glazingArea*1.8)}));
  const max=Math.max(...rows.map(r=>r.ua),1);
  $('materialBars').innerHTML=rows.map(r=>`<div class="comparison-row ${r.key===x.d.wall?'active':''}"><span>${escapeHtml(r.name)}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.max(8,r.ua/max*100)}%"></div></div><b>${fmt0(r.ua)} W/K</b></div>`).join('');
}
function renderMaterials(x){
  const cards=$('materialCards');
  cards.innerHTML=Object.entries(state.materials).map(([key,m])=>`<div class="material-card ${key===x.d.wall?'active':''}" data-material="${escapeHtml(key)}"><div class="material-name">${escapeHtml(m.name)}</div><div class="material-note">${escapeHtml(m.note)}</div><div class="material-meta"><div><span>U-value</span><strong>${m.u.toFixed(2)} W/m²K</strong></div><div><span>Indicative cost</span><strong>${money(m.cost)}/m²</strong></div><div><span>Conductivity</span><strong>${m.k} W/mK</strong></div><div><span>Vol. heat capacity</span><strong>${fmt(m.rho*m.cp/1e6,2)} MJ/m³K</strong></div></div></div>`).join('');
  const m=x.m;
  $('selectedMaterialDetail').innerHTML=`<h3>${escapeHtml(m.name)}</h3><p>${escapeHtml(m.note)}</p><div class="detail-stats"><div><span>U-value</span><strong>${m.u.toFixed(2)} W/m²K</strong></div><div><span>Volumetric heat capacity</span><strong>${fmt(m.rho*m.cp/1e6,2)} MJ/m³K</strong></div><div><span>Indicative cost</span><strong>${money(m.cost)}/m²</strong></div></div><div class="material-use-note"><strong>Why it is in the model</strong><span>${m.u<.3?'Low conductive heat transfer helps reduce envelope losses.':'This option needs stronger insulation detailing to limit heat transfer.'} ${m.rho*m.cp>1500000?'Its density and heat capacity also provide useful thermal storage.':'Pair it with internal thermal mass when a steadier indoor temperature is required.'}</span></div>`;
  materialHeatLossRows(x);
  qsa('.material-card').forEach(el=>el.addEventListener('click',()=>{state.selectedMaterial=el.dataset.material;const select=qs('[name="wall"]');if(select){if(![...select.options].some(o=>o.value===state.selectedMaterial))select.add(new Option(state.materials[state.selectedMaterial].name,state.selectedMaterial));select.value=state.selectedMaterial;}runModel();}));
}

function calculateCost(x){
  const d=x.d,m=x.m,locationMultiplier=state.climate.elevation>2200?1.12:climateType()==='HOT / SUMMER'?.98:1;
  const costs={
    'Envelope + wall package':x.opaqueWall*m.cost*.70,
    'Roof + weather layer':x.roof*(climateType()==='HOT / SUMMER'?1100:1200),
    'Floor + insulated plinth':x.floor*700,
    'Glazing + frames':x.glazingArea*(climateType()==='HOT / SUMMER'?5000:5600),
    'Doors + entry buffer':Math.max(1,x.floor*.045)*19000,
    'Ventilation / shading hardware':x.floor*(climateType()==='HOT / SUMMER'?700:400),
    'Solar PV + controller':state.self.pv*42000,
    'Battery storage':state.self.battery*10000,
    // Includes a small food-grade tank, first-flush hardware and replaceable filter;
    // a per-litre-only rate made the previous figure unrealistically low.
    'Water storage + filtration':Math.max(14000,state.self.water*12),
    'Electrical / lighting / pumps':x.floor*500,
    'Transport + site setup':Math.max(12000,x.floor*350)
  };
  const subtotal=Object.values(costs).reduce((a,b)=>a+Math.max(0,b),0),contingency=subtotal*.10,total=(subtotal+contingency)*locationMultiplier;
  return {costs,subtotal,contingency,total,average:total,low:total*.88,high:total*1.12};
}
function renderCost(x){
  const c=calculateCost(x),max=Math.max(...Object.values(c.costs),1);
  $('costRows').innerHTML=Object.entries(c.costs).map(([k,v])=>`<div class="cost-row"><span>${escapeHtml(k)}</span><div class="cost-bar-track"><div class="cost-bar" style="width:${Math.max(5,v/max*100)}%"></div></div><strong>${money(v)}</strong></div>`).join('')+`<div class="cost-row"><span>Contingency / local variation</span><div class="cost-bar-track"><div class="cost-bar" style="width:${Math.max(5,c.contingency/max*100)}%"></div></div><strong>${money(c.contingency)}</strong></div>`;
  $('costTotal').textContent=moneyLakh(c.total);$('avgCost').textContent=moneyLakh(c.average); if($('costRange'))$('costRange').textContent=`Typical concept range: ${moneyLakh(c.low)} – ${moneyLakh(c.high)}`;
  return c;
}

function renderSelf(){
  const x=state.latest||calcModel(),d=x.d,roofCatch=x.roof;
  const solarDaily=Math.max(0,mean(state.climate.solar))*x.glazingArea*(climateType()==='HOT / SUMMER'?.48:.62)*d.shade/1000;
  const demand=1.6+x.floor*.045+(d.ach>2?.55:.25),generation=state.self.pv*solarDaily,coverage=clamp((generation/Math.max(.5,demand))*100,0,100),waterDays=state.self.water/240;
  $('pvCapacity').textContent=`${fmt(state.self.pv)} kWp`;$('pvDetail').textContent=`≈ ${fmt(generation)} kWh/day from the current 24-hour solar profile`;
  $('batteryCapacity').textContent=`${fmt(state.self.battery)} kWh`;$('batteryDetail').textContent=`Usable backup target ≈ ${fmt(state.self.battery*.85)} kWh`;
  $('waterCapacity').textContent=`${fmt0(state.self.water)} L`;$('waterDetail').textContent=`≈ ${fmt(waterDays)} days at the concept water-use allowance`;
  $('ventCapacity').textContent=`${fmt(state.self.vent)} ACH`;$('ventDetail').textContent=state.self.vent<.8?'Controlled air exchange':state.self.vent<2?'Seasonal operable ventilation':'Cross ventilation / purge mode';
  $('pvSize').value=state.self.pv;$('batterySize').value=state.self.battery;$('waterSize').value=state.self.water;$('ventSize').value=state.self.vent;
  $('energyAutonomy').textContent=`${fmt0(coverage)}%`;$('energyDemand').textContent=`${fmt(demand)} kWh/day`;$('energyGeneration').textContent=`${fmt(generation)} kWh/day`;$('energyBackup').textContent=`${fmt(state.self.battery)} kWh`;$('energyDonut').style.background=`conic-gradient(#2e957e 0 ${coverage}%,#d5e4e0 ${coverage}% 100%)`;
  $('waterFillLabel').textContent=`${fmt0(state.self.water)} L`;$('waterFill').style.width=`${clamp(state.self.water/6000*100,5,100)}%`;$('waterDays').textContent=`≈ ${fmt(waterDays)} days at a conceptual 240 L/day allowance.`;$('roofCatchment').textContent=`${fmt(roofCatch,0)} m² catchment`;
  const rows=[['Thermal envelope',clamp(100-(x.effectiveUA/Math.max(1,d.floor))*18,25,95)],['Energy coverage',coverage],['Water reserve',clamp(state.self.water/3000*100,10,100)],['Ventilation control',clamp(100-Math.abs(state.self.vent-(climateType()==='HOT / SUMMER'?3.4:.5))*18,20,100)]];
  $('resilienceList').innerHTML=rows.map(([name,v])=>`<div class="resilience-row"><div>${name}</div><strong>${fmt0(v)}%</strong><div class="progress"><i style="width:${fmt0(v)}%"></i></div></div>`).join('');
  if($('selfExplain'))$('selfExplain').innerHTML=`<strong>How to read this module:</strong> PV is the planned solar array size. Battery is stored electricity. Water is tank capacity. <b>ACH</b> means <i>air changes per hour</i> — how many internal air-volume replacements the ventilation setting represents in one hour.`;
  return {solarDaily,demand,generation,coverage,waterDays};
}

function draw3D(x){
  const canvas=$('shelter3d'),ctx=canvas?.getContext('2d');if(!ctx)return;const cw=canvas.width,ch=canvas.height;ctx.clearRect(0,0,cw,ch);
  const d=x.d,type=climateType(),a=archetype(),L=d.length,W=d.width,H=d.height,roofRise=type==='HIGH-ALTITUDE COLD'?.9:type==='HOT / SUMMER'?.48:.68,eave=type==='HOT / SUMMER'?.65:.18;
  // Orthographic isometric projection: parallel faces stay parallel, so the enclosure reads as a true rectangular volume.
  const scale=Math.min(cw/(L+W*.72+4),ch/(H+roofRise+W*.48+3))*1.55*state.view.zoom;
  function project([X,Y,Z]){const cy=Math.cos(state.view.yaw),sy=Math.sin(state.view.yaw),cp=Math.cos(state.view.pitch),sp=Math.sin(state.view.pitch);const rx=X*cy-Z*sy,rz=X*sy+Z*cy,ry=Y*cp-rz*sp;return{x:cw*.5+rx*scale,y:ch*.70-ry*scale,d:rz};}
  const faces=[];const addFace=(pts,fill,stroke='#8fc5d8')=>{const p=pts.map(project);faces.push({p,fill,stroke,depth:p.reduce((s,v)=>s+v.d,0)/p.length});};
  const box=(x0,x1,y0,y1,z0,z1,fill,stroke)=>{const a=[x0,y0,z0],b=[x1,y0,z0],c=[x1,y1,z0],d0=[x0,y1,z0],e=[x0,y0,z1],f=[x1,y0,z1],g=[x1,y1,z1],h=[x0,y1,z1];addFace([a,b,c,d0],fill,stroke);addFace([a,e,h,d0],fill,stroke);addFace([b,f,g,c],fill,stroke);addFace([d0,c,g,h],fill,stroke);addFace([a,b,f,e],fill,stroke);addFace([e,f,g,h],fill,stroke);};
  const wallFill=state.thermalColours?(type==='HIGH-ALTITUDE COLD'?'#6e97ac':type==='HOT / SUMMER'?'#4c99ae':'#7e9aa4'):'#a7b7ba';
  const dark='#395f70';
  // Base / four rectangular walls.
  box(-L/2,L/2,-.18,0,-W/2,W/2,'#567783','#87b6c8');
  box(-L/2,L/2,0,H,-W/2,-W/2+.18,wallFill,dark); // rear
  box(-L/2,L/2,0,H,W/2-.18,W/2,wallFill,dark); // south
  box(-L/2,-L/2+.18,0,H,-W/2,W/2,wallFill,dark); // west
  box(L/2-.18,L/2,0,H,-W/2,W/2,wallFill,dark); // east
  // Interior core / thermal mass.
  const massW=clamp(d.mass/(Math.max(.2,W)*.22),.8,L*.36);box(-massW/2,massW/2,.02,Math.min(1.9,H*.76),W*.02,W*.35,'#a95f45','#efb59e');
  // South glazing and climate-specific opening strategy.
  const gl=clamp(L*d.glazing*1.25,L*.22,L*.55);
  if(type==='HOT / SUMMER'){
    box(-L/2+.18,-L/2+.32,.65,H*.68,-W*.50,-W*.45,'#54b8d6','#9ce6f8');
    box(L/2-.32,L/2-.18,.65,H*.68,-W*.50,-W*.45,'#54b8d6','#9ce6f8');
    box(-L/2+.18,L/2-.18,.45,H*.72,W/2-.30,W/2-.16,'#54b8d6','#9ce6f8');
    // Deep shade canopy.
    box(-L/2-eave,L/2+eave,H+.18,H+.34,-W/2-eave,W/2+eave,'#416f80','#e5bb51');
  } else if(type==='HIGH-ALTITUDE COLD'){
    box(-gl/2,gl/2,.60,H*.78,W/2-.27,W/2-.11,'#61b9d5','#9de8fb');
    box(L/2-.42,L/2-.20,.45,H*.70,-.10,.11,'#566f7d','#efd06d');
  } else {
    box(-gl*.62,gl*.62,.55,H*.78,W/2-.25,W/2-.10,'#58b1cc','#9be2f7');
    box(-L/2+.22,-L/2+.34,.65,H*.65,-W/2+.12,-W/2+.28,'#58b1cc','#9be2f7');
  }
  // Roof geometry: cold = steeper gable, hot = shallow protected roof, balanced = moderate gable.
  if(type==='HOT / SUMMER'){
    addFace([[-L/2-eave,H,-W/2-eave],[L/2+eave,H,-W/2-eave],[L/2+eave,H+.38,W/2+eave],[-L/2-eave,H+.38,W/2+eave]],'#668e98','#9fd0dc');
    addFace([[-L/2-eave,H,-W/2-eave],[-L/2-eave,H+.38,W/2+eave],[L/2+eave,H+.38,W/2+eave],[L/2+eave,H,-W/2-eave]],'rgba(95,147,160,.50)','#b3d9e3');
    box(-L*.18,L*.18,H+.18,H+.48,-W*.42,W*.42,'#a67d49','#f0c35b');
  } else {
    const ridge=H+roofRise;
    addFace([[-L/2,H,-W/2],[L/2,H,-W/2],[L/2,ridge,0],[-L/2,ridge,0]],type==='HIGH-ALTITUDE COLD'?'#698692':'#6f8e9b','#a7cad6');
    addFace([[-L/2,H,W/2],[L/2,H,W/2],[L/2,ridge,0],[-L/2,ridge,0]],type==='HIGH-ALTITUDE COLD'?'#7f9ba5':'#829ea8','#b7d1d9');
  }
  // Thermal colour accents over main faces.
  if(state.thermalColours){
    if(type==='HOT / SUMMER'){addFace([[-L/2+.19,.2,W/2+.012],[L/2-.19,.2,W/2+.012],[L/2-.19,H*.74,W/2+.012],[-L/2+.19,H*.74,W/2+.012]],'rgba(231,166,58,.34)','#e3b048');}
    if(type==='HIGH-ALTITUDE COLD'){addFace([[-gl/2,.60,W/2+.012],[gl/2,.60,W/2+.012],[gl/2,H*.78,W/2+.012],[-gl/2,H*.78,W/2+.012]],'rgba(88,190,220,.42)','#9de7fa');}
    if(type==='COMPOSITE'||type==='TEMPERATE'){addFace([[-gl*.62,.55,W/2+.012],[gl*.62,.55,W/2+.012],[gl*.62,H*.78,W/2+.012],[-gl*.62,H*.78,W/2+.012]],'rgba(224,173,59,.36)','#e6bc52');}
  }
  faces.sort((a,b)=>a.depth-b.depth);faces.forEach(f=>{ctx.beginPath();f.p.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=f.fill;ctx.fill();ctx.strokeStyle=f.stroke;ctx.lineWidth=1.2;ctx.stroke();});
  // Airflow = readable streamlines, not a lone arrow.
  if(state.airflow){
    const drawCurve=(p0,p1,p2,p3,color='#61d2ff',width=3)=>{const a=project(p0),b=project(p1),c=project(p2),d0=project(p3);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash([10,8]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.bezierCurveTo(b.x,b.y,c.x,c.y,d0.x,d0.y);ctx.stroke();ctx.setLineDash([]);return {a,b,c,d:d0};};
    const arrowAt=(p,dir,color='#61d2ff')=>{const len=10;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-len*Math.cos(dir-.45),p.y-len*Math.sin(dir-.45));ctx.lineTo(p.x-len*Math.cos(dir+.45),p.y-len*Math.sin(dir+.45));ctx.closePath();ctx.fill();};
    let curves=[];
    if(type==='HOT / SUMMER'){
      curves=[
        drawCurve([-L*.47,.72,-W*.53],[-L*.20,.85,-W*.12],[L*.10,1.05,W*.05],[L*.47,1.35,W*.51]),
        drawCurve([-L*.47,1.35,-W*.53],[-L*.10,1.45,-W*.10],[L*.16,1.70,W*.02],[L*.46,2.28,W*.12]),
        drawCurve([L*.47,.62,W*.52],[L*.20,.70,W*.15],[-L*.02,1.12,-W*.05],[-L*.45,1.70,-W*.30])
      ];
      ctx.fillStyle='#61d2ff';ctx.font='10px DM Mono';ctx.fillText('LOW-LEVEL COOL AIR IN',25,55);ctx.fillStyle='#f0bf4b';ctx.fillText('HIGH-LEVEL WARM AIR OUT',cw-178,55);
      curves.forEach(c=>arrowAt({x:(c.c.x+c.d.x)/2,y:(c.c.y+c.d.y)/2},Math.atan2(c.d.y-c.c.y,c.d.x-c.c.x)));
    } else if(type==='HIGH-ALTITUDE COLD'){
      curves=[
        drawCurve([-L*.49,1.15,-W*.15],[-L*.24,1.18,-W*.05],[0,1.25,W*.04],[L*.30,1.36,W*.08],'#61d2ff',2.8),
        drawCurve([-L*.49,.68,-W*.10],[-L*.25,.72,-W*.03],[L*.05,.90,W*.03],[L*.30,1.05,W*.04],'#61d2ff',2.3)
      ];
      ctx.fillStyle='#61d2ff';ctx.font='10px DM Mono';ctx.fillText('FILTERED INTAKE → LIVING ZONE',25,55);ctx.fillStyle='#f0bf4b';ctx.fillText('CONTROLLED EXTRACT',cw-155,55);
      curves.forEach(c=>arrowAt({x:(c.b.x+c.c.x)/2,y:(c.b.y+c.c.y)/2},Math.atan2(c.c.y-c.b.y,c.c.x-c.b.x)));
    } else {
      curves=[
        drawCurve([-L*.48,.78,-W*.50],[-L*.17,.90,-W*.05],[L*.12,1.03,W*.04],[L*.46,1.22,W*.47]),
        drawCurve([L*.46,.68,W*.47],[L*.16,.82,W*.04],[-L*.10,1.12,-W*.04],[-L*.46,1.38,-W*.48]),
        drawCurve([-L*.40,1.90,-W*.46],[-L*.10,1.85,-W*.02],[L*.16,1.65,W*.02],[L*.42,1.52,W*.44],'#7ad8ef',2.4)
      ];
      ctx.fillStyle='#61d2ff';ctx.font='10px DM Mono';ctx.fillText('OPERABLE INLET',25,55);ctx.fillStyle='#f0bf4b';ctx.fillText('SEASONAL EXHAUST',cw-140,55);
      curves.forEach(c=>arrowAt({x:(c.b.x+c.c.x)/2,y:(c.b.y+c.c.y)/2},Math.atan2(c.c.y-c.b.y,c.c.x-c.b.x)));
    }
    ctx.fillStyle='#a9d7e7';ctx.font='11px Manrope';ctx.fillText(a.story,25,78);
  }
  // Stable labels make the concept legible at any rotation; they describe the
  // fixed passive-shelter elements rather than pretending the view is CFD.
  if(type==='HIGH-ALTITUDE COLD'){
    ctx.font='10px DM Mono';ctx.fillStyle='#f3c65a';ctx.fillText('SOUTH SOLAR GLAZING',25,ch-44);
    ctx.fillStyle='#f0b29d';ctx.fillText('INTERNAL THERMAL MASS',25,ch-26);
    ctx.fillStyle='#c8e6f1';ctx.fillText('PROTECTED AIRLOCK ENTRY',cw-205,ch-26);
  }
  if(type==='HOT / SUMMER'){
    ctx.font='10px DM Mono';ctx.fillStyle='#61d2ff';ctx.fillText('01  LOW-LEVEL INLETS',25,ch-62);
    ctx.fillStyle='#8de3f5';ctx.fillText('02  OPERABLE LOUVRES',25,ch-44);
    ctx.fillStyle='#f3c65a';ctx.fillText('03  DEEP SHADE OVERHANG',cw-235,ch-62);
    ctx.fillStyle='#f0b35d';ctx.fillText('04  ROOF EXHAUST',cw-190,ch-44);
    ctx.fillStyle='#dca28c';ctx.fillText('05  SHADED THERMAL MASS',cw/2-82,ch-26);
  }
  ctx.fillStyle='#d1eef8';ctx.font='11px DM Mono';ctx.fillText(`${a.short} • THERMAL ${state.thermalColours?'ON':'OFF'} • AIRFLOW ${state.airflow?'ON':'OFF'}`,18,25);
}

function setup3D(){
  const canvas=$('shelter3d');
  canvas.addEventListener('pointerdown',e=>{state.view.dragging=true;state.view.lastX=e.clientX;state.view.lastY=e.clientY;canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!state.view.dragging)return;const dx=e.clientX-state.view.lastX,dy=e.clientY-state.view.lastY;state.view.yaw+=dx*.012;state.view.pitch=clamp(state.view.pitch+dy*.01,-.2,1.15);state.view.lastX=e.clientX;state.view.lastY=e.clientY;if(state.latest)draw3D(state.latest);});
  canvas.addEventListener('pointerup',e=>{state.view.dragging=false;try{canvas.releasePointerCapture(e.pointerId);}catch(_){}});
  canvas.addEventListener('pointercancel',()=>state.view.dragging=false);
  canvas.addEventListener('wheel',e=>{e.preventDefault();state.view.zoom=clamp(state.view.zoom-(e.deltaY*.0007),.75,1.5);if(state.latest)draw3D(state.latest);},{passive:false});
  $('resetViewBtn').addEventListener('click',()=>{state.view={yaw:-.72,pitch:.38,zoom:1,dragging:false,lastX:0,lastY:0};if(state.latest)draw3D(state.latest);});
}

function renderAirflowExplainer(){
  const el=$('airflowExplainer'),type=climateType(); if(!el)return;
  const a=archetype(),flow=type==='HOT / SUMMER'?'Cooler air enters through low opposite-side openings, travels across the occupied zone, and warmer air is released through the high roof outlet.':type==='HIGH-ALTITUDE COLD'?'A filtered low-rate inlet feeds the living zone; a short controlled extract path provides fresh air while preserving heat. The airlock protects the main room from door-opening losses.':'Operable openings create a cross-flow path through the room, while the upper path can release accumulated warm air when ventilation is desirable.';
  el.innerHTML=`<div><span class="mono">AIRFLOW MEANING</span><strong>${escapeHtml(a.name)}</strong></div><p>${flow}</p><div class="flow-key"><span><i class="air-dot cool"></i>Cooler intake</span><span><i class="air-dot warm"></i>Warmer exhaust</span><span><i class="air-arrow"></i>Approximate flow path</span></div>`;
}

function renderReportData(x,cost,self){
  const d=x.d,m=x.m,c=state.climate,a=archetype();
  $('reportTitle').textContent=`OASIS design study • ${c.place}`;$('reportSubtitle').textContent=`${c.source} • ${climateType()} • ${a.name}`;$('reportArea').textContent=`${fmt(x.floor)} m²`;$('reportCapacity').textContent=`${fmt(x.capacity/1e6,2)} MJ/K`;$('reportAutonomy').textContent=`${fmt0(self.coverage)}%`;
  $('designReadiness').textContent='8 / 8';$('readinessNote').textContent='Modules connected';
  if($('reportStrategyShort'))$('reportStrategyShort').textContent=climateType()==='HOT / SUMMER'?'Shaded cross ventilation':climateType()==='HIGH-ALTITUDE COLD'?'Compact passive-solar shell':'Seasonal operable shell';
  if($('reportVentSnapshot'))$('reportVentSnapshot').textContent=`${fmt(d.ach)} ACH • ${fmt(x.ventFlow,0)} m³/h`;
  if($('reportEnergySnapshot'))$('reportEnergySnapshot').textContent=`${fmt(state.self.pv)} kWp + ${fmt(state.self.battery)} kWh`;
  if($('reportWaterSnapshot'))$('reportWaterSnapshot').textContent=`${fmt0(state.self.water)} L • ${fmt(self.waterDays)} days`;
  if($('reportClimateSummary'))$('reportClimateSummary').textContent=climateGuidance();
  if($('reportDesignStrategy'))$('reportDesignStrategy').textContent=a.story;
  if($('reportAirflowMeaning'))$('reportAirflowMeaning').textContent=climateType()==='HOT / SUMMER'?'Low-level inlets + high-level exhaust support cross ventilation.':climateType()==='HIGH-ALTITUDE COLD'?'Controlled low-rate fresh-air path limits unnecessary heat loss.':'Operable cross-flow openings support seasonal purge ventilation.';
  if($('reportSelfExplain'))$('reportSelfExplain').textContent=`Energy coverage is ${fmt0(self.coverage)}% of the estimated daily electricity demand under the current solar profile. Water storage is ${fmt0(state.self.water)} L. Ventilation is ${fmt(d.ach)} air changes per hour (ACH), meaning the equivalent of ${fmt(x.ventFlow)} m³ of internal air volume exchanged each hour at the selected setting.`;
  if($('reportBudgetRange'))$('reportBudgetRange').textContent=`Average: ${moneyLakh(cost.average)} • indicative range: ${moneyLakh(cost.low)} – ${moneyLakh(cost.high)}`;
}

function reportHTML(x,cost,self){
  const d=x.d,m=x.m,c=state.climate,a=archetype();
  const costRows=Object.entries(cost.costs).map(([k,v])=>`<tr><td>${escapeHtml(k)}</td><td>${money(v)}</td></tr>`).join('');
  const hourly=c.temp.map((t,i)=>`<tr><td>${displayHour(c.times[i],i)}</td><td>${fmt(t)} °C</td><td>${fmt0(c.solar[i])} W/m²</td><td>${fmt0(c.wind[i])} km/h</td><td>${fmt(x.T[i])} °C</td></tr>`).join('');
  return `<div class="report-doc-header"><p class="eyebrow">OASIS design report</p><h1>Climate-responsive shelter model</h1><p>${escapeHtml(c.place)} • ${escapeHtml(climateType())} • ${escapeHtml(a.name)} • generated ${new Date().toLocaleString()}</p></div>
  <div class="report-note">This is a concept-stage decision-support model. Validate structural, thermal, fire, snow/wind, ventilation, water and electrical requirements before construction or procurement.</div>
  <div class="report-doc-grid"><table class="report-table"><tr><th>Site</th><td>${escapeHtml(c.place)}</td></tr><tr><th>Coordinates</th><td>${c.lat.toFixed(4)}, ${c.lon.toFixed(4)}</td></tr><tr><th>Elevation</th><td>${fmt0(c.elevation)} m</td></tr><tr><th>Climate type</th><td>${escapeHtml(climateType())}</td></tr></table><table class="report-table"><tr><th>Footprint</th><td>${fmt(x.floor)} m²</td></tr><tr><th>Volume</th><td>${fmt(x.volume)} m³</td></tr><tr><th>Orientation</th><td>${Math.round(d.orientation)}° (${orientationLabel(d.orientation)})</td></tr><tr><th>Ventilation setting</th><td>${escapeHtml(d.ventMode)} • ${fmt(d.ach)} air changes/hour</td></tr></table></div>
  <div class="report-doc-section"><h2>1. Climate-driven design strategy</h2><table class="report-table"><tr><th>Archetype</th><th>Why the model changes</th></tr><tr><td>${escapeHtml(a.name)}</td><td>${escapeHtml(a.story)}</td></tr><tr><td>Current climate</td><td>${escapeHtml(climateGuidance())}</td></tr><tr><td>Airflow meaning</td><td>${escapeHtml(climateType()==='HOT / SUMMER'?'Low-level inlets feed a cross-flow path and the roof outlet releases warmer air.':climateType()==='HIGH-ALTITUDE COLD'?'A controlled low-rate path provides fresh air while limiting uncontrolled losses.':'Operable openings support seasonal cross-flow and purge ventilation.')}</td></tr></table></div>
  <div class="report-doc-section"><h2>2. Design configuration</h2><table class="report-table"><tr><th>Parameter</th><th>Value</th><th>Model meaning</th></tr><tr><td>Dimensions</td><td>${fmt(d.length)} × ${fmt(d.width)} × ${fmt(d.height)} m</td><td>Rectangular base volume used by the thermal model and ANSYS seed.</td></tr><tr><td>Glazing</td><td>${Math.round(d.glazing*100)}% • ${fmt(x.glazingArea)} m²</td><td>Solar aperture and opening area factor.</td></tr><tr><td>Thermal mass</td><td>${fmt(d.mass)} m³</td><td>Internal storage included in the RC predictor.</td></tr><tr><td>Wall assembly</td><td>${escapeHtml(m.name)}</td><td>U = ${m.u.toFixed(2)} W/m²K; ${money(m.cost)}/m² indicative.</td></tr></table></div>
  <div class="report-doc-section"><h2>3. Thermal performance</h2><table class="report-table"><tr><th>Metric</th><th>Result</th><th>Meaning</th></tr><tr><td>Indoor minimum</td><td>${fmt(x.minIndoor)} °C</td><td>Lowest predicted indoor air temperature in the 24-hour concept run.</td></tr><tr><td>Indoor maximum</td><td>${fmt(x.maxIndoor)} °C</td><td>Highest predicted indoor air temperature in the 24-hour concept run.</td></tr><tr><td>Useful solar gain</td><td>${fmt(x.totalGain)} kWh / 24 h</td><td>Solar energy entering through the modelled glazing after SHGC and shading factors.</td></tr><tr><td>Thermal capacity</td><td>${fmt(x.capacity/1e6,2)} MJ/K</td><td>Approximate energy storage per degree of temperature change from air + mass.</td></tr><tr><td>Heat-loss coefficient</td><td>${fmt(x.effectiveUA)} W/K</td><td>Combined envelope and ventilation heat-loss tendency.</td></tr></table></div>
  <div class="report-doc-section"><h2>4. 24-hour climate + indoor prediction</h2><table class="report-table"><tr><th>Hour</th><th>Ambient</th><th>Solar</th><th>Wind</th><th>Indoor</th></tr>${hourly}</table></div>
  <div class="report-doc-section"><h2>5. Materials comparison</h2><table class="report-table"><tr><th>Assembly</th><th>U-value</th><th>Vol. heat capacity</th><th>Indicative cost</th></tr>${Object.values(state.materials).map(mm=>`<tr><td>${escapeHtml(mm.name)}</td><td>${mm.u.toFixed(2)} W/m²K</td><td>${fmt(mm.rho*mm.cp/1e6,2)} MJ/m³K</td><td>${money(mm.cost)}/m²</td></tr>`).join('')}</table></div>
  <div class="report-doc-section"><h2>6. Self-sufficiency systems</h2><table class="report-table"><tr><th>System</th><th>Capacity</th><th>What it means</th></tr><tr><td>Solar PV</td><td>${fmt(state.self.pv)} kWp</td><td>Planned solar array size; estimated generation ≈ ${fmt(self.generation)} kWh/day using the current solar profile.</td></tr><tr><td>Battery</td><td>${fmt(state.self.battery)} kWh</td><td>Stored electrical energy for periods when PV generation is lower than demand.</td></tr><tr><td>Water storage</td><td>${fmt0(state.self.water)} L</td><td>Concept tank capacity; ≈ ${fmt(self.waterDays)} days at the 240 L/day allowance used by this prototype.</td></tr><tr><td>Ventilation</td><td>${fmt(d.ach)} ACH</td><td><strong>ACH = air changes per hour.</strong> At this volume it represents ≈ ${fmt(x.ventFlow)} m³/h of equivalent air exchange.</td></tr><tr><td>Energy coverage</td><td>${fmt0(self.coverage)}%</td><td>Estimated share of the prototype daily electricity demand supplied by PV under the current profile.</td></tr></table></div>
  <div class="report-doc-section"><h2>7. Average cost budget</h2><table class="report-table"><tr><th>Item</th><th>Indicative cost</th></tr>${costRows}<tr><th>Contingency / local variation</th><th>${money(cost.contingency)}</th></tr><tr><th>Average concept budget</th><th>${moneyLakh(cost.average)}</th></tr><tr><th>Indicative range</th><th>${moneyLakh(cost.low)} – ${moneyLakh(cost.high)}</th></tr></table><p class="report-note">Budget is an indicative planning estimate. Local labour, material availability, transport, snow/wind requirements and procurement rates can change the actual cost.</p></div>
  <div class="report-doc-section"><h2>8. ANSYS projection + airflow</h2><table class="report-table"><tr><th>Geometry</th><td>${fmt(d.length)} × ${fmt(d.width)} × ${fmt(d.height)} m rectangular base volume</td></tr><tr><th>Thermal capacity</th><td>${fmt(x.capacity/1e6,2)} MJ/K</td></tr><tr><th>Airflow model</th><td>${escapeHtml(a.name)} • ${fmt(d.ach)} ACH • ≈ ${fmt(x.ventFlow)} m³/h equivalent air exchange</td></tr><tr><th>Interpretation</th><td>${escapeHtml(climateType()==='HOT / SUMMER'?'Blue paths show air entering at low openings, crossing the occupied zone and exiting high.':climateType()==='HIGH-ALTITUDE COLD'?'Blue paths show a short, controlled fresh-air route; the goal is controlled ventilation rather than maximum flow.':'Blue paths show an operable cross-flow route through the occupied zone, with an upper purge path available when needed.')}</td></tr></table><p class="report-note">The airflow drawing is a communication model, not a CFD solution. The APDL export is a rectangular geometry/thermal seed that should be refined in ANSYS before engineering use.</p></div>`;
}

function viewReport(){const x=updateLatest(),cost=renderCost(x),self=renderSelf();renderReportData(x,cost,self);$('reportContent').innerHTML=reportHTML(x,cost,self);$('reportDialog').showModal();}
function downloadReport(){const x=updateLatest(),cost=renderCost(x),self=renderSelf();renderReportData(x,cost,self);const body=reportHTML(x,cost,self);const doc=`<!doctype html><html><head><meta charset="utf-8"><title>OASIS Design Report</title><style>body{font-family:Arial,sans-serif;max-width:1000px;margin:40px auto;padding:0 24px;color:#17394f;line-height:1.5}table{width:100%;border-collapse:collapse;margin:10px 0 20px}th,td{padding:8px;border-bottom:1px solid #d8dfdc;text-align:left;vertical-align:top}th{background:#edf3f1}.eyebrow{font-size:11px;letter-spacing:1px;color:#3a7696;text-transform:uppercase}.report-note{padding:12px;background:#e7f0ed;border-left:3px solid #2e957e}.report-doc-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.report-doc-section{margin-top:22px}</style></head><body>${body}</body></html>`;const a=document.createElement('a');const url=URL.createObjectURL(new Blob([doc],{type:'text/html'}));a.href=url;a.download='OASIS_design_report.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),500);toast('Full report downloaded.');}
function printReport(){const x=updateLatest(),cost=renderCost(x),self=renderSelf();const body=reportHTML(x,cost,self);const win=window.open('', '_blank');if(!win){toast('Pop-up blocked. Allow pop-ups to print the report.');return;}win.document.write(`<!doctype html><html><head><title>OASIS Design Report</title><style>body{font-family:Arial,sans-serif;max-width:1000px;margin:30px auto;padding:0 22px;color:#17394f}table{width:100%;border-collapse:collapse;margin:10px 0 20px}th,td{padding:8px;border-bottom:1px solid #ccd8d5;text-align:left;vertical-align:top}th{background:#edf3f1}.report-note{padding:12px;background:#e7f0ed;border-left:3px solid #2e957e}.report-doc-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}</style></head><body>${body}</body></html>`);win.document.close();win.focus();setTimeout(()=>win.print(),300);}

function ansysText(){
  const x=updateLatest(),d=x.d,m=x.m,c=state.climate,type=climateType(),a=archetype();
  const hourly=c.temp.map((t,i)=>`! ${String(i).padStart(2,'0')}:00  Tamb=${t.toFixed(1)} C  Solar=${c.solar[i].toFixed(0)} W/m2  Wind=${c.wind[i].toFixed(1)} km/h`).join('\n');
  const openingType=type==='HOT / SUMMER'?'LOW-LEVEL INLETS + HIGH-LEVEL EXHAUST':type==='HIGH-ALTITUDE COLD'?'CONTROLLED LOW-RATE INTAKE/EXHAUST':'OPERABLE CROSS-FLOW';
  return `! ====================================================================\n! OASIS — ANSYS MAPDL RECTANGULAR THERMAL + AIRFLOW HANDOFF SEED\n! Site: ${c.place}\n! Archetype: ${a.name}\n! Concept-stage values: review/refine before engineering use.\n! ====================================================================\n/CLEAR\n/FILNAME,OASIS_${type.replace(/[^A-Z0-9]+/gi,'_').replace(/^_+|_+$/g,'').toLowerCase()},1\n/PREP7\n! --- Named design parameters ---\n*SET,LENGTH,${d.length.toFixed(3)}\n*SET,WIDTH,${d.width.toFixed(3)}\n*SET,HEIGHT,${d.height.toFixed(3)}\n*SET,GLAZE_PCT,${(d.glazing*100).toFixed(1)}\n*SET,GLAZE_AREA,${x.glazingArea.toFixed(3)}\n*SET,THERM_MASS,${d.mass.toFixed(3)}\n*SET,ACH,${d.ach.toFixed(3)}\n*SET,AIRFLOW_M3H,${x.ventFlow.toFixed(3)}\n*SET,WALL_U,${m.u.toFixed(4)}\n*SET,WALL_K,${m.k}\n*SET,WALL_RHO,${m.rho}\n*SET,WALL_CP,${m.cp}\n! --- Thermal material ---\nET,1,SOLID70\nMP,KXX,1,WALL_K\nMP,C,1,WALL_CP\nMP,DENS,1,WALL_RHO\n! --- Insulation material ---\nMP,KXX,2,0.036\nMP,C,2,840\nMP,DENS,2,45\n! --- Thermal mass material ---\nMP,KXX,3,0.60\nMP,C,3,880\nMP,DENS,3,2100\n! --- Rectangular base volume: exact L x W x H box ---\nBLOCK,0,LENGTH,0,WIDTH,0,HEIGHT\n! --- Thin inner thermal-mass block (conceptual) ---\nBLOCK,0,MIN(LENGTH*0.34,LENGTH-0.40),WIDTH*0.16,WIDTH*0.84,0.15,MIN(HEIGHT*0.72,1.90)\nALLSEL,ALL\nTYPE,1\nMAT,1\nESIZE,0.30\nVMESH,ALL\n! --- Opening / airflow intent ---\n! ${openingType}\n! Ventilation setpoint = ${d.ach.toFixed(2)} air changes/hour = ${x.ventFlow.toFixed(2)} m3/h equivalent\n! Build an explicit air-domain volume in CFD/Fluent for the opening layout.\n! Use the following OASIS series as transient thermal boundary data.\n! --- 24-hour weather series ---\n${hourly}\n/SOLU\nANTYPE,TRANS\nTRNOPT,FULL\nTIMINT,ON\nDELTIM,3600\nTUNIF,${d.initial.toFixed(2)}\n! Apply convection on exposed exterior surfaces.\n! Apply hourly solar HFLUX on the modelled solar/opening surfaces.\n! For CFD, use an air volume with the opening map above and impose the listed ACH as the initial ventilation condition.\n! OASIS concept outputs: useful solar=${x.totalGain.toFixed(3)} kWh/24h; UA=${x.ua.toFixed(3)} W/K; capacity=${(x.capacity/1e6).toFixed(3)} MJ/K.\n/POST1\nPLNSOL,TEMP\nFINISH\n`;
}
function downloadAPDL(){const a=document.createElement('a');const url=URL.createObjectURL(new Blob([ansysText()],{type:'text/plain'}));a.href=url;a.download='OASIS_ansys_rectangular_thermal_airflow_model.inp';a.click();setTimeout(()=>URL.revokeObjectURL(url),500);toast('Current ANSYS handoff downloaded.');}
function copySummary(){const x=updateLatest(),c=state.climate,self=renderSelf(),cost=renderCost(x);const text=`OASIS MODEL\nSite: ${c.place}\nClimate: ${climateType()}\nArchetype: ${archetype().name}\nGeometry: ${x.d.length} × ${x.d.width} × ${x.d.height} m\nMaterial: ${x.m.name}\nThermal: ${x.minIndoor.toFixed(1)} to ${x.maxIndoor.toFixed(1)} °C\nThermal capacity: ${(x.capacity/1e6).toFixed(2)} MJ/K\nAverage budget: ${moneyLakh(cost.average)}\nPV: ${state.self.pv.toFixed(1)} kWp\nBattery: ${state.self.battery.toFixed(1)} kWh\nWater: ${Math.round(state.self.water)} L\nVentilation: ${x.d.ach.toFixed(1)} air changes/hour (${x.ventFlow.toFixed(0)} m³/h)`; navigator.clipboard?.writeText(text).then(()=>toast('Model summary copied.')).catch(()=>toast('Clipboard access is unavailable in this browser.'));}
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast._timer);toast._timer=setTimeout(()=>t.classList.remove('show'),2300);}

function refreshReport(){const x=updateLatest(),cost=renderCost(x),self=renderSelf();renderReportData(x,cost,self);}
function go(module){
  const el=$(`module-${module}`);if(!el)return;qsa('.module').forEach(m=>m.classList.remove('active'));el.classList.add('active');qsa('.module-tab').forEach(t=>t.classList.toggle('active',t.dataset.module===module));state.activeModule=module;
  const idx=['site','climate','build','materials','thermal','self','ansys','report'].indexOf(module)+1;$('workflowProgress').textContent=`0${idx} / 08`;
  window.scrollTo({top:document.querySelector('.module-nav').offsetTop-8,behavior:'smooth'});
  if(state.latest){ if(module==='build')drawPlan(state.latest.d); if(module==='materials')renderMaterials(state.latest); if(module==='climate')drawClimateProfile(); if(module==='ansys'){draw3D(state.latest);renderAirflowExplainer();} if(module==='report')refreshReport(); if(module==='self')renderSelf(); if(module==='thermal'){drawTemperatureChart(state.latest);drawThermalField(state.latest);} }
}

function runModel(){
  const x=updateLatest();updateBuildLabels();updateSiteCards();drawPlan(x.d);renderMaterials(x);drawTemperatureChart(x);drawThermalField(x);draw3D(x);renderAirflowExplainer();
  const self=renderSelf(),cost=renderCost(x);renderReportData(x,cost,self);
  $('modelDimensions').textContent=`${fmt(x.d.length)} × ${fmt(x.d.width)} × ${fmt(x.d.height)} m`;$('ansysMass').textContent=`${fmt(x.capacity/1e6,2)} MJ/K`;$('ansysAch').textContent=`${fmt(x.d.ach)} ACH`;$('minIndoor').textContent=`${fmt(x.minIndoor)}°`;$('maxIndoor').textContent=`${fmt(x.maxIndoor)}°`;$('solarGain').innerHTML=`${fmt(x.totalGain)} <i>kWh</i>`;$('thermalCapacity').innerHTML=`${fmt(x.capacity/1e6,2)} <i>MJ/K</i>`;$('heatLossCoeff').innerHTML=`${fmt(x.effectiveUA)} <i>W/K</i>`;
  if($('ansysFlow'))$('ansysFlow').textContent=`${fmt(x.ventFlow,0)} m³/h`;
  return x;
}

// Navigation
qsa('.module-tab,[data-go]').forEach(el=>el.addEventListener('click',()=>go(el.dataset.module||el.dataset.go)));
$('manualBtn').addEventListener('click',()=>$('manualPanel').classList.toggle('hidden'));
$('loadManualBtn').addEventListener('click',()=>loadWeather($('latInput').value,$('lonInput').value));
$('locateBtn').addEventListener('click',locate);
$('autoAdapt').addEventListener('change',e=>{state.autoAdapt=e.target.checked;if(state.autoAdapt){applyClimatePreset(null,false);runModel();}else toast('Auto-adaptation paused; design inputs are now manual.');});
$('designForm').addEventListener('input',()=>{state.self.vent=design().ach;runModel();});
qsa('[data-preset]').forEach(b=>b.addEventListener('click',()=>{const p=b.dataset.preset==='compact'?'cold':b.dataset.preset==='summer'?'summer':'balanced';applyClimatePreset(p);runModel();}));
$('materialForm').addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(e.target),name=String(fd.get('name')||'').trim();if(!name){toast('Enter a material name.');return;}const slug='custom_'+Date.now();state.materials[slug]={name,u:finite(fd.get('u'),.30),k:finite(fd.get('k'),.08),rho:finite(fd.get('rho'),120),cp:finite(fd.get('cp'),1200),cost:finite(fd.get('cost'),1200),note:'User-added material for concept comparison.'};const select=qs('[name="wall"]');select.add(new Option(state.materials[slug].name,slug));select.value=slug;state.selectedMaterial=slug;e.target.reset();runModel();toast('Custom material added to the comparison.');});
['pvSize','batterySize','waterSize','ventSize'].forEach(id=>$(id).addEventListener('input',e=>{const map={pvSize:'pv',batterySize:'battery',waterSize:'water',ventSize:'vent'};state.self[map[id]]=finite(e.target.value,0);runModel();}));
$('thermalToggle').addEventListener('click',e=>{state.thermalColours=!state.thermalColours;e.currentTarget.classList.toggle('active',state.thermalColours);if(state.latest)draw3D(state.latest);});
$('airflowToggle').addEventListener('click',e=>{state.airflow=!state.airflow;e.currentTarget.classList.toggle('active',state.airflow);if(state.latest){draw3D(state.latest);renderAirflowExplainer();}});
$('downloadBtn').addEventListener('click',downloadAPDL);$('copyModelBtn').addEventListener('click',copySummary);$('viewReportBtn').addEventListener('click',viewReport);$('downloadReportBtn').addEventListener('click',downloadReport);$('printReportBtn').addEventListener('click',printReport);$('downloadReportBtn2').addEventListener('click',downloadReport);$('printReportBtn2').addEventListener('click',printReport);$('downloadReportBtnBottom')?.addEventListener('click',downloadReport);$('printReportBtnBottom')?.addEventListener('click',printReport);$('closeReportBtn').addEventListener('click',()=>$('reportDialog').close());$('recalculateBtn').addEventListener('click',()=>{runModel();toast('Model recalculated.');});

setup3D();
const wallSelect=qs('[name="wall"]');if(wallSelect){wallSelect.innerHTML='';Object.entries(state.materials).forEach(([key,m])=>wallSelect.add(new Option(m.name,key)));wallSelect.value=state.selectedMaterial;wallSelect.addEventListener('change',e=>{state.selectedMaterial=e.target.value;runModel();});}

updateSiteCards();applyClimatePreset(null,false);runModel();
