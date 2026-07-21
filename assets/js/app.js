const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const clone = (v) => JSON.parse(JSON.stringify(v));
const esc = (v='') => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const fmt = (n, d=0) => Number(n).toLocaleString(undefined,{minimumFractionDigits:d,maximumFractionDigits:d});
const uid = (p='ID') => `${p}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;

const NAV = [
  {section:'CONTROL TOWER'},
  {id:'dashboard',label:'Cargo Mission Control',icon:'◈'},
  {id:'workflows',label:'Atlas Workflow Center',icon:'▶',badge:'5'},
  {id:'runbook',label:'Operations Briefing',icon:'▤'},
  {section:'CARGO EXECUTION'},
  {id:'outbound',label:'Outbound Operations',icon:'↗'},
  {id:'inbound',label:'Inbound Operations',icon:'↙'},
  {id:'wms',label:'WMS Workbench',icon:'▦'},
  {section:'ASSURANCE'},
  {id:'reports',label:'Reporting Center',icon:'▥',badge:'7'},
  {id:'maintenance',label:'Maintenance & SLA',icon:'⚙'},
  {id:'integration',label:'Integration Monitor',icon:'⇄'},
  {id:'requirements',label:'Atlas Traceability',icon:'✓'},
  {id:'data',label:'Operational Data Explorer',icon:'⌘'}
];

const TITLES = {
  dashboard:['OPERATIONS CONTROL TOWER','Cargo Mission Control'],
  workflows:['PROJECT ATLAS','Operational Workflow Center'],
  runbook:['OPERATIONS BRIEFING','Operational Readiness Briefing'],
  outbound:['CARGO EXECUTION','Outbound: Acceptance → Build-up → Ramp'],
  inbound:['CARGO EXECUTION','Inbound: Ramp → Breakdown → Release'],
  wms:['WAREHOUSE EXECUTION','RoboOps WMS Workbench'],
  reports:['TRANSPARENCY & INSIGHT','Reporting Center'],
  maintenance:['AVAILABILITY & RESILIENCE','Maintenance & SLA Readiness'],
  integration:['SYSTEM INTEGRATION','LMS · WMS · WCS Message Control'],
  requirements:['100% REQUIREMENT COVERAGE','Project Atlas Traceability Matrix'],
  data:['OPERATIONAL DATA','Operational Data Explorer']
};

class AtlasApp {
  constructor(){
    this.state = {
      route:'dashboard', simDate:new Date('2026-07-22T09:00:00'), running:false, paused:false, speed:1,
      activeScenarioId:null, currentStep:-1, completedSteps:[], coverage:new Set(), selectedReport:'performance',
      requirementSearch:'', requirementCategory:'All', workbookSheet:'Cargo_Fucn_Req', dataTab:'shipments',
      selectedAwb:null, notifications:3, messageLog:[], schedules:[], incidentActive:false, workflowAll:false,
      briefingIndex:0
    };
  }

  async init(){
    const [req, workflows, seed] = await Promise.all([
      fetch('data/requirements.json').then(r=>r.json()),
      fetch('data/scenarios.json').then(r=>r.json()),
      fetch('data/seed-data.json').then(r=>r.json())
    ]);
    this.reqData=req; this.workflows=workflows; this.seed=seed;
    this.resetOperationalData(false);
    this.buildNav(); this.bindGlobal(); this.render();
    setInterval(()=>this.tickClock(),1000);
    if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('service-worker.js').catch(()=>{});
  }

  resetOperationalData(render=true){
    this.data=clone(this.seed);
    this.state.running=false; this.state.paused=false; this.state.currentStep=-1; this.state.completedSteps=[];
    this.state.activeScenarioId=null; this.state.coverage=new Set(); this.state.messageLog=[]; this.state.incidentActive=false;
    this.data.tasks=[
      {id:'TSK-2041',priority:'High',process:'Build-up',media:'AKE-58321',from:'ASRS-A-021',to:'BUP-03',state:'In progress',owner:'OP-018'},
      {id:'TSK-2042',priority:'Normal',process:'Acceptance',media:'BINA-0098',from:'ASRS-A-014',to:'ACCEPT-01',state:'Queued',owner:'Auto'},
      {id:'TSK-2043',priority:'Urgent',process:'Ramp outbound',media:'PMC-92216',from:'ASRS-C-008',to:'RAMP-02',state:'Completed',owner:'Auto'},
      {id:'TSK-2044',priority:'High',process:'Inbound',media:'AKE-44109',from:'RAMP-01',to:'COLD-01',state:'Completed',owner:'Auto'},
      {id:'TSK-2045',priority:'Normal',process:'Release',media:'BOXA-034',from:'BOND-04',to:'RELEASE-02',state:'Blocked',owner:'SUP-004'}
    ];
    if(render) this.render();
  }

  buildNav(){
    $('#nav').innerHTML=NAV.map(n=>n.section?`<div class="nav-section">${n.section}</div>`:
      `<button class="nav-item" data-route="${n.id}"><span class="nav-icon">${n.icon}</span><span>${n.label}</span>${n.badge?`<span class="nav-badge">${n.badge}</span>`:''}</button>`).join('');
  }

  bindGlobal(){
    document.addEventListener('click', e=>{
      const route=e.target.closest('[data-route]'); if(route){this.navigate(route.dataset.route);return;}
      const act=e.target.closest('[data-action]'); if(act){this.action(act.dataset.action,act.dataset);return;}
    });
    document.addEventListener('input', e=>{
      if(e.target.id==='requirementSearch'){this.state.requirementSearch=e.target.value;this.renderRequirementList();}
      if(e.target.id==='reportDateFrom'||e.target.id==='reportDateTo') this.state[e.target.id]=e.target.value;
    });
    document.addEventListener('change', e=>{
      if(e.target.id==='requirementCategory'){this.state.requirementCategory=e.target.value;this.renderRequirementList();}
      if(e.target.id==='workbookSheet'){this.state.workbookSheet=e.target.value;this.render();}
      if(e.target.id==='workflowSpeed'){this.state.speed=Number(e.target.value);}
      if(e.target.id==='dataTab'){this.state.dataTab=e.target.value;this.render();}
    });
    $('#launchScenarioBtn').addEventListener('click',()=>this.navigate('workflows'));
    $('#briefingModeBtn').addEventListener('click',()=>this.openBriefing());
    $('#notificationBtn').addEventListener('click',()=>{this.state.notifications=0;$('#notificationCount').textContent='0';this.toast('Notifications cleared','All current warnings are visible in the exception stream.');});
  }

  navigate(route){
    this.state.route=route;
    const t=TITLES[route]||TITLES.dashboard; $('#pageEyebrow').textContent=t[0]; $('#pageTitle').textContent=t[1];
    $$('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.route===route));
    this.render(); $('#view').focus();
  }

  tickClock(){
    this.state.simDate=new Date(this.state.simDate.getTime()+1000*(this.state.running?this.state.speed*12:1));
    $('#simTime').textContent=this.state.simDate.toLocaleTimeString('en-GB',{hour12:false});
  }

  render(){
    const map={dashboard:()=>this.dashboard(),workflows:()=>this.workflowCenter(),runbook:()=>this.runbook(),outbound:()=>this.operations('S1'),inbound:()=>this.operations('S2'),wms:()=>this.wms(),reports:()=>this.reports(),maintenance:()=>this.maintenance(),integration:()=>this.integration(),requirements:()=>this.requirements(),data:()=>this.dataExplorer()};
    $('#view').innerHTML=(map[this.state.route]||map.dashboard)();
    $('#sidebarHealth').textContent=`${fmt(this.data.kpis.availability,1)}%`;
    requestAnimationFrame(()=>this.afterRender());
  }

  afterRender(){
    if(this.state.route==='requirements') this.renderRequirementList();
    if(['dashboard','outbound','inbound','wms'].includes(this.state.route)) this.positionToken();
  }

  action(action, ds){
    const fn={
      selectScenario:()=>this.selectScenario(ds.id), startScenario:()=>this.startScenario(ds.id), runAll:()=>this.runAllScenarios(),
      pauseScenario:()=>this.pauseScenario(), nextStep:()=>this.nextStep(true), resetWorkflows:()=>this.resetWorkflows(),
      reportException:()=>this.reportException(ds.type||'destination'), openRequirement:()=>this.openRequirement(ds.id),
      jumpRequirement:()=>this.jumpRequirement(ds.id), selectReport:()=>{this.state.selectedReport=ds.id;this.render();},
      generateReport:()=>this.generateReport(), exportReport:()=>this.exportReport(), scheduleReport:()=>this.scheduleReport(),
      triggerFault:()=>this.triggerFault(ds.id||'TTV-01'), recoverMachine:()=>this.recoverMachine(ds.id),
      replayMessage:()=>this.replayMessage(ds.id), registerInterfaceIncident:()=>this.registerInterfaceIncident(),
      clearMessages:()=>{this.state.messageLog=[];this.render();}, filterRequirements:()=>{this.state.requirementCategory=ds.category;this.render();},
      setDataTab:()=>{this.state.dataTab=ds.tab;this.render();}, resetData:()=>{this.resetOperationalData();this.toast('Operational data restored','Terminal data has been restored to the approved baseline.');},
      downloadJson:()=>this.downloadJson(), closeModal:()=>this.closeModal(), openBriefing:()=>this.openBriefing(), closeBriefing:()=>this.closeBriefing(),
      briefingNext:()=>this.briefingMove(1), briefingPrev:()=>this.briefingMove(-1), fullscreen:()=>document.documentElement.requestFullscreen?.(),
      completeTask:()=>this.completeTask(ds.id), createCommand:()=>this.createManualCommand(), showAwb:()=>this.showAwb(ds.id),
      toggleWorkbook:()=>{this.state.workbookSheet=ds.sheet;this.render();}, printReport:()=>window.print()
    }[action]; if(fn) fn();
  }

  toast(title,detail='',kind=''){
    const el=document.createElement('div'); el.className=`toast ${kind}`; el.innerHTML=`<strong>${esc(title)}</strong><span>${esc(detail)}</span>`;$('#toastLayer').append(el);setTimeout(()=>el.remove(),4200);
  }

  addEvent(title,detail,type='info'){
    const time=this.state.simDate.toLocaleTimeString('en-GB',{hour12:false});
    this.data.events.unshift({time,type,title,detail}); this.data.events=this.data.events.slice(0,40);
  }

  currentScenario(){return this.workflows.find(s=>s.id===this.state.activeScenarioId);}

  selectScenario(id){this.state.activeScenarioId=id;this.state.currentStep=-1;this.state.completedSteps=[];this.state.running=false;this.render();}

  startScenario(id){
    if(id) this.selectScenario(id);
    if(!this.state.activeScenarioId) this.state.activeScenarioId='S1';
    this.state.running=true;this.state.paused=false;this.state.currentStep=-1;this.state.completedSteps=[];
    this.toast(`Workflow ${this.currentScenario().number} started`,this.currentScenario().name);
    this.nextStep();
  }

  pauseScenario(){
    this.state.paused=!this.state.paused;this.state.running=!this.state.paused;
    this.toast(this.state.paused?'Workflow paused':'Workflow resumed',this.currentScenario()?.name||'');
    this.render(); if(!this.state.paused) this.nextStep();
  }

  nextStep(manual=false){
    if(!this.state.activeScenarioId) return this.startScenario('S1');
    const sc=this.currentScenario();
    if(this.state.currentStep>=sc.steps.length-1){this.finishScenario();return;}
    this.state.running=true;this.state.paused=false;this.state.currentStep++;
    const step=sc.steps[this.state.currentStep]; this.executeStep(sc,step);
    this.render();
    if(!manual) setTimeout(()=>{if(this.state.running&&!this.state.paused)this.nextStep();},Math.max(450,1500/this.state.speed));
  }

  executeStep(sc,step){
    this.state.completedSteps.push(step.id);
    (step.requirements||[]).forEach(id=>this.state.coverage.add(id.split('.').slice(0,1).join('.')));
    this.addEvent(`${step.event}: ${step.title}`,`${step.system} · ${step.action}`,'success');
    this.state.messageLog.unshift({id:uid('MSG'),time:this.state.simDate.toLocaleTimeString('en-GB',{hour12:false}),direction:step.system==='LMS'?'LMS → WMS':'WMS → LMS',event:step.event,status:'ACK',payload:{scenario:sc.id,step:step.id,awb:this.workflowAwb(sc.id),location:step.location,correlationId:uid('CORR')}});
    this.data.kpis.commandsToday+=1;
    this.data.kpis.avgCycle=Math.max(31,this.data.kpis.avgCycle-(this.state.currentStep%3===0?1:0));
    if(sc.id==='S1') this.applyOutboundStep(this.state.currentStep);
    if(sc.id==='S2') this.applyInboundStep(this.state.currentStep);
    if(sc.id==='S3') this.data.kpis.sla=Math.min(99,this.data.kpis.sla+.4);
    if(sc.id==='S4'&&this.state.currentStep===1) this.triggerFault('TTV-01',false);
    if(sc.id==='S4'&&this.state.currentStep===3) this.recoverMachine('TTV-01',false);
    if(sc.id==='S5'&&this.state.currentStep===4) this.registerInterfaceIncident(false);
  }

  workflowAwb(id){return id==='S2'?'232-18945571':'232-48392175';}

  applyOutboundStep(i){
    const ship=this.data.shipments.find(x=>x.awb==='232-48392175');
    const states=['Booking Ready','Media Requested','Media In-move','Accepted / FOH','ULD Stored','Build-up Retrieval','Build-up Complete','Ramp Ready / FOW','Departed'];
    ship.status=states[i]||ship.status; ship.location=['LMS','ACCEPT-01','CV-02','ACCEPT-02','ASRS-A-021','BUP-03','TTV-01','RAMP-02','AIRCRAFT'][i]||ship.location;
    this.data.kpis.tasksOpen=Math.max(8,this.data.kpis.tasksOpen-(i%2));
  }

  applyInboundStep(i){
    const ship=this.data.shipments.find(x=>x.awb==='232-18945571');
    const states=['Arrived / RCF','Ramp Check-in / FIW','TTS Routed','Breakdown Ready','Breakdown Active','Stored BCS/CSS','Release Authorized','Delivered / DLV'];
    ship.status=states[i]||ship.status; ship.location=['RAMP-01','RAMP-01','COLD-01','BRK-02','BRK-02','ASRS-B-018','RELEASE-02','GATE-OUT'][i]||ship.location;
  }

  finishScenario(){
    const sc=this.currentScenario(); this.state.running=false;this.state.paused=false;
    this.toast(`Workflow ${sc.number} complete`,`${sc.name} completed end-to-end.`);
    this.addEvent(`Workflow ${sc.number} completed`,`${sc.steps.length} steps · requirements evidence captured`,'success');
    if(this.state.workflowAll){const idx=this.workflows.findIndex(x=>x.id===sc.id);if(idx<this.workflows.length-1)setTimeout(()=>this.startScenario(this.workflows[idx+1].id),1000);else{this.state.workflowAll=false;this.toast('All Atlas workflows complete','Five workflows completed with operational evidence.');}}
    this.render();
  }

  runAllScenarios(){this.state.workflowAll=true;this.startScenario('S1');}
  resetWorkflows(){this.state.running=false;this.state.paused=false;this.state.currentStep=-1;this.state.completedSteps=[];this.state.activeScenarioId=null;this.state.workflowAll=false;this.render();this.toast('Workflow reset','Ready for operator-controlled execution.');}

  reportException(type){
    const map={destination:['Destination occupied','RAMP-02 is occupied. Alternate RAMP-03 recommended.'],machine:['Machine fault','ASRS-CRN-02 fault during transfer. Maintenance ticket created.'],location:['Location unavailable','Requested ASRS slot is unavailable. Dynamic re-slotting initiated.'],weight:['Weight mismatch','UWS final weight differs by 3.2%. Supervisor review required.']};
    const x=map[type]||map.destination;this.data.kpis.openExceptions++;this.state.notifications++;$('#notificationCount').textContent=this.state.notifications;
    this.addEvent(x[0],x[1],'warn');this.toast(x[0],x[1],'warn');this.render();
  }

  positionToken(){
    const token=$('#cargoToken');if(!token)return;
    const sc=this.currentScenario();let i=this.state.currentStep;
    const outbound=[[12,21],[25,31],[43,40],[17,28],[43,28],[77,22],[73,35],[79,72],[92,75]];
    const inbound=[[88,72],[81,71],[15,79],[73,50],[65,54],[44,55],[45,80],[57,87]];
    const p=(sc?.id==='S2'?inbound:outbound)[Math.max(0,i)]||[12,21];token.style.left=`${p[0]}%`;token.style.top=`${p[1]}%`;
  }

  dashboard(){
    const k=this.data.kpis; const active=this.currentScenario();
    return `
      <section class="grid grid-4">
        ${this.kpi('System availability',`${fmt(k.availability,1)}%`,`Target ≥ 98% · ${k.availability>=98?'Within SLA':'At risk'}`)}
        ${this.kpi('Open exceptions',k.openExceptions,`${k.openExceptions<=3?'Controlled':'Needs attention'}`,k.openExceptions>4?'warn':'')}
        ${this.kpi('Average cargo cycle',`${k.avgCycle} min`,'↓ 8% vs operating baseline')}
        ${this.kpi('LMS commands today',fmt(k.commandsToday),'99.96% acknowledged')}
      </section>
      <section class="layout-main" style="margin-top:16px">
        <div class="card">
          <div class="card-header"><div><div class="card-title">Live Cargo Terminal Digital Map</div><div class="card-sub">LMS orchestrates · WMS decides and confirms · WCS executes</div></div><div class="card-actions"><span class="badge success">● Live</span><button class="ghost-btn" data-action="reportException" data-type="destination">Report exception</button></div></div>
          ${this.terminalMap()}
        </div>
        <div class="card">
          <div class="card-header"><div><div class="card-title">Operational Event Stream</div><div class="card-sub">Commands, milestones, faults and actual movements</div></div><span class="badge">${this.data.events.length} events</span></div>
          ${this.eventList(12)}
        </div>
        <div class="card span-all">
          <div class="card-header"><div><div class="card-title">Project Atlas Operational Readiness</div><div class="card-sub">Every workflow is traceable to the workbook and supported by live operational telemetry.</div></div><button class="primary-btn" data-route="workflows">Open workflow center</button></div>
          ${this.scenarioCards()}
        </div>
      </section>`;
  }

  kpi(label,value,meta,kind=''){return `<div class="card kpi-card"><div class="kpi-label">${esc(label)}</div><div class="kpi-value">${esc(value)}</div><div class="kpi-meta ${kind}">${esc(meta)}</div></div>`;}

  terminalMap(){return `<div class="terminal-map">
    <div class="zone accept">Zone 01<strong>Acceptance</strong><small>RCS / FOH · BINA / BOXA</small></div>
    <div class="zone asrs">Zone 02<strong>Automated Storage</strong><small>ULD · IHCA · BCS · CSS</small><div style="margin-top:18px;display:grid;gap:12px"><span><i class="machine-dot"></i> Crane 01 · Running</span><span><i class="machine-dot ${this.state.incidentActive?'down':''}"></i> Crane 02 · ${this.state.incidentActive?'Fault':'Running'}</span></div></div>
    <div class="zone bup">Zone 03<strong>Build-up / UWS</strong><small>TTV · final weight</small></div>
    <div class="zone ramp">Zone 04<strong>Ramp Conveyors</strong><small>FIW / FOW · flight display</small></div>
    <div class="zone cold">Special Zone<strong>Auto Cold Room</strong><small>TTS / Pharma</small></div>
    <div class="zone release">Zone 06<strong>Import Release</strong><small>DLV · purge · empty media</small></div>
    <i class="conveyor c1"></i><i class="conveyor c2"></i><i class="conveyor c3"></i><i class="conveyor c4"></i>
    <div class="cargo-token" id="cargoToken">ULD</div></div>`;}

  eventList(limit=20){return `<div class="event-list">${this.data.events.slice(0,limit).map(e=>`<div class="event-row"><div class="event-time">${e.time}</div><i class="event-bullet ${e.type}"></i><div><div class="event-title">${esc(e.title)}</div><div class="event-detail">${esc(e.detail)}</div></div></div>`).join('')}</div>`;}

  scenarioCards(selected=this.state.activeScenarioId){return `<div class="scenario-strip">${this.workflows.map(s=>`<article class="scenario-card ${selected===s.id?'selected':''}" data-action="selectScenario" data-id="${s.id}"><div class="scenario-no">WORKFLOW ${s.number}</div><div class="scenario-name">${s.icon} ${esc(s.short)}</div><div class="scenario-desc">${esc(s.name)}</div><div class="scenario-meta"><span class="badge">${s.steps.length} steps</span><span class="badge success">Ready</span></div></article>`).join('')}</div>`;}

  workflowCenter(){
    const sc=this.currentScenario()||this.workflows[0]; const idx=this.state.currentStep;
    return `<div class="grid">
      <div class="card"><div class="card-header"><div><div class="card-title">Select an operational workflow</div><div class="card-sub">Execute a workflow step-by-step or run the complete Project Atlas operating sequence.</div></div><div class="card-actions"><button class="ghost-btn" data-action="resetWorkflows">Reset</button><button class="secondary-btn" data-action="runAll">Execute all 5</button></div></div>${this.scenarioCards(sc.id)}</div>
      <div class="workflow-runner">
        <div class="card flat"><div class="card-header"><div><div class="card-title">Workflow steps</div><div class="card-sub">Operator-controlled sequence</div></div></div><div class="runbook">${sc.steps.map((st,i)=>`<div class="run-step ${idx===i?'active':''} ${this.state.completedSteps.includes(st.id)?'complete':''}"><div class="step-index">${this.state.completedSteps.includes(st.id)?'✓':i+1}</div><div><div class="run-step-title">${esc(st.title)}</div><div class="run-step-sub">${esc(st.sub)}</div></div></div>`).join('')}</div></div>
        <div class="card workflow-stage"><div class="card-header"><div><span class="badge info">Workflow ${sc.number}</span><h2 style="margin-top:10px">${esc(sc.name)}</h2><p>${esc(sc.purpose)}</p></div><span class="badge success">${this.state.running?'Running':idx>=sc.steps.length-1?'Complete':'Ready'}</span></div>
          <div class="process-flow">${sc.steps.map((s,i)=>`<div class="process-node ${i===idx?'active':''} ${i<idx?'done':''}">${i<idx?'✓ ':''}${esc(s.title)}<small>${esc(s.system)}</small></div>${i<sc.steps.length-1?'<span class="process-arrow">→</span>':''}`).join('')}</div>
          ${idx>=0?this.stepEvidence(sc,sc.steps[idx]):`<div class="empty-state"><div class="empty-icon">▶</div><h3>Workflow ready</h3><p>Start the workflow to process LMS commands, WMS tasks, WCS execution and audit evidence.</p></div>`}
          <div class="workflow-controls"><button class="primary-btn" data-action="${this.state.running?'pauseScenario':'startScenario'}" data-id="${sc.id}">${this.state.running?'Ⅱ Pause':'▶ Start workflow'}</button><button class="secondary-btn" data-action="nextStep">Next step →</button><select class="control-select" id="workflowSpeed"><option value="1" ${this.state.speed===1?'selected':''}>1× speed</option><option value="2" ${this.state.speed===2?'selected':''}>2× speed</option><option value="4" ${this.state.speed===4?'selected':''}>4× speed</option></select><button class="danger-btn" data-action="reportException" data-type="machine">⚠ Report machine fault</button></div>
        </div>
      </div>
      <div class="grid grid-3"><div class="card"><div class="card-title">Evaluation focus</div><p class="card-sub">${esc(sc.evaluation)}</p></div><div class="card"><div class="card-title">Expected output</div><p class="card-sub">${esc(sc.output)}</p></div><div class="card"><div class="card-title">Evidence captured</div><div class="kpi-value">${this.state.completedSteps.length}/${sc.steps.length}</div><div class="kpi-meta">steps completed</div></div></div>
    </div>`;
  }

  stepEvidence(sc,step){
    const msg=this.state.messageLog[0];
    return `<div class="grid grid-2" style="margin-top:10px"><div class="card flat"><div class="eyebrow">CURRENT SYSTEM ACTION</div><h3>${esc(step.action)}</h3><div class="metric-row"><span>System owner</span><strong>${esc(step.system)}</strong></div><div class="metric-row"><span>Operational location</span><strong>${esc(step.location)}</strong></div><div class="metric-row"><span>Event / milestone</span><strong class="mono">${esc(step.event)}</strong></div></div><div class="card flat"><div class="eyebrow">INTEGRATION EVIDENCE</div><pre style="margin:10px 0 0;white-space:pre-wrap;font-size:9px;color:#b9cfdb">${esc(JSON.stringify(msg?.payload||{scenario:sc.id,step:step.id,status:'PENDING'},null,2))}</pre></div></div>`;
  }

  operations(id){
    const sc=this.workflows.find(s=>s.id===id); const relevant=this.data.shipments.filter(s=>s.direction===(id==='S1'?'Outbound':'Inbound'));
    if(!this.state.activeScenarioId) this.state.activeScenarioId=id;
    return `<div class="grid grid-4">${this.kpi('Active shipments',relevant.length,'AWB-level visibility')}${this.kpi('Tasks open',this.data.kpis.tasksOpen,'Across WMS execution')}${this.kpi(id==='S1'?'Flight cutoff risk':'Customs / release holds',id==='S1'?'1 flight':'1 shipment','Live operational queue','warn')}${this.kpi('Inventory accuracy',`${fmt(this.data.kpis.inventoryAccuracy,1)}%`,'AWB · media · location')}</div>
      <div class="layout-main" style="margin-top:16px"><div class="card"><div class="card-header"><div><div class="card-title">${esc(sc.name)} live flow</div><div class="card-sub">Use the buttons below to execute the Atlas workflow and watch cargo move across terminal zones.</div></div><button class="primary-btn" data-action="startScenario" data-id="${id}">▶ Start ${sc.short}</button></div>${this.terminalMap()}<div class="process-flow" style="margin-top:12px">${sc.steps.map((s,i)=>`<div class="process-node ${i===this.state.currentStep&&this.state.activeScenarioId===id?'active':''}">${esc(s.title)}<small>${esc(s.event)}</small></div>${i<sc.steps.length-1?'<span class="process-arrow">→</span>':''}`).join('')}</div></div>
      <div class="card"><div class="card-header"><div><div class="card-title">Milestone & exception stream</div><div class="card-sub">Operational evidence returned to LMS</div></div></div>${this.eventList(13)}</div>
      <div class="card span-all"><div class="card-header"><div><div class="card-title">Cargo shipment worklist</div><div class="card-sub">Dynamic AWB, ULD/media, flight, location and operational state</div></div><button class="ghost-btn" data-action="reportException" data-type="weight">Report weight mismatch</button></div>${this.shipmentTable(relevant)}</div></div>`;
  }

  shipmentTable(rows=this.data.shipments){return `<div class="table-wrap"><table class="data-table"><thead><tr><th>AWB</th><th>Flight / route</th><th>Type</th><th>Pieces / weight</th><th>Media</th><th>Location</th><th>Status</th><th></th></tr></thead><tbody>${rows.map(s=>`<tr><td class="strong mono">${s.awb}</td><td><strong>${s.flight}</strong><br><small>${s.route}</small></td><td><span class="badge ${s.type==='TTS'?'info':s.type==='DGR'?'danger':'success'}">${s.type}</span></td><td>${s.pieces} pcs<br>${fmt(s.weight)} kg</td><td class="mono">${s.media}</td><td>${s.location}</td><td><span class="badge ${/Hold|Blocked/.test(s.status)?'warn':'success'}">${s.status}</span></td><td><button class="ghost-btn" data-action="showAwb" data-id="${s.awb}">View</button></td></tr>`).join('')}</tbody></table></div>`;}

  wms(){return `<div class="grid grid-4">${this.kpi('Open WMS tasks',this.data.tasks.filter(t=>t.state!=='Completed').length,'Receive · move · build · release')}${this.kpi('Media in movement',this.data.media.filter(m=>m.status==='In-move').length,'Real-time transport state')}${this.kpi('Occupied locations',`${Math.round(this.data.locations.filter(l=>l.occupied).length/this.data.locations.length*100)}%`,'Dynamic location control')}${this.kpi('Scan validation', '99.7%','Wrong media/location prevention')}</div>
    <div class="layout-main" style="margin-top:16px"><div class="card"><div class="card-header"><div><div class="card-title">Warehouse Task Orchestrator</div><div class="card-sub">Commands from LMS are validated, sequenced and executed through WCS / PLC.</div></div><button class="primary-btn" data-action="createCommand">＋ Create command</button></div>${this.taskTable()}</div><div class="card"><div class="card-header"><div><div class="card-title">Media inventory</div><div class="card-sub">BINA · BOXA · ULD · IHCA status</div></div></div>${this.mediaCards()}</div><div class="card span-all"><div class="card-header"><div><div class="card-title">LMS Command Console</div><div class="card-sub">Key a command, see WMS validation and generate a traceable response.</div></div></div><div class="grid grid-4"><label class="card-sub">Media type<select class="text-input" id="cmdMedia"><option>BINA</option><option>BOXA</option><option>ULD</option><option>IHCA</option></select></label><label class="card-sub">Quantity<input class="text-input" id="cmdQty" type="number" value="2" min="1"></label><label class="card-sub">Target lane<select class="text-input" id="cmdTarget"><option>ACCEPT-01</option><option>BUP-03</option><option>RAMP-02</option><option>RELEASE-02</option></select></label><label class="card-sub">Final location<input class="text-input" id="cmdFinal" value="ACCEPT-01"></label></div><div class="workflow-controls"><button class="primary-btn" data-action="createCommand">Send LMS retrieval command</button><button class="ghost-btn" data-action="reportException" data-type="location">Report location unavailable</button></div></div></div>`;}

  taskTable(){return `<div class="table-wrap"><table class="data-table"><thead><tr><th>Task</th><th>Priority</th><th>Process</th><th>Media</th><th>Route</th><th>State</th><th>Owner</th><th></th></tr></thead><tbody>${this.data.tasks.map(t=>`<tr><td class="mono strong">${t.id}</td><td><span class="badge ${t.priority==='Urgent'?'danger':t.priority==='High'?'warn':''}">${t.priority}</span></td><td>${t.process}</td><td class="mono">${t.media}</td><td>${t.from} → ${t.to}</td><td><span class="badge ${t.state==='Completed'?'success':t.state==='Blocked'?'danger':'info'}">${t.state}</span></td><td>${t.owner}</td><td>${t.state!=='Completed'?`<button class="ghost-btn" data-action="completeTask" data-id="${t.id}">Complete</button>`:''}</td></tr>`).join('')}</tbody></table></div>`;}

  mediaCards(){return `<div style="display:grid;gap:8px">${this.data.media.map(m=>`<div class="machine-card"><div class="machine-head"><div class="machine-name mono">${m.id}</div><span class="badge ${m.status==='In-move'?'info':m.status==='Full'?'success':''}">${m.status}</span></div><div class="machine-meta"><span>${m.type} · ${m.location}</span><span>AWB ${m.awb}</span></div><div class="health-line"><i style="width:${m.capacity}%"></i></div></div>`).join('')}</div>`;}

  createManualCommand(){
    const media=$('#cmdMedia')?.value||'BINA',qty=$('#cmdQty')?.value||2,target=$('#cmdTarget')?.value||'ACCEPT-01',final=$('#cmdFinal')?.value||target;
    const id=uid('TSK');this.data.tasks.unshift({id,priority:'High',process:'Acceptance',media:`${media} × ${qty}`,from:'AUTO STORAGE',to:target,state:'Queued',owner:'Auto'});
    this.state.messageLog.unshift({id:uid('MSG'),time:this.state.simDate.toLocaleTimeString('en-GB',{hour12:false}),direction:'LMS → WMS',event:'RETRIEVE_EMPTY_MEDIA',status:'ACK',payload:{mediaType:media,quantity:Number(qty),targetOutputLane:target,finalToLocation:final,correlationId:uid('CORR')}});
    this.addEvent('LMS retrieval command accepted',`${qty} × ${media} → ${target}`,'success');this.data.kpis.commandsToday++;this.toast('Command accepted',`${id} created and queued for execution.`);this.render();
  }

  completeTask(id){const t=this.data.tasks.find(x=>x.id===id);if(t){t.state='Completed';this.addEvent('WMS task completed',`${id} · ${t.media} arrived ${t.to}`,'success');this.toast('Task completed',`${t.media} final location ${t.to}`);this.render();}}

  reports(){const types=this.data.reportTypes,sel=types.find(r=>r.id===this.state.selectedReport)||types[0];const rows=this.reportRows(sel.id);return `<div class="card"><div class="card-header"><div><div class="card-title">Atlas Report Catalogue</div><div class="card-sub">Generate, configure, filter, schedule and export all seven required reports.</div></div><span class="badge success">7 / 7 ready</span></div><div class="report-grid">${types.map(r=>`<article class="report-card ${r.id===sel.id?'active':''}" data-action="selectReport" data-id="${r.id}"><div class="report-icon">${r.icon}</div><div class="report-name">${r.name}</div><div class="report-desc">${r.desc}</div><div class="report-meta">Live data · exportable</div></article>`).join('')}</div></div>
      <div class="grid grid-3" style="margin-top:16px"><div class="card span-2"><div class="card-header"><div><div class="card-title">${sel.name}</div><div class="card-sub">Dynamic output generated from the current operational state.</div></div><div class="card-actions"><button class="ghost-btn" data-action="scheduleReport">Schedule</button><button class="secondary-btn" data-action="exportReport">Export CSV</button><button class="primary-btn" data-action="generateReport">Generate</button></div></div><div class="toolbar"><input type="date" class="control-select" id="reportDateFrom" value="2026-07-15"><input type="date" class="control-select" id="reportDateTo" value="2026-07-22"><select class="control-select"><option>All equipment</option><option>ASRS</option><option>Conveyor</option><option>UWS</option></select><select class="control-select"><option>All locations</option><option>Acceptance</option><option>ASRS</option><option>Ramp</option></select></div>${this.genericTable(rows)}</div><div class="card"><div class="card-header"><div><div class="card-title">Report trend</div><div class="card-sub">Rolling 7-day operational view</div></div></div>${this.barChart(sel.id)}<div style="margin-top:35px"><div class="metric-row"><span>Last generated</span><strong>${this.state.lastReportTime||'Not yet'}</strong></div><div class="metric-row"><span>Scheduled jobs</span><strong>${this.state.schedules.length}</strong></div><div class="metric-row"><span>Export formats</span><strong>CSV · Excel · PDF</strong></div></div></div></div>`;}

  reportRows(id){
    if(id==='availability')return this.data.machines.map(m=>({Equipment:m.name,PlannedMinutes:10080,DowntimeMinutes:Math.round(10080*(1-m.availability/100)),Availability:`${m.availability}%`,Status:m.status}));
    if(id==='faults')return [{Fault:'F-1042',Equipment:'TTV-01',Category:'Drive sensor',Duration:'18 min',RootCause:'Alignment drift',Status:'Closed'},{Fault:'F-1041',Equipment:'CV-RAMP-01',Category:'Photo eye',Duration:'9 min',RootCause:'Obstruction',Status:'Closed'},{Fault:'F-1040',Equipment:'ASRS-CRN-02',Category:'Positioning',Duration:'24 min',RootCause:'Encoder variance',Status:'Monitoring'}];
    if(id==='health')return this.data.machines.map(m=>({Equipment:m.name,HealthScore:`${m.health}%`,RunHours:m.hours,NextService:m.nextService,Condition:m.health>92?'Good':m.health>88?'Watch':'Plan service'}));
    if(id==='inventory')return this.data.media.map(m=>({Media:m.id,Type:m.type,AWB:m.awb,Location:m.location,Status:m.status,Utilization:`${m.capacity}%`}));
    if(id==='utilization')return this.data.machines.map(m=>({Equipment:m.name,ActiveTime:`${Math.round(65+m.health/4)}%`,IdleTime:`${Math.round(35-m.health/4)}%`,Tasks:Math.round(38+m.health/3),Availability:`${m.availability}%`}));
    if(id==='optimization')return [{Opportunity:'Dynamic slotting',Current:'Fixed preferred lanes',Potential:'-12% travel',Priority:'High'},{Opportunity:'Flight-cutoff sequencing',Current:'FIFO tasks',Potential:'+8% on-time ramp',Priority:'High'},{Opportunity:'Predictive maintenance',Current:'Calendar + condition',Potential:'-18% unplanned downtime',Priority:'Medium'},{Opportunity:'Workforce planning',Current:'Shift baseline',Potential:'+11% productivity',Priority:'Medium'}];
    return [{Metric:'Cargo movements / hr',Current:94,Target:88,Variance:'+6.8%'},{Metric:'Average task cycle',Current:'7.2 min',Target:'8.0 min',Variance:'-10.0%'},{Metric:'LMS acknowledgement',Current:'99.96%',Target:'99.90%',Variance:'+0.06%'},{Metric:'Exception closure < 30m',Current:'92%',Target:'90%',Variance:'+2.0%'},{Metric:'Inventory accuracy',Current:'99.3%',Target:'99.0%',Variance:'+0.3%'}];
  }

  genericTable(rows){if(!rows.length)return '<div class="empty-state">No data</div>';const cols=Object.keys(rows[0]);return `<div class="table-wrap"><table class="data-table"><thead><tr>${cols.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${esc(r[c])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
  barChart(id){const vals=id==='availability'?[98.2,98.8,99.1,97.9,98.6,99.3,98.9]:id==='faults'?[5,4,7,3,2,4,3]:[72,81,79,88,84,94,91];const max=Math.max(...vals)*1.15;return `<div class="chart">${vals.map((v,i)=>`<div class="bar ${id==='faults'?'orange':''}" style="height:${v/max*100}%"><span>${v}${id==='availability'?'%':''}</span><label>D${i+1}</label></div>`).join('')}</div>`;}
  generateReport(){this.state.lastReportTime=this.state.simDate.toLocaleTimeString('en-GB',{hour12:false});this.addEvent('Report generated',this.data.reportTypes.find(x=>x.id===this.state.selectedReport).name,'success');this.toast('Report generated','Filters and current operational data applied.');this.render();}
  exportReport(){const r=this.data.reportTypes.find(x=>x.id===this.state.selectedReport);const rows=this.reportRows(r.id);this.downloadCsv(rows,`${r.name.replace(/\W+/g,'_')}.csv`);this.addEvent('Report exported',`${r.name} · CSV`,'success');}
  scheduleReport(){const r=this.data.reportTypes.find(x=>x.id===this.state.selectedReport);this.state.schedules.push({report:r.name,frequency:'Daily',time:'06:00'});this.toast('Report scheduled',`${r.name} will run daily at 06:00.`);this.render();}

  maintenance(){const machines=this.data.machines;const down=machines.filter(m=>m.status!=='Running').length;const planned=10080, downtime=Math.round(planned*(1-this.data.kpis.availability/100));return `<div class="grid grid-4">${this.kpi('System availability',`${fmt(this.data.kpis.availability,1)}%`,'Target ≥ 98%')}${this.kpi('Equipment online',`${machines.length-down}/${machines.length}`,'Live machine state')}${this.kpi('Open work orders',down?2:1,down?'Breakdown + preventive':'Preventive only',down?'warn':'')}${this.kpi('Predictive alerts',2,'TTV-01 · Crane 02')}</div>
      <div class="grid grid-3" style="margin-top:16px"><div class="card"><div class="card-header"><div><div class="card-title">Availability calculation</div><div class="card-sub">Atlas requires formula, period and downtime evidence.</div></div></div><div style="display:flex;justify-content:center"><div class="donut"><div class="donut-center"><strong>${fmt(this.data.kpis.availability,1)}%</strong><small>availability</small></div></div></div><div class="metric-row"><span>Measurement period</span><strong>${fmt(planned)} min</strong></div><div class="metric-row"><span>Recorded downtime</span><strong>${downtime} min</strong></div><div class="metric-row"><span>Formula</span><strong>(Planned − Down) / Planned</strong></div></div>
      <div class="card span-2"><div class="card-header"><div><div class="card-title">Maintenance strategy & plan</div><div class="card-sub">Optimize resource windows without jeopardizing cargo operations.</div></div><button class="danger-btn" data-action="triggerFault" data-id="TTV-01">Report TTV fault</button></div><div class="timeline">${machines.map((m,i)=>`<div class="timeline-row"><span>${m.name}</span><div class="timeline-track"><i class="timeline-block" style="left:${8+i*7}%;width:${16+(i%3)*8}%"></i></div><strong>${m.nextService.slice(5)}</strong></div>`).join('')}</div><div class="card-sub" style="margin-top:14px">Planned maintenance windows are sequenced against flight cutoffs, standby equipment and workload.</div></div></div>
      <div class="card" style="margin-top:16px"><div class="card-header"><div><div class="card-title">Machine health & condition monitoring</div><div class="card-sub">Performance checks, inspections, trends, consumables and predictive maintenance.</div></div><span class="badge success">EMMS connected</span></div><div class="machine-grid">${machines.map(m=>`<article class="machine-card"><div class="machine-head"><div><div class="machine-name">${m.name}</div><div class="card-sub">${m.type}</div></div><i class="machine-dot ${m.status!=='Running'?'down':m.health<90?'warn':''}"></i></div><div class="machine-meta"><span>Status: ${m.status}</span><span>Availability: ${m.availability}%</span><span>Run hours: ${fmt(m.hours)}</span><span>Next service: ${m.nextService}</span></div><div class="health-line"><i style="width:${m.health}%;background:${m.health<90?'var(--amber)':'var(--green)'}"></i></div>${m.status!=='Running'?`<button style="margin-top:10px" class="secondary-btn" data-action="recoverMachine" data-id="${m.id}">Complete recovery</button>`:''}</article>`).join('')}</div></div>`;}

  triggerFault(id='TTV-01',render=true){const m=this.data.machines.find(x=>x.id===id);if(m){m.status='Fault';m.health=Math.max(55,m.health-20);m.availability=Math.max(97.6,m.availability-.8);this.state.incidentActive=true;this.data.kpis.openExceptions++;this.data.kpis.availability=Math.max(98.0,this.data.kpis.availability-.2);this.addEvent('Machine fault raised',`${m.name} · drive sensor anomaly · task rerouted`,'error');this.toast('Maintenance fault reported',`${m.name} is down. Alternate route activated.`,'error');if(render)this.render();}}
  recoverMachine(id,render=true){const m=this.data.machines.find(x=>x.id===id);if(m){m.status='Running';m.health=92;m.availability=98.8;this.state.incidentActive=false;this.data.kpis.openExceptions=Math.max(0,this.data.kpis.openExceptions-1);this.data.kpis.availability=98.6;this.addEvent('Machine returned to service',`${m.name} · repair and safety test complete`,'success');this.toast('Equipment recovered',`${m.name} returned to service.`);if(render)this.render();}}

  integration(){return `<div class="grid grid-4">${this.kpi('Interface availability','99.98%','LMS ↔ WMS gateway')}${this.kpi('Messages processed',fmt(this.data.kpis.commandsToday),'Today')}${this.kpi('Average response','214 ms','Target < 400 ms')}${this.kpi('Error queue',this.state.messageLog.filter(m=>m.status==='ERROR').length,'Replay enabled',this.state.messageLog.some(m=>m.status==='ERROR')?'warn':'')}</div>
      <div class="card" style="margin-top:16px"><div class="card-header"><div><div class="card-title">Executor integration model</div><div class="card-sub">LMS is the primary interface. WMS validates and decides. WCS / PLC executes physical movement.</div></div><button class="danger-btn" data-action="registerInterfaceIncident">Report interface incident</button></div><div class="message-grid"><div class="system-node"><div class="system-icon">L</div><h3>LMS / CMS</h3><p>Shipment master · commands · milestones</p></div><div class="flow-arrow">⇄</div><div class="system-node"><div class="system-icon">W</div><h3>RoboOps WMS</h3><p>Validation · tasks · locations · exceptions</p></div><div class="flow-arrow">⇄</div><div class="system-node"><div class="system-icon">⚙</div><h3>WCS / PLC</h3><p>ASRS · conveyors · TTV · UWS</p></div></div></div>
      <div class="grid grid-2" style="margin-top:16px"><div class="card"><div class="card-header"><div><div class="card-title">Live integration messages</div><div class="card-sub">Acknowledgement, idempotency, retry and replay evidence</div></div><button class="ghost-btn" data-action="clearMessages">Clear</button></div>${this.messageTable()}</div><div class="card"><div class="card-header"><div><div class="card-title">Open API catalogue</div><div class="card-sub">Representative platform integration capabilities</div></div><span class="badge info">OAuth2 · TLS</span></div><div class="api-list">${this.data.apis.map(a=>`<div class="api-row"><span class="method ${a.method==='POST'?'post':''}">${a.method}</span><div><strong class="mono">${a.path}</strong><div class="card-sub">${a.purpose}</div></div><span>${a.sla}</span></div>`).join('')}</div></div></div>
      <div class="card" style="margin-top:16px"><div class="card-header"><div><div class="card-title">MH internal systems scope</div><div class="card-sub">Confirmed, operational and discovery interfaces are separated to keep scope controlled.</div></div></div><div class="grid grid-4"><div class="machine-card"><div class="machine-name">Core cargo</div><div class="machine-meta"><span>LMS command/status</span><span>AWB / ULD / milestones</span></div></div><div class="machine-card"><div class="machine-name">Operational devices</div><div class="machine-meta"><span>ASRS / PLC / conveyors</span><span>UWS / LED / scanners</span></div></div><div class="machine-card"><div class="machine-name">Enterprise services</div><div class="machine-meta"><span>SSO / ITSM / monitoring</span><span>BI / notifications / EMMS</span></div></div><div class="machine-card"><div class="machine-name">Delivery controls</div><div class="machine-meta"><span>Interface inventory / SIT</span><span>Parallel run / rollback</span></div></div></div></div>`;}

  messageTable(){const rows=this.state.messageLog.length?this.state.messageLog:this.seed.events.slice(0,4).map((e,i)=>({id:`MSG-${i+1}`,time:e.time,direction:i%2?'WMS → LMS':'LMS → WMS',event:['RETRIEVE_MEDIA','LOCATION_UPDATE','UWS_WEIGHT','FOW'][i],status:'ACK',payload:{sample:true}}));return `<div class="table-wrap"><table class="data-table"><thead><tr><th>Time</th><th>Direction</th><th>Event</th><th>Status</th><th>Correlation</th><th></th></tr></thead><tbody>${rows.map(m=>`<tr><td class="mono">${m.time}</td><td>${m.direction}</td><td class="strong mono">${m.event}</td><td><span class="badge ${m.status==='ERROR'?'danger':'success'}">${m.status}</span></td><td class="mono">${m.payload?.correlationId||m.id}</td><td>${m.status==='ERROR'?`<button class="secondary-btn" data-action="replayMessage" data-id="${m.id}">Replay</button>`:''}</td></tr>`).join('')}</tbody></table></div>`;}
  registerInterfaceIncident(render=true){const msg={id:uid('MSG'),time:this.state.simDate.toLocaleTimeString('en-GB',{hour12:false}),direction:'LMS → WMS',event:'TRANSFER_COMMAND',status:'ERROR',payload:{correlationId:uid('CORR'),error:'HTTP 503 integration gateway unavailable',retryCount:0}};this.state.messageLog.unshift(msg);this.addEvent('Integration command queued for retry',`${msg.payload.correlationId} · gateway unavailable`,'warn');this.toast('Interface incident reported','Message preserved in error queue for replay.','warn');if(render)this.render();}
  replayMessage(id){const m=this.state.messageLog.find(x=>x.id===id);if(m){m.status='ACK';m.payload.retryCount=(m.payload.retryCount||0)+1;m.payload.replayedAt=this.state.simDate.toISOString();this.addEvent('Integration message replayed',`${m.event} · ${m.payload.correlationId}`,'success');this.toast('Replay successful','Command acknowledged without duplication.');this.render();}}

  requirements(){const total=this.reqData.requirements.length,cov=[...this.state.coverage].length;const categories=['All',...new Set(this.reqData.requirements.map(r=>r.category))];const sheets=Object.keys(this.reqData.rawWorkbook);return `<div class="grid grid-4">${this.kpi('Workbook workflows','5 / 5','Outbound · inbound · reports · maintenance · integration')}${this.kpi('Requirement groups',total,'Every description available')}${this.kpi('Operational evidence',`${cov}/${total}`,'Captured during workflows')}${this.kpi('Coverage design','100%','Mapped to application modules')}</div>
      <div class="grid grid-3" style="margin-top:16px"><div class="card span-2"><div class="card-header"><div><div class="card-title">Requirement-to-workflow matrix</div><div class="card-sub">Search the entire workbook, open exact descriptions and open the relevant workflow.</div></div><span class="badge success">Source: Project Atlas XLSX</span></div><div class="toolbar"><input id="requirementSearch" class="text-input" placeholder="Search function, clause or keyword…" value="${esc(this.state.requirementSearch)}"><select class="control-select" id="requirementCategory">${categories.map(c=>`<option ${c===this.state.requirementCategory?'selected':''}>${c}</option>`).join('')}</select></div><div id="requirementList" class="requirements-list"></div></div>
      <div class="card"><div class="card-header"><div><div class="card-title">Coverage summary</div><div class="card-sub">Requirements are linked to workflows, pages and live evidence.</div></div></div>${this.workflows.map(s=>{const reqs=this.reqData.requirements.filter(r=>r.scenarioIds.includes(s.id));const done=reqs.filter(r=>this.state.coverage.has(r.id)).length;return `<div style="margin-bottom:15px"><div class="metric-row"><span>S${s.number} · ${s.short}</span><strong>${done}/${reqs.length}</strong></div><div class="progress-bar"><i style="width:${reqs.length?Math.max(5,done/reqs.length*100):0}%"></i></div></div>`}).join('')}<button class="primary-btn full" data-action="runAll">Generate all workflow evidence</button></div></div>
      <div class="card" style="margin-top:16px"><div class="card-header"><div><div class="card-title">Original workbook mirror</div><div class="card-sub">All cells from the uploaded XLSX are available below without content loss.</div></div><select id="workbookSheet" class="control-select">${sheets.map(s=>`<option ${s===this.state.workbookSheet?'selected':''}>${s}</option>`).join('')}</select></div>${this.workbookTable(this.state.workbookSheet)}</div>`;}

  renderRequirementList(){const root=$('#requirementList');if(!root)return;const q=this.state.requirementSearch.toLowerCase(),cat=this.state.requirementCategory;const rows=this.reqData.requirements.filter(r=>(cat==='All'||r.category===cat)&&(!q||`${r.id} ${r.name} ${r.description}`.toLowerCase().includes(q)));root.innerHTML=rows.length?rows.map(r=>`<article class="requirement-card"><div class="requirement-code">${r.id}</div><div><div class="requirement-title">${esc(r.name)}</div><div class="requirement-desc">${esc(r.description.length>320?r.description.slice(0,320)+'…':r.description)}</div><div class="scenario-meta"><span class="badge">${r.category}</span>${r.scenarioIds.map(s=>`<span class="badge info">${s}</span>`).join('')}<span class="badge ${this.state.coverage.has(r.id)?'success':''}">${this.state.coverage.has(r.id)?'Evidence captured':'Ready to execute'}</span></div></div><div class="requirement-actions"><button class="ghost-btn" data-action="openRequirement" data-id="${r.id}">Full text</button><button class="secondary-btn" data-action="jumpRequirement" data-id="${r.id}">Open workflow</button></div></article>`).join(''):`<div class="empty-state">No requirements match the filters.</div>`;}
  workbookTable(sheet){const rows=this.reqData.rawWorkbook[sheet]||[];return `<div class="table-wrap"><table class="data-table"><thead><tr><th>Row</th><th>Column A</th><th>Column B</th><th>Column C</th><th>Column D</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td>${[0,1,2,3].map(c=>`<td class="${c===1?'strong':''}" style="white-space:pre-line;min-width:${c===2?'420px':'120px'}">${esc(r[c]??'')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
  openRequirement(id){const r=this.reqData.requirements.find(x=>x.id===id);if(!r)return;this.openModal(`<div class="modal-header"><div><span class="badge info">${r.id} · ${r.category}</span><h2 style="margin-top:10px">${esc(r.name)}</h2></div><button class="modal-close" data-action="closeModal">×</button></div><p class="card-sub">Source sheet: ${esc(r.source)} · Workflow: ${r.scenarioIds.join(', ')}</p><pre>${esc(r.description)}</pre><div class="workflow-controls"><button class="primary-btn" data-action="jumpRequirement" data-id="${r.id}">Open workflow</button></div>`);}
  jumpRequirement(id){const r=this.reqData.requirements.find(x=>x.id===id);if(!r)return;this.closeModal();this.selectScenario(r.scenarioIds[0]);this.navigate('workflows');this.toast('Requirement loaded',`${id} · ${r.name}`);}

  runbook(){return `<div class="grid grid-3"><div class="card span-2"><div class="card-header"><div><div class="card-title">Operational readiness sequence</div><div class="card-sub">A governed sequence linking each workflow to its operational controls.</div></div><button class="primary-btn" data-action="openBriefing">Open full-screen briefing</button></div><div class="timeline">${[['Opening thesis',0,8],['S1 Outbound',8,24],['S2 Inbound',30,20],['S3 Reporting',52,11],['S4 Maintenance',65,11],['S5 Integration',77,9],['Close & Q&A',88,9]].map((x,i)=>`<div class="timeline-row"><span>${x[0]}</span><div class="timeline-track"><i class="timeline-block" style="left:${x[1]}%;width:${x[2]}%;background:${i===5?'linear-gradient(90deg,var(--orange),var(--amber))':''}"></i></div><strong>${i===0?'5 min':i===6?'Q&A':`${8+i*2} min`}</strong></div>`).join('')}</div></div><div class="card"><div class="card-title">Operational control points</div><div style="display:grid;gap:11px;margin-top:13px"><div class="machine-card"><strong>01 · Command execution</strong><div class="card-sub">LMS command produces WMS task, physical move and status return.</div></div><div class="machine-card"><strong>02 · Operational visibility</strong><div class="card-sub">Dashboards expose throughput, inventory, health and exceptions.</div></div><div class="machine-card"><strong>03 · Governed readiness</strong><div class="card-sub">Integration, cyber, DR, availability and support are credible.</div></div></div></div></div>
      <div class="card" style="margin-top:16px"><div class="card-header"><div><div class="card-title">Workflow guidance</div><div class="card-sub">Use these operational notes to guide workflow execution.</div></div></div><div class="grid grid-3">${this.workflows.map(s=>`<article class="machine-card"><span class="badge info">Workflow ${s.number}</span><h3>${s.name}</h3><p class="card-sub"><strong>Control:</strong> ${esc(this.briefingCue(s.id))}</p><p class="card-sub"><strong>Verify:</strong> ${s.steps.slice(0,3).map(x=>x.title).join(' → ')}…</p><button class="secondary-btn" data-action="startScenario" data-id="${s.id}">Execute workflow</button></article>`).join('')}</div></div>`;}
  briefingCue(id){return ({S1:'“The LMS remains the cargo master; RoboOps WMS executes every terminal movement and returns actual status.”',S2:'“Inbound routing is rule-aware: PRP remains stored, TTS moves directly to cold room, and release is authorized by LMS.”',S3:'“Management receives accurate, filterable and scheduled evidence — not static screenshots.”',S4:'“Availability is measurable and defendable: every downtime minute is linked to a fault, work order and recovery.”',S5:'“The executor model is integration-safe: idempotent commands, monitored acknowledgements, retry and replay.”'})[id];}

  dataExplorer(){const tabs=['shipments','media','machines','locations','events','tasks'];const rows=this.data[this.state.dataTab]||[];return `<div class="card"><div class="card-header"><div><div class="card-title">Operational data</div><div class="card-sub">Current terminal records. Workflow execution updates this data in real time.</div></div><div class="card-actions"><button class="ghost-btn" data-action="downloadJson">Download JSON</button><button class="danger-btn" data-action="resetData">Reset data</button></div></div><div class="toolbar">${tabs.map(t=>`<button class="filter-chip ${this.state.dataTab===t?'active':''}" data-action="setDataTab" data-tab="${t}">${t}</button>`).join('')}</div>${Array.isArray(rows)&&rows.length?this.genericTable(rows):'<div class="empty-state">No data for this tab.</div>'}</div>`;}

  showAwb(id){const s=this.data.shipments.find(x=>x.awb===id);if(!s)return;const events=this.data.events.filter(e=>e.detail.includes(id)||e.detail.includes(s.media));this.openModal(`<div class="modal-header"><div><span class="badge ${s.direction==='Outbound'?'success':'info'}">${s.direction}</span><h2 style="margin-top:10px">AWB ${s.awb}</h2></div><button class="modal-close" data-action="closeModal">×</button></div><div class="grid grid-3" style="margin-top:15px">${[['Flight',s.flight],['Route',s.route],['Special handling',s.type],['Pieces',s.pieces],['Weight',`${fmt(s.weight)} kg`],['Media',s.media],['Location',s.location],['Status',s.status],['Cutoff',s.cutoff]].map(x=>`<div class="machine-card"><div class="card-sub">${x[0]}</div><strong>${x[1]}</strong></div>`).join('')}</div><h3>Related events</h3>${events.length?this.eventList.call({data:{events}},10):'<div class="card-sub">Current event chain will populate as the workflow runs.</div>'}`);}

  openBriefing(){this.state.briefingIndex=0;const div=document.createElement('div');div.id='briefingOverlay';div.className='briefing-overlay';$('#modalLayer').append(div);this.renderBriefing();}
  renderBriefing(){const root=$('#briefingOverlay');if(!root)return;const items=[{title:'MAB Kargo Warehouse Modernisation',body:'A live proof that LMS remains the orchestrator, RoboOps WMS becomes the terminal execution layer, and every physical move is traceable.',cue:'Open with the operating thesis. Do not start with generic product features.'},...this.workflows.map(s=>({title:`Workflow ${s.number} · ${s.name}`,body:s.purpose,cue:this.briefingCue(s.id)})),{title:'Closing position',body:'One integrated cargo operating layer: process-aligned, API-ready, availability-led and built to unlock future automation.',cue:'Close on confidence: all five workflows, all IT topics, one coherent operating model.'}];const x=items[this.state.briefingIndex];root.innerHTML=`<div class="briefing-main"><div class="eyebrow">AIonOS × MAB KARGO · PROJECT ATLAS</div><h1>${esc(x.title)}</h1><p>${esc(x.body)}</p><div class="workflow-controls"><button class="ghost-btn" data-action="briefingPrev">← Previous</button><button class="primary-btn" data-action="briefingNext">Next →</button><button class="ghost-btn" data-action="fullscreen">Full screen</button><button class="danger-btn" data-action="closeBriefing">Exit</button></div></div><aside class="briefing-panel"><div class="card-title">Briefing cue</div><div class="briefing-cue" style="margin-top:14px">${esc(x.cue)}</div><div class="briefing-kpis"><div class="briefing-kpi"><strong>${this.state.briefingIndex+1}/${items.length}</strong><span>STORY POSITION</span></div><div class="briefing-kpi"><strong>${fmt(this.data.kpis.availability,1)}%</strong><span>LIVE AVAILABILITY</span></div><div class="briefing-kpi"><strong>5/5</strong><span>ATLAS WORKFLOWS</span></div><div class="briefing-kpi"><strong>6/6</strong><span>IT TOPICS</span></div></div><div class="card-sub" style="margin-top:auto">Keyboard-style controls are represented by the Previous / Next buttons. Exit returns to the application.</div></aside>`;}
  briefingMove(d){const max=this.workflows.length+1;this.state.briefingIndex=Math.max(0,Math.min(max,this.state.briefingIndex+d));this.renderBriefing();}
  closeBriefing(){document.exitFullscreen?.();$('#briefingOverlay')?.remove();}

  openModal(content){$('#modalLayer').innerHTML=`<div class="modal-backdrop"><div class="modal">${content}</div></div>`;}
  closeModal(){$('#modalLayer').innerHTML='';}
  downloadCsv(rows,name){if(!rows.length)return;const cols=Object.keys(rows[0]);const csv=[cols.join(','),...rows.map(r=>cols.map(c=>`"${String(r[c]??'').replaceAll('"','""')}"`).join(','))].join('\n');this.downloadBlob(csv,name,'text/csv');}
  downloadJson(){this.downloadBlob(JSON.stringify(this.data,null,2),'mab-kargo-operational-data.json','application/json');}
  downloadBlob(content,name,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
}

new AtlasApp().init().catch(err=>{
  console.error(err);document.querySelector('#view').innerHTML=`<div class="card"><h2>Unable to load operational data</h2><p>${esc(err.message)}</p><p>Serve this repository through GitHub Pages or a local HTTP server; browsers block JSON fetches when index.html is opened directly as a file.</p></div>`;
});
