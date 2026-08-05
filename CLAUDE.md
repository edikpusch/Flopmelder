# FlopMelder – Projektkontext für Claude Code

## Projekt-Übersicht
React PWA für Verkaufsleiter (VL) zur monatlichen Meldung der 15 "Flop"-Artikel
(kürzestes MHD + Kolli-Menge) je Filiale, exportiert als .xlsx im festen Ziel-Layout.
- **Repo:** edikpusch/Flopmelder (privat)
- **Live:** https://flop-melder.vercel.app
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
    HomeScreen.jsx              ← Start: aktives Profil + Monatswahl / Archiv / Einstellungen
    EinstellungenScreen.jsx     ← Profile, Filialen des Profils, globale Flop-15-Liste
    MeldungScreen.jsx           ← Filialen-Checkliste einer Meldung
    FilialeErfassungScreen.jsx  ← Wizard: 15 Artikel einzeln für 1 Filiale
    ArchivScreen.jsx            ← Vergangene Meldungen, erneut exportieren, löschen
  store.js                      ← localStorage-Zugriff + abgeleiteter Status
  export.js                     ← ExcelJS-Export ins Ziel-Layout
  NavContext.jsx                ← einfaches State-basiertes Routing (kein react-router)
  App.jsx                       ← Screen-Switch je nach Route
  main.jsx                      ← Entry Point
```

## Datenstruktur (localStorage)
```js
// Key: 'fm_profiles'  ← Ein Profil = VL + NL + eigene Filialliste.
[{
  id,
  vlName, nl,      // landen im Export (Spalte A bzw. Dateiname)
  filialen: [{ id, nummer }]   // Reihenfolge = Zeilenreihenfolge im Export
}]
// KEIN separates Bezeichnungsfeld - der Anzeigename kommt aus profilLabel(p)
// ("VL · NL"). Eine ältere Zwischenversion hatte ein 'name'-Feld; seedIfEmpty
// übernimmt es als vlName, falls dieser leer ist.

// Key: 'fm_active_profile'  ← id des aktiven Profils

// Key: 'fm_artikel'  ← GLOBAL, gilt für alle Profile (firmenweit vorgegeben)
[{ id, nummer, name }]  // nummer als String (Artikel 15 hat Doppelnummer "19255 / 408717")
                        // Reihenfolge = Spaltenreihenfolge im Export

