import { useEffect, useState } from "react";
import { applyDeviceConfigurationTemplate, createDeviceConfigurationTemplate, getDeviceConfiguration, getDeviceConfigurationHistory, getDeviceConfigurationTemplates, restoreDeviceConfiguration, updateDeviceConfiguration, updateDeviceConfigurationTemplate } from "../../services/deviceService";

const fields = [
  ["pollingIntervalSeconds", "Polling interval (seconds)"], ["heartbeatIntervalSeconds", "Heartbeat interval (seconds)"], ["heartbeatTimeoutSeconds", "Heartbeat timeout (seconds)"],
  ["metricsCollectionIntervalSeconds", "Metrics frequency (seconds)"]
];

function payload(form) { return { ...form, pollingIntervalSeconds: Number(form.pollingIntervalSeconds), heartbeatIntervalSeconds: Number(form.heartbeatIntervalSeconds), heartbeatTimeoutSeconds: Number(form.heartbeatTimeoutSeconds), metricsCollectionIntervalSeconds: Number(form.metricsCollectionIntervalSeconds), tags: typeof form.tags === "string" ? form.tags.split(",").map(x => x.trim()).filter(Boolean) : form.tags || [] }; }
function editable(value) { return { ...value, tags: (value.tags || []).join(", ") }; }
function stamp(value) { return value ? new Date(value).toLocaleString("en-IE") : "Default configuration"; }

export default function DeviceConfigurationDialog({ device, role, onClose }) {
  const [configuration, setConfiguration] = useState(null), [form, setForm] = useState(null), [history, setHistory] = useState([]), [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState(""), [templateName, setTemplateName] = useState(""), [templateDescription, setTemplateDescription] = useState("");
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState("");
  const canManage = (role === "ADMIN" || role === "OPERATOR") && device.active;
  async function load() { setLoading(true); setError(""); try { const [c,h,t] = await Promise.all([getDeviceConfiguration(device.deviceId), getDeviceConfigurationHistory(device.deviceId), getDeviceConfigurationTemplates()]); setConfiguration(c); setForm(editable(c)); setHistory(h); setTemplates(t); } catch { setError("Unable to load device configuration."); } finally { setLoading(false); } }
  // Reload the external configuration resource when the selected device changes.
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [device.deviceId]);
  function validate(value) { if ([value.pollingIntervalSeconds,value.heartbeatIntervalSeconds,value.metricsCollectionIntervalSeconds].some(v => Number(v) < 5)) return "Intervals must be at least 5 seconds."; if(Number(value.heartbeatTimeoutSeconds)<=2*Number(value.heartbeatIntervalSeconds)) return "Heartbeat timeout must be greater than twice the heartbeat interval."; if (value.apiEndpoint && !/^https?:\/\/\S+$/.test(value.apiEndpoint)) return "API endpoint must be an HTTP(S) URL."; if (payload(value).tags.length > 20 || payload(value).tags.some(t => t.length > 50)) return "Use at most 20 tags of 50 characters each."; return ""; }
  async function act(action, success) { setBusy(true); setError(""); setMessage(""); try { await action(); setMessage(success); await load(); } catch (e) { setError(e.message || "Configuration operation failed."); } finally { setBusy(false); } }
  function save(e) { e.preventDefault(); const invalid=validate(form); if(invalid){setError(invalid);return;} act(()=>updateDeviceConfiguration(device.deviceId,payload(form)),"Configuration saved as a new version."); }
  function restore(version) { if(window.confirm(`Restore configuration version ${version}? A new version will be created.`)) act(()=>restoreDeviceConfiguration(device.deviceId,version),`Version ${version} restored as a new version.`); }
  function applyTemplate() { if(!templateId){setError("Select a template first.");return;} act(()=>applyDeviceConfigurationTemplate(device.deviceId,templateId),"Template applied as a new version."); }
  function templatePayload() { return { ...payload(form), name:templateName.trim(), description:templateDescription.trim() }; }
  function saveTemplate(update=false) { if(!templateName.trim()){setError("Template name is required.");return;} const invalid=validate(form);if(invalid){setError(invalid);return;} act(()=>update ? updateDeviceConfigurationTemplate(templateId,templatePayload()) : createDeviceConfigurationTemplate(templatePayload()),update?"Template updated.":"Template created."); }
  function chooseTemplate(e){const id=e.target.value;setTemplateId(id);const t=templates.find(x=>x.id===id);if(t){setTemplateName(t.name);setTemplateDescription(t.description||"");}}
  return <div className="device-management-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="configuration-title" className="device-management-dialog device-configuration-dialog">
    <header><div><h2 id="configuration-title">Configuration · {device.name}</h2><p>Centrally stored only — settings are not automatically pushed to the physical device.</p></div><button aria-label="Close configuration dialog" onClick={onClose}>×</button></header>
    {loading && <p role="status">Loading configuration…</p>}{error && <p role="alert" className="device-management-error">{error}</p>}{message && <p role="status" className="device-configuration-success">{message}</p>}
    {!loading && configuration && <>
      <form className="device-management-form" noValidate onSubmit={save}>{fields.map(([key,label])=><label key={key}>{label}<input type="number" min="5" max="86400" value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}/></label>)}
        <label>Environment<select value={form.environment} onChange={e=>setForm({...form,environment:e.target.value})}><option>DEVELOPMENT</option><option>TESTING</option><option>PRODUCTION</option></select></label>
        <label>API endpoint<input value={form.apiEndpoint||""} placeholder="https://..." onChange={e=>setForm({...form,apiEndpoint:e.target.value})}/></label>
        <label>Logging level<select value={form.loggingLevel} onChange={e=>setForm({...form,loggingLevel:e.target.value})}><option>ERROR</option><option>WARN</option><option>INFO</option><option>DEBUG</option><option>TRACE</option></select></label>
        <label className="configuration-tags">Tags (comma separated)<input value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})}/></label>
        <footer><span>Version {configuration.version} · {stamp(configuration.updatedAt)}</span>{canManage && <button type="submit" disabled={busy}>Save Configuration</button>}</footer>
      </form>
      <section className="configuration-templates"><h3>Configuration Templates</h3>{templates.length===0 && <p>No templates are available.</p>}<div><select aria-label="Configuration template" value={templateId} onChange={chooseTemplate}><option value="">Select template</option>{templates.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>{canManage&&<button disabled={busy} onClick={applyTemplate}>Apply Template</button>}</div>
        {role==="ADMIN"&&<div className="template-editor"><input aria-label="Template name" placeholder="Template name" value={templateName} onChange={e=>setTemplateName(e.target.value)}/><input aria-label="Template description" placeholder="Description" value={templateDescription} onChange={e=>setTemplateDescription(e.target.value)}/><button disabled={busy} onClick={()=>saveTemplate(false)}>Create from current</button>{templateId&&<button disabled={busy} onClick={()=>saveTemplate(true)}>Update selected</button>}</div>}
      </section>
      <section className="configuration-history"><h3>Version History</h3>{history.length===0?<p>No saved versions yet.</p>:<ol>{history.map(v=><li key={v.version}><div><strong>Version {v.version} · {v.action.replaceAll("_"," ")}</strong><span>{stamp(v.changedAt)} · changed by {v.changedBy}</span><small>{v.changedFields.join(", ")}</small></div>{canManage&&v.version!==configuration.version&&<button onClick={()=>restore(v.version)}>Restore</button>}</li>)}</ol>}</section>
    </>}
  </section></div>;
}
