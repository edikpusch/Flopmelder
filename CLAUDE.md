# FlopMelder – Projektkontext für Claude Code

## Projekt-Übersicht
React PWA für Verkaufsleiter (VL) zur monatlichen Meldung der 15 "Flop"-Artikel
(kürzestes MHD + Kolli-Menge) je Filiale, exportiert als .xlsx im festen Ziel-Layout.
- **Repo:** edikpusch/flop-melder (privat)
- **Stack:** React + Vite + ExcelJS + localStorage (kein Backend, keine weiteren Dependencies)
- **Deploy:** Vercel (Auto-Deploy bei Push auf main)

## Workflow
1. Änderungen in Claude Code machen
2. Git Commit & Push
3. Vercel deployed automatisch

## Projektstruktur
```
src/
  pages/
    HomeScreen.jsx              ← Start: Neue Meldung / Archiv / Einstellungen
    EinstellungenScreen.jsx     ← VL-Profil, Filialen- & Flop-15-Verwaltung
    MeldungScreen.jsx           ← Kern: Filialen-Checkliste einer Meldung
    FilialeErfassungScreen.jsx  ← Erfassung der 15 Artikel für 1 Filiale
    ArchivScreen.jsx            ← Vergangene Meldungen, erneut exportieren
  store.js                      ← localStorage-Zugriff (Profile, Filialen, Artikel, Meldungen)
  export.js                     ← ExcelJS-Export ins Ziel-Layout
  NavContext.jsx                ← einfaches State-basiertes Routing (kein react-router)
  App.jsx                       ← Screen-Switch je nach Route
  main.jsx                      ← Entry Point
```

## Datenstruktur (localStorage)
```js
// Key: 'fm_profile'
{ vlName: 'Pusch', nl: 'Ganderkesee' }

// Key: 'fm_filialen'  (Reihenfolge relevant = Zeilenreihenfolge im Export)
[{ id, nummer }]

// Key: 'fm_artikel'  (Reihenfolge relevant = Spaltenreihenfolge im Export, 15 Stück)
[{ id, nummer, name }]  // nummer als String (Artikel 15 hat Doppelnummer "19255 / 408717")

// Key: 'fm_meldungen'
[{
  id, monat,           // "2026-07"
  erstelltAm,           // ISO-String
  status,               // 'offen' | 'fertig' (informell, siehe filialeStatus)
  filialeStatus,        // { [filialeId]: 'fertig' } – gesetzt beim Speichern in FilialeErfassungScreen
  eintraege,             // { [filialeId]: { [artikelId]: { mhd: string, menge: number } } }
}]
```
Beim App-Start seeden Store-Funktionen (`seedIfEmpty`) leere Keys mit den Stammdaten
(VL "Pusch" / NL "Ganderkesee", 10 Filialen, 15 Flop-Artikel).

## Bekannte Eigenheiten & wichtige Regeln

### Store-Funktionen (store.js)
Alle Zugriffe laufen über benannte Exporte (`getProfile`, `saveProfile`, `getFilialen`,
`saveFilialen`, `getArtikel`, `saveArtikel`, `resetArtikelToDefault`, `getMeldungen`,
`getMeldung`, `saveMeldung`, `createMeldung`, `deleteMeldung`, `getVormonatVorlage`).

### Routing (NavContext.jsx)
Kein react-router (Spec: nur ExcelJS als zusätzliches Package). Einfacher State-Router
über `useNav()` → `{ route, navigate(screen, params) }`. Screens: `home`, `einstellungen`,
`meldung`, `filiale`, `archiv`.