// Key: 'fm_meldungen'
[{
  id, profileId,        // gehört zu genau einem Profil
  monat,                // "2026-07"
  erstelltAm,           // ISO-String
  eintraege,            // { [filialeId]: { [artikelId]: { mhd, menge, erfasst } } }
  filialeLastIndex,     // { [filialeId]: number } – zuletzt angesehener Artikel (Wizard-Resume)
}]
```

**Kein `status`-Feld mehr.** Der frühere `meldung.status` wurde nie gelesen oder
aktualisiert und ist entfernt. Es gibt bewusst **kein "eingereicht"-Konzept** – der
Zustand einer Meldung wird immer aus den Einträgen abgeleitet (siehe unten).

### Migration aus der Ein-Profil-Version
`seedIfEmpty()` migriert einmalig die alten Keys `fm_profile` + `fm_filialen` in ein
erstes Profil und hängt `profileId` an bestehende Meldungen. **Die Filial-IDs bleiben
dabei erhalten**, sonst würden alle vorhandenen Einträge verwaisen. Die alten Keys
werden nicht gelöscht (schadet nicht, dient als Sicherheitsnetz).

## Bekannte Eigenheiten & wichtige Regeln

### Schreibzugriffe: IMMER über mutateMeldung()
In `FilialeErfassungScreen` und `MeldungScreen` laufen alle Änderungen über
`mutateMeldung(mutator)`, das den neuesten Stand in einem `useRef` mitführt.

**Grund (echter Bug, der schon einmal live war):** `chooseMenge()` speichert erst die
Menge und ruft dann im selben Handler `goTo()`. Baut `goTo` sein Objekt aus dem
React-State auf, ist das noch der Stand *vor* der Menge – die gerade gesetzte Menge
wird zurückgeschrieben auf 0. Das betraf 14 der 15 Artikel (nur der letzte, ohne
Auto-Advance, überlebte) und der Export schrieb fast überall 0.
**Niemals mehrere Änderungen im selben Handler direkt aus `meldung` ableiten.**

### Abgeleiteter Status (nichts davon wird gespeichert)
`store.js` liefert die Regeln, damit alle Screens dieselbe Wahrheit benutzen:
- `istArtikelErledigt(eintrag)` → `erfasst === true || menge > 0`
  (`menge > 0` ist der Rückwärtskompatibilitäts-Pfad für Daten von vor dem `erfasst`-Flag)
- `getFilialeStatus(...)` → `offen` (0 erledigt) / `teilweise` / `fertig` (alle Artikel)
- `istMeldungVollstaendig(...)` → alle Filialen `fertig`

**Fertig-Regel:** Eine Filiale gilt erst als fertig, wenn **jeder** Artikel bewusst
entschieden wurde. `erfasst: true` wird ausschließlich in `chooseMenge()` gesetzt –
also beim Tippen auf einen Mengen-Button, **auch bei Menge 0** ("kein Bestand").
Reines Weiterblättern mit "Weiter ›" zählt NICHT. Es gibt kein manuelles
"als fertig markieren" mehr, das wäre sonst wieder umgehbar.

### Erfassungs-Flow (FilialeErfassungScreen.jsx) – Wizard statt Liste
Ein Artikel nach dem anderen, nicht alle 15 als lange Liste:
- Große Artikel-Karte: Name, Nr., **MHD-Feld zuerst**, danach Menge-Buttons
- Chip-Leiste oben (nummerierte Kreise, horizontal scrollbar): grün = erledigt,
  blauer Rahmen = aktueller Artikel, Tap springt direkt hin
- **MHD zuerst, dann Menge:** Beim Betreten eines Artikels wird das MHD-Feld
  automatisch fokussiert **und** selektiert (`mhdInputRef`-Effekt auf `currentIndex`),
  die Zahlentastatur öffnet sich sofort. Die Menge ist bewusst der **letzte** Schritt:
  ein Tap auf einen Mengen-Button nimmt dem Textfeld den Fokus (Tastatur schließt sich
  von selbst) und springt direkt zum nächsten Artikel. Kein manuelles Tastatur-Schließen
- Unten "‹ Zurück" / "Weiter ›"; beim letzten Artikel "Nächste Filiale ›"
- Der Fortschritt steht nur in der Kopfzeile und in den Chips – eine gelbe Box mit den
  offenen Artikelnummern gab es kurzzeitig, sie wurde auf Wunsch wieder entfernt
- **Resume-Position:** `meldung.filialeLastIndex[filialeId]` wird bei jeder Navigation
  (`goTo`) geschrieben. Beim Öffnen **über die Filialübersicht** wird dort fortgesetzt,
  nicht beim "ersten Artikel ohne Menge" – Menge 0 kann bewusst gewählt sein
- **"Nächste Filiale ›" beginnt dagegen immer bei Artikel 1** (`startIndex: 0` als
  Route-Parameter). Man geht die neue Filiale von vorne durch, statt an einer alten
  Stelle einzusteigen

### App.jsx: `key` auf dem Erfassungs-Screen ist Pflicht
`<FilialeErfassungScreen key={route.params.filialeId} … />` – **nicht entfernen.**
Ohne den Key sieht React beim Filialwechsel denselben Komponententyp an derselben Stelle
und behält die Instanz. Die `useState`-Initialisierer laufen dann nicht erneut: Der
Artikel-Index blieb stehen (nach "Nächste Filiale" landete man auf Artikel 15 der neuen
Filiale) und der `mhdModus` der vorherigen Filiale galt weiter.

### MHD-Feld
Erlaubte Formate: `TT.MM.JJJJ`, `TT.MM.JJ`, `MM.JJJJ`, `MM.JJ` – **nie** als echtes Datum
interpretieren, immer als Roh-String speichern.

**Auto-Formatierung beim Tippen:** Da `TT.MM.JJ` und `MM.JJJJ` bei gleicher Ziffernanzahl
(6) nicht unterscheidbar sind, gibt es pro Artikel einen Modus-Umschalter ("Tag"/"Monat"),
dessen Zustand pro `artikelId` im `mhdModus`-State liegt:
- `tag`: Zifferngruppen `[2,2,4]` → `TT.MM.JJJJ` (kurzes Jahr durch früheres Stoppen)
- `monat`: Zifferngruppen `[2,4]` → `MM.JJJJ`
- `formatMhdDigits(digits, modus)` setzt Punkte automatisch, sobald ein Block voll ist
- Backspace wird per `onKeyDown` abgefangen und entfernt die letzte **Ziffer** (sonst
  „hängt" das Löschen an einem automatisch gesetzten Punkt)
- Modus wird beim Laden aus der Punktanzahl abgeleitet (`mhdModusAusWert`)
- Der native Datepicker setzt den Modus immer auf `tag` zurück

### Menge
Presets in 0,5er-Schritten: `0 / 0,5 / 1 / 1,5 / 2 / 2,5` als **3×2-Raster**, darunter
ein **fest sichtbares** Feld für alles darüber (`inputMode="decimal"`, Platzhalter
"andere Menge"). "OK" und Enter verhalten sich wie ein Preset-Tap: speichern und zum
nächsten Artikel springen. Das Feld bekommt bewusst **keinen** Autofokus – der gehört dem
MHD-Feld. Ein Nicht-Preset-Wert (z.B. 4,5) steht im Feld und ist hervorgehoben.

**Aktiv-Markierung nur wenn `erfasst`:** Ohne bewusste Wahl darf nichts hervorgehoben
sein – sonst sieht ein unberührter Artikel so aus, als wäre die 0 bereits gewählt worden.

Das MHD-Feld ist **immer sichtbar**, nicht an Menge > 0 gekoppelt.

### Platz auf dem Handy (wichtig beim Umbauen des Wizards)
Das MHD-Feld fokussiert sich beim Betreten eines Artikels selbst, die Tastatur ist also
offen, während man die Menge wählt. Auf Android verkleinert sie den Viewport – die
Menge-Buttons müssen trotzdem erreichbar bleiben.
- Der Fortschritt sitzt deshalb in der **Kopfzeile** (`.header-meta`), nicht in einer
  eigenen Zeile
- `@media (max-height: 460px)` in `index.css` rückt alles Umgebende zusammen. Die
  **Trefferflächen der Buttons bleiben dabei bei 46px** – sie werden nie verkleinert
- Gemessen: bei 360×370 (kleines Handy, Tastatur offen) sind beide Preset-Zeilen
  vollständig sichtbar; das freie Mengenfeld liegt knapp darunter und wird beim Antippen
  vom Browser selbst ins Bild gescrollt

### Stammdaten-Änderungen (bewusste Entscheidung: immer aktuell)
Meldungen frieren ihre Stammdaten **nicht** ein – ein Nachdruck aus dem Archiv nutzt die
heutige Filial-/Artikelliste. Damit das nicht in Datenverlust endet:
- `resetArtikelToDefault()` **behält die IDs** bereits bekannter ArtikelNummern.
  Vorher wurden neue UUIDs vergeben und **alle** bestehenden Einträge verwaisten
  (Export schrieb still leer/0)
- Löschen von Artikel/Filiale warnt via `countEintraegeFuerArtikel` /
  `countEintraegeFuerFiliale`, wenn Daten dranhängen
- Meldung-Screens lesen die Filialen aus **`meldung.profileId`**, nicht aus dem aktiven
  Profil – sonst zeigt eine Archiv-Meldung fremde Filialen

### Monat: beim Start wählbar, danach fest
Der Monat wird **auf dem Startbildschirm** gewählt (`<input type="month">`, vorbelegt mit
dem laufenden Monat) und gehört danach **fest** zur Meldung. Im MeldungScreen gibt es
bewusst kein Monatsfeld mehr – beim Umstellen wanderten dort früher die Eingaben mit, was
"jeder Monat ist eine neue Eingabe" widersprach.
- `findMeldung(profileId, monat)` sorgt für genau eine Meldung pro Monat und Profil:
  existiert sie, beschriftet sich der Button mit "fortsetzen" statt "starten" und öffnet sie
- Ein neuer Monat startet damit garantiert leer; alle MHDs werden neu erfasst
- Über die Monatswahl sind auch Nachmeldungen für vergangene Monate möglich

### MHD aus dem Vormonat übernehmen – pro Artikel
`getVormonatMhd(monat, profileId, filialeId, artikelId)` liefert das MHD **desselben**
Artikels in **derselben** Filiale aus dem Vormonat. Im Wizard erscheint daraufhin unter
der MHD-Zeile ein Button, der den Wert direkt anzeigt ("↩ Vormonat übernehmen: 12.11.2026")
– man sieht vor dem Tippen, was kommt. Gibt es keinen Wert, fehlt der Button ganz.

- **Strikt der Vormonat** (`vorherigerMonat()`): fehlt er, wird nichts angeboten, auch
  wenn zwei Monate vorher Werte lägen
- Übernimmt **nur** das MHD und setzt den Tag/Monat-Modus passend; die Menge bleibt
  unberührt, der Artikel gilt dadurch **nicht** als erfasst
- Den früheren Sammel-Button auf der Filialübersicht (`getVormonatVorlage`) gibt es nicht
  mehr – er befüllte pauschal alle Filialen auf einmal

## XLSX-Export (export.js)
`exportMeldung(meldung, filialen, profil)` – VL-Name und NL kommen aus dem **Profil**.
- **Sheet-Name:** exakt `Erfassung TS`
- **Spalten:** `A` = VL, `B` = Filial Nr., je Artikel 2 Spalten (MHD | Menge) →
  15 × 2 = 30 Spalten, gesamt `A`–`AF` (32 Spalten)
- **Zeile 2:** ab Spalte C je Artikel die ArtikelNr, über 2 Spalten gemerged & zentriert
- **Zeile 3:** `A3`="VL", `B3`="Filial Nr.", ab C je Artikelname gemerged & zentriert
- **Zeile 4:** je Artikel "kürzestes MHD" | "Menge"
- **Datenzeilen ab Zeile 5:** eine je Filiale in Stammdaten-Reihenfolge; VL-Name nur in
  der ersten Datenzeile; MHD als Text (`numFmt = '@'`); Menge als Zahl (0 falls leer);
  Filial-Nr. als **Zahl**, wenn rein numerisch (rechtsbündig wie im Original)
- Leeres MHD bleibt eine **echte Leerzelle**, kein leerer String
- **Keine Formeln, keine Summenzeile** – alle Werte in JS vorberechnet
- **Dateiname:** `Flop 15 Artikel NL {NL} {VLName} {YYYY-MM}.xlsx`
- Export bricht ab, wenn dem Profil VL-Name oder NL fehlt (stünde sonst leer im Dateinamen)
- Download rein client-seitig über `Blob` + `URL.createObjectURL`

### Export-Regressionstest
Es gibt einen Node-Harness, der `export.js` mit gestubbtem localStorage/DOM real
ausführt, die erzeugte .xlsx wieder einliest und ~27 Zellen/Merges/Typen prüft.
Nach Änderungen an `export.js` oder am Datenmodell erneut laufen lassen. Import per
`pathToFileURL` (Windows-Pfade brauchen echte `file://`-URLs), ExcelJS über
`node_modules/exceljs/lib/exceljs.nodejs.js`.

