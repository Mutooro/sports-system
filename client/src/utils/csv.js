export function parseCsv(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((l) => l.trim())
  if (lines.length === 0) return []

  const parseLine = (line) => {
    const values = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else current += char
    }
    values.push(current.trim())
    return values
  }

  const headers = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/^\uFEFF/, ''))
  const rows = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i])
    if (values.every((v) => !v)) continue
    const row = {}
    headers.forEach((header, idx) => { row[header] = values[idx] ?? '' })
    rows.push(row)
  }

  return rows
}

export function downloadCsv(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

// Coordinated bulk-import templates. The server endpoint POST /admin/bulk/import
// accepts each section in any order; the server runs them in dependency order
// (coaches/students -> teams -> players). Halls are read-only; a row that names
// a hall that does not exist is a hard error.

export const COACH_CSV_TEMPLATE = `email,first_name,last_name,phone,password
coach@makerere.ac.ug,Jane,Coach,+256700000000,
coach2@makerere.ac.ug,Mark,Trainer,+256700000001,TempCoach123!`

export const STUDENT_CSV_TEMPLATE = `email,first_name,last_name,student_number,phone,password
student@makerere.ac.ug,John,Doe,21/U/0001,+256700000001,
student2@makerere.ac.ug,Jane,Smith,21/U/0002,+256700000002,`

export const TEAM_CSV_TEMPLATE = `name,hall_name,sport_type,coach_email,description
Mitchell FC,Mitchell Hall,football,coach@makerere.ac.ug,First team squad
Nkrumah Warriors,Nkrumah Hall,football,,Reserve team`

export const PLAYER_CSV_TEMPLATE = `email,sport,position,hall_name,team_name,date_of_birth,height,weight
student@makerere.ac.ug,football,midfielder,Mitchell Hall,Mitchell FC,2003-05-15,175,70
student2@makerere.ac.ug,football,forward,Nkrumah Hall,,2002-08-20,168,62`