### Filialen-Status (Checkliste)
Da das Datenmodell keinen expliziten Status pro Filiale vorsieht, wird er aus
`meldung.filialeStatus[filialeId]` (gesetzt beim "Speichern & zurück"/"Speichern & nächste
Filiale") und den `eintraege` abgeleitet:
- `offen`: kein `filialeStatus`-Eintrag, keine Menge > 0
- `teilweise`: mind. 1 Menge > 0, aber nicht als "fertig" gespeichert
- `fertig`: `filialeStatus[filialeId] === 'fertig'`

### MHD-Feld
Roh-String wird exakt wie eingegeben gespeichert (kein Umformatieren). Der native
Datepicker-Button dient nur als Eingabehilfe und schreibt `TT.MM.JJJJ` ins Textfeld.
Erlaubte Formate: `TT.MM.JJJJ`, `TT.MM.JJ`, `MM.JJJJ`, `MM.JJ` – **nie** als echtes Datum
interpretieren.

### Menge
Tap-Buttons `0 / 0,5 / 1 / 1,5 / 2 / +`. Der `+`-Button öffnet ein kleines Zahlenfeld für
andere Werte (z.B. 2,5 / 3) und zeigt danach den custom-Wert statt "+" an. Default = 0.
Bei Menge 0 wird das MHD-Feld ausgeblendet.

### Vormonat als Vorlage (`getVormonatVorlage`)
Sucht die neueste Meldung mit `monat` = Vormonat, übernimmt nur die `mhd`-Werte, setzt
alle Mengen auf 0.

## XLSX-Export (export.js)
- **Sheet-Name:** exakt `Erfassung TS`
- **Spalten:** `A` = VL, `B` = Filial Nr., je Artikel 2 Spalten (MHD | Menge) →
  15 × 2 = 30 Spalten, gesamt `A`–`AF` (32 Spalten)
- **Zeile 2:** ab Spalte C je Artikel die ArtikelNr, über 2 Spalten gemerged & zentriert
- **Zeile 3:** `A3`="VL", `B3`="Filial Nr.", ab C je Artikel der Artikelname gemerged & zentriert
- **Zeile 4:** je Artikel "kürzestes MHD" | "Menge"
- **Datenzeilen ab Zeile 5:** eine Zeile pro Filiale in Stammdaten-Reihenfolge; VL-Name nur
  in der ersten Datenzeile; MHD als Text (`numFmt = '@'`), Menge als Zahl (0 falls leer)
- **Keine Formeln, keine Summenzeile** – alle Werte werden in JS vorberechnet
- **Dateiname:** `Flop 15 Artikel NL {NL} {VLName} {YYYY-MM}.xlsx`
- Download läuft rein client-seitig über `Blob` + `URL.createObjectURL` (kein Backend)

## Bekannte Quirks / bitte beachten
- **Dezimal-Komma:** Menge `0,5` wird aktuell als Zahl `0.5` geschrieben. Beim ersten
  Export auf dem iPad (Docs@Work) prüfen, ob Komma korrekt angezeigt wird – falls nicht,
  Menge alternativ als Text `"0,5"` schreiben (in `export.js`, `mengeCell.value`).
- **MHD nie in ein echtes Datumsformat zwingen** – immer als Text (`numFmt = '@'`), damit
  `08.26` (nur Monat) nicht umgedeutet wird.
- **Merge-Zellen:** ArtikelNr (Zeile 2) und Name (Zeile 3) müssen über exakt die 2 Spalten
  des jeweiligen Artikels gemerged werden, sonst verrutscht das Layout bei ungerader Anzahl.
- **Kein react-router, kein DragList-Package** – nur ExcelJS als zusätzliche Dependency,
  Reihenfolge-Änderung in Einstellungen läuft über Hoch/Runter-Buttons statt Drag & Drop.

## Häufige Fehler & Fixes

| Fehler | Ursache | Fix |
|--------|---------|-----|
| MHD wird zu Datum umformatiert | Fehlendes `numFmt = '@'` auf der Zelle | Text-Format vor dem Setzen des Werts erzwingen |
| Spalten verrutschen im Export | Merge-Range stimmt nicht mit `FIRST_ARTIKEL_COL + j*2` überein | Spaltenindex-Berechnung prüfen |
| Filiale bleibt "offen" trotz Eingabe | `filialeStatus` wird nur beim Speichern gesetzt, nicht automatisch bei Menge > 0 | Das ist gewollt (siehe Checkliste-Logik oben) |
| Reihenfolge Filialen/Artikel falsch im Export | `getFilialen()`/`getArtikel()` Reihenfolge nicht aktuell | Nach Reorder immer `saveFilialen`/`saveArtikel` aufrufen (passiert automatisch in EinstellungenScreen) |