## Bekannte Quirks / bitte beachten
- **Dezimal-Komma:** Menge `0,5` wird als Zahl `0.5` geschrieben. Beim ersten Export auf
  dem iPad (Docs@Work) prüfen, ob das Komma korrekt erscheint – falls nicht, Menge
  alternativ als Text `"0,5"` schreiben (`export.js`, `mengeCell.value`).
- **MHD nie in ein echtes Datumsformat zwingen** – immer Text (`numFmt = '@'`), damit
  `08.26` (nur Monat) nicht umgedeutet wird.
- **Merge-Zellen:** ArtikelNr (Zeile 2) und Name (Zeile 3) über exakt die 2 Spalten des
  Artikels mergen, sonst verrutscht das Layout.
- **Kein react-router, kein Drag&Drop-Package** – nur ExcelJS als zusätzliche Dependency,
  Reihenfolge-Änderung über Hoch/Runter-Buttons.
- **Mehrere Profile exportieren getrennt** (eine Datei je Profil). Falls die NL alle
  Profile in einer Datei will: Spalte A ist bereits so angelegt (VL-Name nur in der
  ersten Zeile seines Blocks), Blöcke ließen sich untereinander hängen.

## Häufige Fehler & Fixes

| Fehler | Ursache | Fix |
|--------|---------|-----|
| Menge wird nicht gespeichert | Zweite Änderung im selben Handler baut auf React-State statt auf dem aktuellen Stand | Immer `mutateMeldung()` verwenden |
| Alte Meldungen plötzlich leer | Artikel-/Filial-IDs neu vergeben | `resetArtikelToDefault` gleicht über `nummer` ab, IDs nie neu würfeln |
| Archiv-Meldung zeigt fremde Filialen | Filialen aus dem aktiven statt aus `meldung.profileId` gelesen | Profil über `meldung.profileId` auflösen |
| MHD wird zu Datum umformatiert | Fehlendes `numFmt = '@'` | Text-Format auf der Zelle setzen |
| Spalten verrutschen im Export | Merge-Range passt nicht zu `FIRST_ARTIKEL_COL + j*2` | Spaltenindex-Berechnung prüfen |
| Filiale bleibt "offen" trotz Eingabe | Nur MHD getippt, keine Menge gewählt | `erfasst` wird nur in `chooseMenge()` gesetzt – das ist gewollt |
