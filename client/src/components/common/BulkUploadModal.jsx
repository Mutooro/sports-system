import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, Download, X, FileSpreadsheet, AlertCircle } from 'lucide-react'
import { toast } from 'react-toastify'
import { parseCsv, downloadCsv } from '../../utils/csv'

const BulkUploadModal = ({
  title,
  templateFilename,
  templateContent,
  uploadFn,
  queryKey,
  onClose
}) => {
  const queryClient = useQueryClient()
  const fileRef = useRef(null)
  const [rows, setRows] = useState([])
  const [fileName, setFileName] = useState('')

  const uploadMutation = useMutation({
    mutationFn: uploadFn,
    onSuccess: (res) => {
      const { created, failed, errors } = res.data.data
      if (created > 0) {
        toast.success(`Successfully imported ${created} record(s)`)
        queryClient.invalidateQueries(queryKey)
      }
      if (failed > 0) {
        const detail = errors?.slice(0, 3).map((e) => `Row ${e.row}: ${e.message}`).join('; ')
        toast.warn(`${failed} row(s) failed. ${detail}`)
      }
      if (created > 0) onClose()
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Import failed')
  })

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = parseCsv(ev.target.result)
        setRows(parsed)
        if (parsed.length === 0) toast.error('No data rows found in file')
      } catch {
        toast.error('Failed to parse CSV file')
        setRows([])
      }
    }
    reader.readAsText(file)
  }

  const handleSubmit = () => {
    if (rows.length === 0) return toast.error('Upload a CSV file first')
    uploadMutation.mutate(rows)
  }

  const previewHeaders = rows.length > 0 ? Object.keys(rows[0]) : []

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="text-primary-600" size={24} />
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => downloadCsv(templateFilename, templateContent)}
              className="btn-secondary flex items-center gap-2"
            >
              <Download size={16} />
              Download Template
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="btn-primary flex items-center gap-2"
            >
              <Upload size={16} />
              Choose CSV File
            </button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
          </div>

          {fileName && (
            <p className="text-sm text-gray-600">
              Selected: <span className="font-medium">{fileName}</span> — {rows.length} row(s)
            </p>
          )}

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3 text-sm text-blue-800">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Import instructions</p>
              <p className="mt-1 text-blue-700">Download the template, fill in your data, and upload the CSV. Hall and team names are matched by name. New students get default password <code className="bg-blue-100 px-1 rounded">Student@123</code>.</p>
            </div>
          </div>

          {rows.length > 0 && (
            <div className="border rounded-lg overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {previewHeaders.map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-t">
                      {previewHeaders.map((h) => (
                        <td key={h} className="px-3 py-2 text-gray-700">{row[h]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 5 && (
                <p className="text-xs text-gray-500 px-3 py-2 border-t">…and {rows.length - 5} more rows</p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={rows.length === 0 || uploadMutation.isPending}
            className="btn-primary"
          >
            {uploadMutation.isPending ? 'Importing…' : `Import ${rows.length} Row(s)`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default BulkUploadModal
