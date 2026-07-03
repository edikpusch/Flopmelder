import ExcelJS from 'exceljs'
import { getProfile, getArtikel } from './store.js'

const THIN = { style: 'thin' }
const BORDER_ALL = { top: THIN, left: THIN, bottom: THIN, right: THIN }

const COL_A = 1
const COL_B = 2
const FIRST_ARTIKEL_COL = 3 // C

function sanitizeFilename(str) {
  return String(str).replace(/[\\/:*?"<>|]/g, '-')
}

export async function exportMeldung(meldung, filialen) {
  const profile = getProfile()
  const artikelListe = getArtikel()

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Erfassung TS')

  // Spaltenbreiten
  sheet.getColumn(COL_A).width = 12
  sheet.getColumn(COL_B).width = 10
  artikelListe.forEach((_, j) => {
    const base = FIRST_ARTIKEL_COL + j * 2
    sheet.getColumn(base).width = 13 // kürzestes MHD
    sheet.getColumn(base + 1).width = 8 // Menge
  })

  // Zeile 2: ArtikelNr gemerged
  const row2 = sheet.getRow(2)
  artikelListe.forEach((a, j) => {
    const base = FIRST_ARTIKEL_COL + j * 2
    sheet.mergeCells(2, base, 2, base + 1)
    const cell = row2.getCell(base)
    cell.value = a.nummer
    cell.font = { bold: true }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })

  // Zeile 3: VL / Filial Nr. / Artikelname gemerged
  const row3 = sheet.getRow(3)
  row3.getCell(COL_A).value = 'VL'
  row3.getCell(COL_A).font = { bold: true }
  row3.getCell(COL_B).value = 'Filial Nr.'
  row3.getCell(COL_B).font = { bold: true }
  artikelListe.forEach((a, j) => {
    const base = FIRST_ARTIKEL_COL + j * 2
    sheet.mergeCells(3, base, 3, base + 1)
    const cell = row3.getCell(base)
    cell.value = a.name
    cell.font = { bold: true }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })

  // Zeile 4: kürzestes MHD | Menge
  const row4 = sheet.getRow(4)
  artikelListe.forEach((_, j) => {
    const base = FIRST_ARTIKEL_COL + j * 2
    const mhdCell = row4.getCell(base)
    mhdCell.value = 'kürzestes MHD'
    mhdCell.font = { bold: true }
    mhdCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }

    const mengeCell = row4.getCell(base + 1)
    mengeCell.value = 'Menge'
    mengeCell.font = { bold: true }
    mengeCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  })

  // Datenzeilen ab Zeile 5
  filialen.forEach((filiale, i) => {
    const rowIdx = 5 + i
    const row = sheet.getRow(rowIdx)
    row.getCell(COL_A).value = i === 0 ? profile.vlName : ''
    row.getCell(COL_B).value = filiale.nummer

    artikelListe.forEach((a, j) => {
      const base = FIRST_ARTIKEL_COL + j * 2
      const eintrag = meldung.eintraege?.[filiale.id]?.[a.id] || { mhd: '', menge: 0 }

      const mhdCell = row.getCell(base)
      mhdCell.value = eintrag.mhd || ''
      mhdCell.numFmt = '@' // als Text, kein Datumsformat
      mhdCell.alignment = { horizontal: 'center', vertical: 'middle' }

      const mengeCell = row.getCell(base + 1)
      mengeCell.value = Number(eintrag.menge) || 0
      mengeCell.alignment = { horizontal: 'center', vertical: 'middle' }
    })
  })

  // Rahmen auf gesamten Kopf- + Datenbereich
  const lastRow = 4 + filialen.length
  const lastCol = FIRST_ARTIKEL_COL + artikelListe.length * 2 - 1
  for (let r = 2; r <= lastRow; r++) {
    for (let c = 1; c <= lastCol; c++) {
      sheet.getRow(r).getCell(c).border = BORDER_ALL
    }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  const dateiname = `Flop 15 Artikel NL ${sanitizeFilename(profile.nl)} ${sanitizeFilename(
    profile.vlName
  )} ${meldung.monat}.xlsx`

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = dateiname
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
