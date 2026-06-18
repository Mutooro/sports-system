import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, Download, X, FileSpreadsheet, AlertCircle, CheckCircle, Eye } from 'lucide-react'
import { toast } from 'react-toastify'
import { bulkAPI } from '../../services/api'
import { parseCsv, downloadCsv } from '../../utils/csv'

/**
 * Coordinated bulk-import modal. The admin uploads four CSVs (coaches,
 * students, teams, players) — or one composite CSV per section — and the
 * server processes them in dependency order with strict reference checks.
 *
 * The preview button does a dry-run so the admin can see what would happen
 * before committing. On commit, the server returns a section-by-section
 * report and per-row generated passwords for any new users.
 */
const BulkImportModal = ({ onClose, queryKeysToInvalidate = [] }) => {
  const queryClient = useQueryClient()
  const [sections, setSections] = useState({
    coaches:  { rows: [], fileName: '' },
    students: { rows: [], fileName: '' },
    teams:    { rows: [], fileName: '' },
    players:  { rows: [], fileName: '' }
  })
  const [options, setOptions] = useState({ dryRun: false, skipExisting: true, upsert: false })
  const [report, setReport] = useState(null)
  const fileRefs = {
    coaches:  useRef(null),
    students: useRef(null),
    teams:    useRef(null),
    players:  useRef(null)
  }
  const templates = {
    coaches:  'email,first_name,last_name,phone,password\ncoach@makerere.ac.ug,Jane,Coach,+256700000000,',
    students: 'email,first_name,last_name,student_number,phone,password\nstudent@makerere.ac.ug,John,Student,21/U/0001,+256700000001,',
    teams:    'name,hall_name,sport_type,coach_email,description\nMitchell FC,Mitchell Hall,football,coach@makerere.ac.ug,First team',
    players:  'email,sport,position,hall_name,team_name,date_of_birth,height,weight\nstudent@makerere.ac.ug,football,midfielder,Mitchell Hall,Mitchell FC,2003-05-15,175,70'
  }

  const mutation = useMutation({
    mutationFn: (payload) => bulkAPI.import(payload),
    onSuccess: (res) => {
      setReport(res.data.data)
      if (!res.data.data.dry_run) {
        queryKeysToInvalidate.forEach((k) => queryClient.invalidateQueries(k))
      }
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Bulk import failed')
  })

  const handleFile = (section, file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = parseCsv(ev.target.result)
        setSections((prev) => ({ ...prev, [section]: { rows: parsed, fileName: file.name } }))
      } catch {
        toast.error(`Failed to parse ${section} CSV`)
      }
    }
    reader.readAsText(file)
  }

  const submit = (dryRun) => {
    const payload = {
      dryRun,
      skipExisting: options.skipExisting,
      upsert: options.upsert
    }
    let hasAny = false
    for (const key of Object.keys(sections)) {
      if (sections[key].rows.length > 0) {
        payload[key] = sections[key].rows
        hasAny = true
      }
    }
    if (!hasAny) return toast.error('Upload at least one CSV before importing')
    mutation.mutate(payload)
  }

  const totalRows = Object.values(sections).reduce((s, sec) => s + sec.rows.length, 0)
  const generatedPasswords = (report?.sections?.students?.rows || [])
    .concat(report?.sections?.coaches?.rows || [])
    .filter((r) => r.status === 'created' && r.password)
    .map((r) => ({ email: r.user?.email || r.email, password: r.password }))

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="text-primary-600" size={24} />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Bulk Import</h2>
              <p className="text-sm text-gray-500">Coaches, students, teams, and players in dependency order.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!report && (
            <>
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3 text-sm text-blue-800">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Order matters</p>
                  <p className="mt-1 text-blue-700">
                    Coaches and students are processed first so that teams and players can reference them.
                    You can upload one section at a time or all four together; the server resolves cross-references in the same upload.
                  </p>
                </div>
              </div>

              {[
                { key: 'coaches',  label: 'Coaches',  helper: 'Required columns: email, first_name, last_name. Optional: phone, password.' },
                { key: 'students', label: 'Students', helper: 'Required columns: email, first_name, last_name, student_number. Optional: phone, password.' },
                { key: 'teams',    label: 'Teams',    helper: 'Required columns: name, hall_name. Optional: sport_type, coach_email, description. Coaches must exist in this batch or in the database.' },
                { key: 'players',  label: 'Players',  helper: 'Required columns: email, hall_name. Optional: sport, position, team_name, dob, height, weight. The user must already exist as a student.' }
              ].map(({ key, label, helper }) => (
                <div key={key} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{label}</h3>
                      <p className="text-xs text-gray-500">{helper}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => downloadCsv(`${key}_template.csv`, templates[key])}
                        className="btn-secondary text-xs flex items-center gap-1"
                      >
                        <Download size={14} /> Template
                      </button>
                      <button
                        type="button"
                        onClick={() => fileRefs[key].current?.click()}
                        className="btn-primary text-xs flex items-center gap-1"
                      >
                        <Upload size={14} /> Choose CSV
                      </button>
                      <input
                        ref={fileRefs[key]}
                        type="file"
                        accept=".csv,text/csv"
                        className="hidden"
                        onChange={(e) => handleFile(key, e.target.files?.[0])}
                      />
                    </div>
                  </div>
                  {sections[key].fileName && (
                    <p className="text-xs text-gray-600">
                      {sections[key].fileName} — {sections[key].rows.length} row(s)
                    </p>
                  )}
                </div>
              ))}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={options.skipExisting}
                    onChange={(e) => setOptions({ ...options, skipExisting: e.target.checked })}
                    className="rounded" />
                  Skip existing rows (default)
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={options.upsert}
                    onChange={(e) => setOptions({ ...options, upsert: e.target.checked })}
                    className="rounded" />
                  Upsert on conflict (overwrites fields)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={() => submit(true)} disabled={mutation.isPending || totalRows === 0}
                  className="btn-secondary flex items-center gap-2">
                  <Eye size={16} /> Preview (dry-run)
                </button>
                <button type="button" onClick={() => submit(false)} disabled={mutation.isPending || totalRows === 0}
                  className="btn-primary flex items-center gap-2">
                  <Upload size={16} /> {mutation.isPending ? 'Importing…' : `Import ${totalRows} row(s)`}
                </button>
              </div>
            </>
          )}

          {report && (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${report.dry_run ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
                <p className="font-medium text-gray-900">
                  {report.dry_run ? 'Preview only — nothing was written.' : 'Import complete.'}
                </p>
                {generatedPasswords.length > 0 && (
                  <div className="mt-3 bg-white border border-amber-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-2">
                      Generated passwords — copy these now
                    </p>
                    <ul className="text-xs font-mono space-y-1 max-h-32 overflow-y-auto">
                      {generatedPasswords.map((p, i) => (
                        <li key={i}><span className="text-gray-500">{p.email}</span> &nbsp;→&nbsp; <span className="font-bold">{p.password}</span></li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {Object.entries(report.sections).map(([name, summary]) => (
                summary.total > 0 && (
                  <div key={name} className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900 capitalize">{name}</h4>
                      <p className="text-xs text-gray-600">
                        {summary.created} created · {summary.updated} updated · {summary.skipped} skipped · {summary.failed} failed
                      </p>
                    </div>
                    {summary.rows.some((r) => r.error) && (
                      <div className="max-h-48 overflow-y-auto">
                        <table className="w-full text-sm">
                          <tbody>
                            {summary.rows.filter((r) => r.error).map((r, i) => (
                              <tr key={i} className="border-t">
                                <td className="px-4 py-2 text-gray-500 w-16">row {r.row}</td>
                                <td className="px-4 py-2 text-gray-700">{r.email || r.name || ''}</td>
                                <td className="px-4 py-2 text-red-600">{r.error}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {summary.rows.some((r) => r.status === 'created') && (
                      <div className="max-h-48 overflow-y-auto">
                        <table className="w-full text-sm">
                          <tbody>
                            {summary.rows.filter((r) => r.status === 'created').map((r, i) => (
                              <tr key={i} className="border-t">
                                <td className="px-4 py-2 text-gray-500 w-16">row {r.row}</td>
                                <td className="px-4 py-2 text-green-700 flex items-center gap-1">
                                  <CheckCircle size={14} /> {r.email || r.name}
                                </td>
                                <td className="px-4 py-2 text-gray-500 text-xs">created</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              ))}

              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={() => { setReport(null); if (!report.dry_run) onClose() }} className="btn-secondary">
                  {report.dry_run ? 'Back to upload' : 'Close'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BulkImportModal