import { useEffect, useMemo, useState } from "react";
import AdminSidebar from "../../components/AdminSidebar.jsx";
import { api } from "../../lib/api";
import { useAuthGuard } from "../../lib/useAuthGuard";
import { useToast } from "../../lib/Toast.jsx";
import { formatDate, formatTime, splitName, dobFromAge } from "../../lib/ui";
import TopbarActions from "../../components/TopbarActions.jsx";

// bed_number is a short code in the database (max 10 characters)
const BED_OPTIONS = ["ICU", "CCU", "HDU", "Ward", "Cabin"];

function emptyForm() {
  return { patientId:"", isNewPatient:false, fullName:"", age:"", gender:"Male", phone:"", complaint:"", bp:"", hr:"", spo2:"", temp:"", doctorId:"", bed:"ICU", notes:"" };
}

// hospital-generated temporary login password for a walk-in emergency patient
function tempPassword() {
  return "Temp" + Math.floor(100000 + Math.random() * 900000);
}

function priorityClass(level) {
  return level === "P1" ? "tb-critical" : level === "P2" ? "tb-urgent" : "tb-semi";
}

function initials(name="") { return name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase() || "PT"; }

export default function EmergencyPage() {
  const { ready } = useAuthGuard();
  const toast = useToast();
  const [cases, setCases] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [priority, setPriority] = useState("P1");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    try { setCases(await api.getEmergencyCases() || []); }
    catch (e) { toast(e.message, "error"); }
  }
  async function loadSelects() {
    try { const [p,d]=await Promise.all([api.getPatients(),api.getDoctors()]); setPatients(p||[]); setDoctors(d||[]); }
    catch(e){ toast(e.message,"error"); }
  }
  useEffect(()=>{ if(ready){loadSelects();load();} },[ready]);

  function setField(name,value){ setForm(f=>({...f,[name]:value})); }
  function openAddModal(){ setEditingId(null);setForm(emptyForm());setPriority("P1");setShowModal(true); }
  async function openEditModal(id){
    try { const c=await api.getEmergencyCase(id); setEditingId(id); setForm({...emptyForm(),patientId:c.patientId||"",doctorId:c.doctorId||"",complaint:c.chiefComplaint||"",bed:c.bedNumber||"",notes:c.notes||""}); setPriority(c.priorityLevel||"P1");setShowModal(true); }
    catch(e){toast(e.message,"error");}
  }
  async function saveCase(){
    let patientId=Number(form.patientId);
    let created=null;
    if(form.isNewPatient){
      if(!form.fullName.trim()){toast("Enter the patient's full name","error");return;}
      const password=tempPassword();
      try { const {firstName,lastName}=splitName(form.fullName); const p=await api.createPatient({firstName,lastName,dateOfBirth:dobFromAge(parseInt(form.age,10)||30),gender:form.gender,phone:form.phone||"0000000000",status:"Critical",password}); patientId=p.id; created={code:p.patientCode,password}; }
      catch(e){toast(e.message,"error");return;}
    }
    if(!patientId){toast("Select or register a patient","error");return;}
    // Chief complaint is optional – the server stores "Not specified" when it is left blank.
    const body={patientId,doctorId:Number(form.doctorId)||null,priorityLevel:priority,triageCategory:priority==="P1"?"Critical":priority==="P2"?"Urgent":"Semi-Urgent",chiefComplaint:form.complaint.trim()||null,vitalSigns:JSON.stringify({bp:form.bp||null,pulse:form.hr||null,spo2:form.spo2||null,temp:form.temp||null}),bedNumber:form.bed||null,notes:form.notes||null};
    if(!editingId) body.status="Active"; // when editing, the current status is kept by the server
    setSaving(true);try{if(editingId) await api.updateEmergencyCase(editingId,body); else await api.createEmergencyCase(body);toast(created?`Emergency case saved. New patient ${created.code} — temporary password: ${created.password}`:"Emergency case saved","success",created?20000:undefined);setShowModal(false);await load();}catch(e){toast(e.message,"error");}finally{setSaving(false);}
  }
  async function admit(id){setBusyId(id);try{await api.admitEmergencyCase(id);toast("Patient admitted successfully","success");await load();}catch(e){toast(e.message,"error");}finally{setBusyId(null);}}
  async function decline(id){if(!window.confirm("Decline this emergency admission request?"))return;setBusyId(id);try{await api.declineEmergencyCase(id);toast("Emergency request declined","info");await load();}catch(e){toast(e.message,"error");}finally{setBusyId(null);}}

  const activeCases=useMemo(()=>cases.filter(c=>c.status==="Active"),[cases]);
  const grouped=useMemo(()=>({P1:activeCases.filter(c=>c.priorityLevel==="P1"),P2:activeCases.filter(c=>c.priorityLevel==="P2"),P3:activeCases.filter(c=>c.priorityLevel!=="P1"&&c.priorityLevel!=="P2")}),[activeCases]);
  function renderCard(c){
    let vit={};try{vit=c.vitalSigns?JSON.parse(c.vitalSigns):{};}catch{}
    return <div className={`pt-card ${c.priorityLevel==="P1"?"critical-card":c.priorityLevel==="P2"?"urgent-card":"semi-card"}`} key={c.id}>
      <div className="pt-card-top"><div className="pt-av bg-orange">{initials(c.patientName)}</div><div><div className="pt-card-name">{c.patientName}</div><div className="pt-card-id">{c.caseCode} · Patient #{c.patientId}</div></div><div className="pt-card-badge"><span className={`triage-badge ${priorityClass(c.priorityLevel)}`}>{c.priorityLevel} {c.triageCategory||""}</span></div></div>
      <div className="complaint-text">{c.chiefComplaint}</div>
      <div className="vitals"><div className="vital"><div className="vital-val">BP {vit.bp||"—"}</div><div className="vital-label">Blood Press.</div></div><div className="vital"><div className="vital-val">HR {vit.pulse||"—"}</div><div className="vital-label">Heart Rate</div></div><div className="vital"><div className="vital-val">SpO2 {vit.spo2||"—"}</div><div className="vital-label">Oxygen</div></div></div>
      <div className="pt-card-foot"><span className="wait-time">Arrival: <strong>{formatTime(c.arrivalTime)}</strong></span><div className="pt-card-actions"><button type="button" className="pca-btn view" onClick={()=>openEditModal(c.id)}>Details</button><button type="button" className="pca-btn admit" disabled={busyId===c.id} onClick={()=>admit(c.id)}>Admit</button><button type="button" className="pca-btn decline" disabled={busyId===c.id} onClick={()=>decline(c.id)}>Decline</button></div></div>
    </div>;
  }

  if(!ready)return null;
  return <><AdminSidebar active="emergency"/><div className="main"><div className="topbar"><div className="page-title"><span className="material-symbols-outlined" style={{color:"var(--danger)",fontSize:20}}>emergency</span> Emergency Department</div><div className="topbar-right"><TopbarActions /><button className="btn-danger" onClick={openAddModal}>+ Register Emergency Patient</button></div></div>
    <div className="content"><div className="alert-banner"><div><h3>Emergency Ward — LIVE STATUS</h3><p>Active emergency cases requiring triage and admission decisions.</p></div><div className="active-cases-box"><div className="count-big">{activeCases.length}</div><div className="count-label">Active Cases</div></div></div>
      <div className="stat-row"><div className="estat"><div><div className="estat-num color-danger">{grouped.P1.length}</div><div className="estat-label">Critical (P1)</div></div></div><div className="estat"><div><div className="estat-num">{grouped.P2.length}</div><div className="estat-label">Urgent (P2)</div></div></div><div className="estat"><div><div className="estat-num">{grouped.P3.length}</div><div className="estat-label">Semi-Urgent (P3)</div></div></div></div>
      <div className="triage-grid">{[["P1","Critical — Immediate","red"],["P2","Urgent — 15 Min","orange"],["P3","Semi-Urgent","green"]].map(([level,title,color])=><div className="triage-col" key={level}><div className={`triage-head ${color}`}><h3>{title}</h3><span className="triage-count">{grouped[level].length} patient{grouped[level].length===1?"":"s"}</span></div><div className="triage-body">{grouped[level].length?grouped[level].map(renderCard):<div style={{padding:20,color:"var(--muted)"}}>No active cases.</div>}</div></div>)}</div>
      <div className="card" style={{marginTop:24}}><div className="card-head"><h3>Emergency Records</h3></div><div className="table-container"><table><thead><tr><th>Patient</th><th>Triage</th><th>Complaint</th><th>Doctor</th><th>Status</th><th>Time In</th><th>Actions</th></tr></thead><tbody>{cases.length===0?<tr><td colSpan="7" style={{textAlign:"center",padding:20}}>No emergency records.</td></tr>:cases.map(c=><tr key={c.id}><td><strong>{c.patientName}</strong><br/><small>{c.caseCode}</small></td><td><span className={`triage-badge ${priorityClass(c.priorityLevel)}`}>{c.priorityLevel}</span></td><td>{c.chiefComplaint}</td><td>{c.doctorName||"—"}</td><td>{c.status}</td><td>{formatDate(c.arrivalTime)} {formatTime(c.arrivalTime)}</td><td className="actions-cell"><div className="rec-actions">{c.status==="Active"?<><button type="button" className="act-btn act-text admit" disabled={busyId===c.id} onClick={()=>admit(c.id)}>Admit</button><button type="button" className="act-btn act-text decline" disabled={busyId===c.id} onClick={()=>decline(c.id)}>Decline</button></>:<button type="button" className="act-btn act-text" onClick={()=>openEditModal(c.id)}>Details</button>}</div></td></tr>)}</tbody></table></div></div>
    </div></div>
    <div className={`modal-overlay${showModal?" show":""}`}><div className="modal"><div className="modal-head"><div className="modal-title">{editingId?"Edit Emergency Case":"Register Emergency Patient"}</div><button className="modal-close" onClick={()=>setShowModal(false)}>×</button></div><div className="modal-body"><div className="form-grid"><div className="form-group full"><label>Patient</label><select value={form.patientId} onChange={e=>setField("patientId",e.target.value)} disabled={form.isNewPatient}><option value="">Select patient</option>{patients.map(p=><option key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.patientCode})</option>)}</select><label style={{marginTop:8}}><input type="checkbox" checked={form.isNewPatient} onChange={e=>setField("isNewPatient",e.target.checked)}/> Register new patient</label></div>{form.isNewPatient&&<><div className="form-group"><label>Full Name</label><input value={form.fullName} onChange={e=>setField("fullName",e.target.value)}/></div><div className="form-group"><label>Age</label><input type="number" value={form.age} onChange={e=>setField("age",e.target.value)}/></div><div className="form-group"><label>Gender</label><select value={form.gender} onChange={e=>setField("gender",e.target.value)}><option>Male</option><option>Female</option><option>Other</option></select></div><div className="form-group"><label>Phone</label><input value={form.phone} onChange={e=>setField("phone",e.target.value)}/></div></>}<div className="form-group"><label>Doctor</label><select value={form.doctorId} onChange={e=>setField("doctorId",e.target.value)}><option value="">Unassigned</option>{doctors.map(d=><option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}</option>)}</select></div><div className="form-group"><label>Bed</label><select value={form.bed} onChange={e=>setField("bed",e.target.value)}>{[...(form.bed&&!BED_OPTIONS.includes(form.bed)?[form.bed]:[]),...BED_OPTIONS].map(b=><option key={b} value={b}>{b}</option>)}<option value="">Not assigned</option></select></div><div className="form-group full"><label>Chief Complaint (optional)</label><textarea rows="3" value={form.complaint} onChange={e=>setField("complaint",e.target.value)}/></div></div><div className="section-title">Priority</div><div className="priority-options"><button type="button" className={priority==="P1"?"active":""} onClick={()=>setPriority("P1")}>P1 Critical</button><button type="button" className={priority==="P2"?"active":""} onClick={()=>setPriority("P2")}>P2 Urgent</button><button type="button" className={priority==="P3"?"active":""} onClick={()=>setPriority("P3")}>P3 Semi-Urgent</button></div><div className="form-grid" style={{marginTop:16}}><div className="form-group"><label>Blood Pressure</label><input value={form.bp} onChange={e=>setField("bp",e.target.value)} placeholder="120/80"/></div><div className="form-group"><label>Heart Rate</label><input value={form.hr} onChange={e=>setField("hr",e.target.value)}/></div><div className="form-group"><label>SpO2</label><input value={form.spo2} onChange={e=>setField("spo2",e.target.value)}/></div><div className="form-group"><label>Temperature</label><input value={form.temp} onChange={e=>setField("temp",e.target.value)}/></div></div></div><div className="modal-foot"><button className="btn-cancel" onClick={()=>setShowModal(false)}>Cancel</button><button className="btn-save" onClick={saveCase} disabled={saving}>{saving?"Saving...":"Save Emergency Case"}</button></div></div></div>
  </>;
}
