import { useEffect, useMemo, useRef, useState } from "react";
import PatientSidebar from "../../components/PatientSidebar.jsx";
import { api } from "../../lib/api";
import { useAuthGuard } from "../../lib/useAuthGuard";
import { useMyPatient } from "../../lib/useMyPatient";
import { useToast } from "../../lib/Toast.jsx";
import { currentDateLong, guessDocCategory, fileIconFor } from "../../lib/ui";
import TopbarActions from "../../components/TopbarActions.jsx";

const TAG_LABELS = { lab: "Lab Result", imaging: "Imaging", prescription: "Prescription", general: "General" };

export default function PatientEhrPage() {
  const { ready } = useAuthGuard("PATIENT");
  const { patient, loading: patientLoading } = useMyPatient();
  const toast = useToast();

  const [docs, setDocs] = useState([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!ready || patientLoading || !patient) return;
    api
      .getEhrDocuments(patient.id)
      .then((res) => setDocs(res || []))
      .catch(() => toast("Failed to load health records from server", "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, patientLoading, patient]);

  const stats = useMemo(() => {
    const catOf = (d) => d.category || guessDocCategory(d.documentName);
    return {
      total: docs.length,
      lab: docs.filter((d) => catOf(d) === "lab").length,
      imaging: docs.filter((d) => catOf(d) === "imaging").length,
      prescription: docs.filter((d) => catOf(d) === "prescription").length,
    };
  }, [docs]);

  const filtered = useMemo(() => {
    let list = docs;
    const q = search.toLowerCase();
    if (q) list = list.filter((d) => d.documentName.toLowerCase().includes(q));
    if (catFilter !== "all") list = list.filter((d) => (d.category || guessDocCategory(d.documentName)) === catFilter);
    return list;
  }, [docs, search, catFilter]);

  function uploadFiles(files) {
    if (!files || files.length === 0) return;
    if (!patient) {
      toast("Patient profile not loaded yet", "warning");
      return;
    }
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const docPayload = {
          patientId: patient.id,
          documentName: file.name,
          fileSize: file.size,
          fileType: file.type || "application/octet-stream",
          category: guessDocCategory(file.name),
          fileData: e.target.result,
        };
        try {
          const res = await api.createEhrDocument(docPayload);
          setDocs((d) => [res, ...d]);
          toast(`"${file.name}" uploaded successfully`, "success");
        } catch {
          toast("Failed to upload document to server", "error");
        }
      };
      reader.readAsDataURL(file);
    });
  }

  async function deleteDoc(id) {
    if (!confirm("Delete this document?")) return;
    try {
      await api.deleteEhrDocument(id);
      setDocs((d) => d.filter((doc) => doc.id !== id));
      toast("Document deleted", "info");
    } catch {
      toast("Failed to delete document", "error");
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    uploadFiles(e.dataTransfer.files);
  }

  if (!ready) return null;

  return (
    <>
      <PatientSidebar active="ehr" patient={patient} />

      <div className="main">
        <div className="topbar">
          <div className="page-title">Electronic Health Records</div>
          <div className="topbar-right">
            <TopbarActions />
            <span style={{ fontSize: "14px", fontWeight: "500", color: "var(--muted)" }}>{currentDateLong()}</span>
          </div>
        </div>

        <div className="content" style={{ padding: "32px" }}>
          <div className="stats-bar">
            <div className="stats-item">
              <div className="stats-num">{stats.total}</div>
              <div className="stats-label">Total Documents</div>
            </div>
            <div className="stats-item">
              <div className="stats-num">{stats.lab}</div>
              <div className="stats-label">Lab Results</div>
            </div>
            <div className="stats-item">
              <div className="stats-num">{stats.imaging}</div>
              <div className="stats-label">Imaging / X-Rays</div>
            </div>
            <div className="stats-item">
              <div className="stats-num">{stats.prescription}</div>
              <div className="stats-label">Prescriptions</div>
            </div>
          </div>

          <div
            className={"upload-zone" + (dragOver ? " drag-over" : "")}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="upload-zone-icon" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "42px", color: "var(--teal)" }}>
                upload_file
              </span>
            </div>
            <div className="upload-zone-text">Drop files here to upload</div>
            <div className="upload-zone-sub">or click to browse — PDF, Images, and Documents supported</div>
            <div className="upload-btn" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "white" }}>
                attach_file
              </span>{" "}
              Choose File
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: "none" }}
              onChange={(e) => uploadFiles(e.target.files)}
            />
          </div>

          <div className="search-filter-bar">
            <div className="ehr-search">
              <span className="material-symbols-outlined" style={{ color: "var(--muted)", fontSize: "18px" }}>
                search
              </span>
              <input type="text" placeholder="Search documents..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="cat-select" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
              <option value="all">All Categories</option>
              <option value="lab">Lab Results</option>
              <option value="imaging">Imaging / X-Rays</option>
              <option value="prescription">Prescriptions</option>
              <option value="general">General</option>
            </select>
          </div>

          <div className="doc-grid">
            {filtered.length === 0 && docs.length === 0 && (
              <div className="empty-state" style={{ gridColumn: "1/-1" }}>
                <div className="empty-state-icon">
                  <span className="material-symbols-outlined" style={{ fontSize: "48px" }}>
                    folder_open
                  </span>
                </div>
                <div className="empty-state-title">No health records yet</div>
                <div className="empty-state-desc">
                  Upload your lab results, X-rays, prescriptions, and other medical documents to keep them organized and accessible.
                </div>
              </div>
            )}
            {filtered.length === 0 && docs.length > 0 && (
              <div className="empty-state" style={{ gridColumn: "1/-1" }}>
                <div className="empty-state-icon">
                  <span className="material-symbols-outlined" style={{ fontSize: "48px" }}>
                    search
                  </span>
                </div>
                <div className="empty-state-title">No matching documents</div>
                <div className="empty-state-desc">Try adjusting your search or category filter.</div>
              </div>
            )}
            {filtered.map((d, i) => {
              const fi = fileIconFor(d.documentName);
              const cat = d.category || guessDocCategory(d.documentName);
              return (
                <div className="doc-card" key={d.id} style={{ animationDelay: i * 0.05 + "s" }}>
                  <div className="doc-card-top">
                    <div className={"doc-icon " + fi.cls} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>
                        {fi.icon}
                      </span>
                    </div>
                    <div>
                      <div className="doc-name">{d.documentName}</div>
                      <div className="doc-meta">
                        {new Date(d.uploadedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} ·{" "}
                        {(d.fileSize / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </div>
                  <div>
                    <span className={"doc-tag " + cat}>{TAG_LABELS[cat]}</span>
                  </div>
                  <div className="doc-actions">
                    <a href={d.fileData} download={d.documentName} className="doc-btn">
                      <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                        download
                      </span>{" "}
                      Download
                    </a>
                    <button className="doc-btn danger" onClick={() => deleteDoc(d.id)}>
                      <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                        delete
                      </span>{" "}
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
