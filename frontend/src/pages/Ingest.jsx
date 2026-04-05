import { useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8001'

const DEPARTMENTS = ['Engineering', 'Marketing', 'Sales', 'Support', 'Finance']
const LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6']
const LOCATIONS = ['San Francisco', 'New York', 'Seattle', 'Chicago', 'Austin']
const EDUCATION = ['Associate', 'Bachelor', 'Master', 'PhD']
const GENDERS = ['M', 'F', 'NB']

const EMPTY_FORM = {
  first_name: '', last_name: '', gender: 'F', department: 'Engineering',
  role: '', level: 'L3', tenure_years: '', salary: '', performance_score: '',
  location: 'Chicago', hire_date: '', age: '', education: 'Bachelor', is_manager: 'false',
}

const SAMPLE_CSV =
  'first_name,last_name,gender,department,role,level,tenure_years,salary,performance_score,location,hire_date,age,education,is_manager\n' +
  'Ada,Lovelace,F,Engineering,Software Engineer,L4,3.5,118000,4.3,Chicago,2022-09-01,32,Master,false\n' +
  'Grace,Hopper,F,Engineering,Data Engineer,L5,6.0,148000,4.6,Seattle,2019-06-15,38,PhD,true\n' +
  'Alan,Turing,M,Engineering,ML Engineer,L4,4.2,132000,4.4,San Francisco,2021-11-10,34,Master,false\n'

const inputStyle = {
  width: '100%', padding: '8px 10px', fontSize: '13px',
  border: '1px solid #d1d5db', borderRadius: '6px', background: 'white',
}
const labelStyle = { fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '4px', display: 'block' }

function Field({ label, children }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

function ReanalyzeButton({ onResult }) {
  const [loading, setLoading] = useState(false)
  const run = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/ingest/reanalyze`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Re-analyze failed')
      onResult(`Re-analyzed. ${data.rows_written} gap rows written. Visit Dashboard/Gaps to see updates.`)
    } catch (e) {
      onResult(`Error: ${e.message}`, true)
    } finally {
      setLoading(false)
    }
  }
  return (
    <button onClick={run} disabled={loading} style={{
      padding: '10px 18px', background: loading ? '#9ca3af' : '#8b5cf6', color: 'white',
      border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
      cursor: loading ? 'not-allowed' : 'pointer',
    }}>
      {loading ? 'Re-analyzing…' : '⚡ Re-analyze Now'}
    </button>
  )
}

function AddEmployeeTab({ onToast }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    for (const k of ['first_name', 'last_name', 'role', 'hire_date']) {
      if (!form[k].trim()) { onToast(`Missing: ${k}`, true); return }
    }
    for (const k of ['tenure_years', 'salary', 'performance_score', 'age']) {
      if (form[k] === '' || isNaN(Number(form[k]))) { onToast(`Invalid: ${k}`, true); return }
    }
    setSubmitting(true)
    try {
      const payload = {
        ...form,
        tenure_years: Number(form.tenure_years),
        salary: Number(form.salary),
        performance_score: Number(form.performance_score),
        age: Number(form.age),
        is_manager: form.is_manager === 'true',
      }
      const res = await fetch(`${API_BASE}/api/ingest/employee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail))
      onToast(`✓ Added ${data.employee_id}`)
      setForm(EMPTY_FORM)
    } catch (e) {
      onToast(`Error: ${e.message}`, true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
      <Field label="First name"><input style={inputStyle} value={form.first_name} onChange={e => set('first_name', e.target.value)} /></Field>
      <Field label="Last name"><input style={inputStyle} value={form.last_name} onChange={e => set('last_name', e.target.value)} /></Field>
      <Field label="Gender">
        <select style={inputStyle} value={form.gender} onChange={e => set('gender', e.target.value)}>
          {GENDERS.map(g => <option key={g}>{g}</option>)}
        </select>
      </Field>
      <Field label="Department">
        <select style={inputStyle} value={form.department} onChange={e => set('department', e.target.value)}>
          {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
        </select>
      </Field>
      <Field label="Role"><input style={inputStyle} value={form.role} onChange={e => set('role', e.target.value)} /></Field>
      <Field label="Level">
        <select style={inputStyle} value={form.level} onChange={e => set('level', e.target.value)}>
          {LEVELS.map(l => <option key={l}>{l}</option>)}
        </select>
      </Field>
      <Field label="Tenure (years)"><input type="number" step="0.1" style={inputStyle} value={form.tenure_years} onChange={e => set('tenure_years', e.target.value)} /></Field>
      <Field label="Salary"><input type="number" style={inputStyle} value={form.salary} onChange={e => set('salary', e.target.value)} /></Field>
      <Field label="Performance score"><input type="number" step="0.1" style={inputStyle} value={form.performance_score} onChange={e => set('performance_score', e.target.value)} /></Field>
      <Field label="Location">
        <select style={inputStyle} value={form.location} onChange={e => set('location', e.target.value)}>
          {LOCATIONS.map(l => <option key={l}>{l}</option>)}
        </select>
      </Field>
      <Field label="Hire date"><input type="date" style={inputStyle} value={form.hire_date} onChange={e => set('hire_date', e.target.value)} /></Field>
      <Field label="Age"><input type="number" style={inputStyle} value={form.age} onChange={e => set('age', e.target.value)} /></Field>
      <Field label="Education">
        <select style={inputStyle} value={form.education} onChange={e => set('education', e.target.value)}>
          {EDUCATION.map(e => <option key={e}>{e}</option>)}
        </select>
      </Field>
      <Field label="Manager?">
        <select style={inputStyle} value={form.is_manager} onChange={e => set('is_manager', e.target.value)}>
          <option value="false">No</option>
          <option value="true">Yes</option>
        </select>
      </Field>
      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
        <button type="submit" disabled={submitting} style={{
          padding: '10px 18px', background: '#0f172a', color: 'white',
          border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
          cursor: submitting ? 'not-allowed' : 'pointer', width: '100%',
        }}>{submitting ? 'Adding…' : 'Add Employee'}</button>
      </div>
    </form>
  )
}

function BulkUploadTab({ onToast }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState([])
  const [uploading, setUploading] = useState(false)

  const onPick = async (f) => {
    setFile(f)
    if (!f) { setPreview([]); return }
    const text = await f.text()
    const lines = text.split(/\r?\n/).filter(Boolean).slice(0, 6)
    setPreview(lines.map(l => l.split(',')))
  }

  const upload = async () => {
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`${API_BASE}/api/ingest/bulk`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        const d = data.detail
        const msg = typeof d === 'object' ? `Row ${d.row_number}: ${d.message}` : (d || 'Upload failed')
        throw new Error(msg)
      }
      onToast(`✓ Inserted ${data.inserted} employees (${data.first_id}–${data.last_id})`)
      setFile(null); setPreview([])
    } catch (e) {
      onToast(`Error: ${e.message}`, true)
    } finally {
      setUploading(false)
    }
  }

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'sample_employees_import.csv'
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div style={{ marginBottom: '12px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <input type="file" accept=".csv" onChange={e => onPick(e.target.files?.[0] || null)} />
        <button onClick={downloadSample} style={{
          padding: '6px 12px', background: 'transparent', color: '#6366f1',
          border: '1px solid #c7d2fe', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
        }}>Download sample CSV</button>
      </div>
      {preview.length > 0 && (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'auto', marginBottom: '12px' }}>
          <table style={{ fontSize: '11px', borderCollapse: 'collapse', width: '100%' }}>
            <tbody>
              {preview.map((row, i) => (
                <tr key={i} style={{ background: i === 0 ? '#f9fafb' : 'white', fontWeight: i === 0 ? 600 : 400 }}>
                  {row.map((c, j) => (
                    <td key={j} style={{ padding: '6px 8px', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button onClick={upload} disabled={!file || uploading} style={{
        padding: '10px 18px', background: !file || uploading ? '#9ca3af' : '#0f172a', color: 'white',
        border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
        cursor: !file || uploading ? 'not-allowed' : 'pointer',
      }}>{uploading ? 'Uploading…' : 'Upload CSV'}</button>
    </div>
  )
}

export default function Ingest() {
  const [tab, setTab] = useState('single')
  const [toast, setToast] = useState(null)

  const showToast = (msg, error = false) => {
    setToast({ msg, error })
    setTimeout(() => setToast(null), 5000)
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1200px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Ingest Data</h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>
            Add new hires individually or in bulk. Click Re-analyze to refresh gap comparisons.
          </p>
        </div>
        <ReanalyzeButton onResult={showToast} />
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid #e5e7eb' }}>
        {[['single', 'Add Employee'], ['bulk', 'Bulk Upload']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            padding: '10px 16px', background: 'none', border: 'none',
            borderBottom: tab === k ? '2px solid #8b5cf6' : '2px solid transparent',
            color: tab === k ? '#8b5cf6' : '#64748b',
            fontSize: '13px', fontWeight: 600, cursor: 'pointer',
          }}>{l}</button>
        ))}
      </div>

      <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
        {tab === 'single' ? <AddEmployeeTab onToast={showToast} /> : <BulkUploadTab onToast={showToast} />}
      </div>

      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px',
          padding: '12px 18px', borderRadius: '8px',
          background: toast.error ? '#fef2f2' : '#ecfdf5',
          color: toast.error ? '#991b1b' : '#065f46',
          border: `1px solid ${toast.error ? '#fecaca' : '#a7f3d0'}`,
          fontSize: '13px', fontWeight: 500, maxWidth: '400px',
        }}>{toast.msg}</div>
      )}
    </div>
  )
}
