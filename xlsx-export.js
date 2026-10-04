/* Minimal dependency-free .xlsx writer for the ICU Roster Planner.
   Builds an Office Open XML workbook (inline strings, a small style table) and wraps it in a
   store-only ZIP, so no CDN/library is needed and the page CSP can stay `script-src 'self'`. */
(function (root) {
  'use strict';

  // Cell style ids (see STYLES_XML cellXfs order).
  const STYLE = { DEFAULT: 0, HEADER: 1, WEEKEND_HEADER: 2, CENTER: 3, WEEKEND: 4, ONCALL: 5, NAME: 6, TITLE: 7, OPEN: 8, LEAVE: 9 };

  const STYLES_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font></fonts>' +
    '<fills count="7"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFE5E7EB"/></patternFill></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFDE9B8"/></patternFill></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFD6E4FF"/></patternFill></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFAD4D0"/></patternFill></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFEDEDED"/></patternFill></fill></fills>' +
    '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>' +
    '<border><left style="thin"><color rgb="FFB8BEC8"/></left><right style="thin"><color rgb="FFB8BEC8"/></right><top style="thin"><color rgb="FFB8BEC8"/></top><bottom style="thin"><color rgb="FFB8BEC8"/></bottom><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="10">' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
    '<xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
    '<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
    '<xf numFmtId="0" fontId="1" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>' +
    '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
    '<xf numFmtId="0" fontId="1" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
    '<xf numFmtId="0" fontId="0" fillId="6" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
    '</cellXfs></styleSheet>';

  const enc = new TextEncoder();

  function xmlEscape(value) {
    // Strip characters that are illegal in XML 1.0, then escape markup characters.
    return String(value)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function columnName(index) {
    let n = index + 1, out = '';
    while (n > 0) { const r = (n - 1) % 26; out = String.fromCharCode(65 + r) + out; n = Math.floor((n - 1) / 26); }
    return out;
  }

  // Excel limits sheet names to 31 characters and forbids : \ / ? * [ ]
  function safeSheetName(name, used) {
    let base = String(name || 'Sheet').replace(/[:\\/?*[\]]/g, ' ').trim().slice(0, 31) || 'Sheet';
    let candidate = base, n = 2;
    while (used.has(candidate.toLowerCase())) { const suffix = ' ' + n++; candidate = base.slice(0, 31 - suffix.length) + suffix; }
    used.add(candidate.toLowerCase());
    return candidate;
  }

  function cellXml(ref, cell) {
    if (cell === null || cell === undefined || cell === '') return '';
    const obj = (typeof cell === 'object') ? cell : { v: cell };
    const style = obj.s ? ` s="${obj.s}"` : '';
    if (obj.v === null || obj.v === undefined || obj.v === '') return obj.s ? `<c r="${ref}"${style}/>` : '';
    if (typeof obj.v === 'number' && Number.isFinite(obj.v)) return `<c r="${ref}"${style}><v>${obj.v}</v></c>`;
    return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${xmlEscape(obj.v)}</t></is></c>`;
  }

  function sheetXml(sheet) {
    const rows = sheet.rows || [];
    let maxCols = 0;
    rows.forEach(r => { if (r.length > maxCols) maxCols = r.length; });
    const freeze = sheet.freeze || null;
    let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">';
    xml += '<sheetViews><sheetView workbookViewId="0">';
    if (freeze && (freeze.row || freeze.col)) {
      const tl = columnName(freeze.col || 0) + ((freeze.row || 0) + 1);
      xml += `<pane${freeze.col ? ` xSplit="${freeze.col}"` : ''}${freeze.row ? ` ySplit="${freeze.row}"` : ''} topLeftCell="${tl}" activePane="${freeze.row && freeze.col ? 'bottomRight' : (freeze.row ? 'bottomLeft' : 'topRight')}" state="frozen"/>`;
    }
    xml += '</sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/>';
    if (sheet.colWidths && sheet.colWidths.length) {
      xml += '<cols>' + sheet.colWidths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('') + '</cols>';
    }
    xml += '<sheetData>';
    rows.forEach((row, r) => {
      const cells = row.map((cell, c) => cellXml(columnName(c) + (r + 1), cell)).join('');
      xml += `<row r="${r + 1}">${cells}</row>`;
    });
    xml += '</sheetData>';
    if (sheet.merges && sheet.merges.length) xml += `<mergeCells count="${sheet.merges.length}">` + sheet.merges.map(m => `<mergeCell ref="${m}"/>`).join('') + '</mergeCells>';
    xml += '<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>';
    xml += '<pageSetup orientation="landscape" fitToHeight="0"/></worksheet>';
    return xml;
  }

  // ---- store-only ZIP ----
  let crcTable = null;
  function crc32(bytes) {
    if (!crcTable) {
      crcTable = new Uint32Array(256);
      for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); crcTable[n] = c >>> 0; }
    }
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) crc = crcTable[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function zipStore(files) {
    const chunks = [], central = [];
    let offset = 0;
    const now = new Date();
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    for (const file of files) {
      const name = enc.encode(file.name), data = file.data, crc = crc32(data);
      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, 0x0800, true); local.setUint16(8, 0, true);
      local.setUint16(10, dosTime, true); local.setUint16(12, dosDate, true); local.setUint32(14, crc, true);
      local.setUint32(18, data.length, true); local.setUint32(22, data.length, true); local.setUint16(26, name.length, true); local.setUint16(28, 0, true);
      chunks.push(new Uint8Array(local.buffer), name, data);
      const cd = new DataView(new ArrayBuffer(46));
      cd.setUint32(0, 0x02014b50, true); cd.setUint16(4, 20, true); cd.setUint16(6, 20, true); cd.setUint16(8, 0x0800, true); cd.setUint16(10, 0, true);
      cd.setUint16(12, dosTime, true); cd.setUint16(14, dosDate, true); cd.setUint32(16, crc, true);
      cd.setUint32(20, data.length, true); cd.setUint32(24, data.length, true); cd.setUint16(28, name.length, true);
      cd.setUint32(42, offset, true);
      central.push(new Uint8Array(cd.buffer), name);
      offset += 30 + name.length + data.length;
    }
    let centralSize = 0;
    central.forEach(c => { centralSize += c.length; });
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, centralSize, true); end.setUint32(16, offset, true);
    const all = chunks.concat(central, [new Uint8Array(end.buffer)]);
    let total = 0;
    all.forEach(c => { total += c.length; });
    const out = new Uint8Array(total);
    let pos = 0;
    all.forEach(c => { out.set(c, pos); pos += c.length; });
    return out;
  }

  /** sheets: [{name, rows:[[cell|{v,s}]], colWidths:[number], freeze:{row,col}, merges:['A1:C1']}] -> Uint8Array (.xlsx) */
  function build(sheets) {
    if (!Array.isArray(sheets) || !sheets.length) throw new Error('At least one sheet is required.');
    const used = new Set();
    const named = sheets.map(s => ({ ...s, name: safeSheetName(s.name, used) }));
    const files = [];
    const add = (name, text) => files.push({ name, data: enc.encode(text) });
    add('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      named.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') + '</Types>');
    add('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
    add('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
      named.map((s, i) => `<sheet name="${xmlEscape(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') + '</sheets></workbook>');
    add('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      named.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
      `<Relationship Id="rId${named.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
    add('xl/styles.xml', STYLES_XML);
    named.forEach((s, i) => add(`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s)));
    return zipStore(files);
  }

  function download(filename, sheets) {
    const bytes = build(sheets);
    const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  const api = { build, download, STYLE, columnName };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.IcuXlsx = api;
})(typeof self !== 'undefined' ? self : this);
