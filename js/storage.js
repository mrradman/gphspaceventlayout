/* Saving, loading and exporting layouts. */
window.PAC = window.PAC || {};

(function () {
  const KEY_SAVED = 'gphsPac.saved', KEY_CURRENT = 'gphsPac.current';

  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }

  PAC.store = {
    list() { const s = lsGet(KEY_SAVED) || {}; return Object.keys(s).map(name => ({ name, savedAt: s[name].savedAt, data: s[name].data })).sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || '')); },
    save(name, data) { const s = lsGet(KEY_SAVED) || {}; s[name] = { savedAt: new Date().toISOString(), data }; return lsSet(KEY_SAVED, s); },
    remove(name) { const s = lsGet(KEY_SAVED) || {}; delete s[name]; return lsSet(KEY_SAVED, s); },
    saveCurrent(data) { return lsSet(KEY_CURRENT, data); },
    loadCurrent() { return lsGet(KEY_CURRENT); },
  };

  PAC.fileBase = function (meta) {
    const parts = [meta.name || 'PAC layout', meta.date || ''].filter(Boolean).join(' ');
    return parts.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') || 'PAC_layout';
  };

  function download(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  PAC.download = download;

  PAC.exportJson = function (data) {
    download(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }), PAC.fileBase(data.meta) + '.json');
  };

  PAC.parseLayoutFile = function (text) {
    const d = JSON.parse(text);
    if (!d || d.app !== 'gphs-pac-layout' || !Array.isArray(d.items)) throw new Error('Not a PAC layout file.');
    d.items = d.items.filter(it => it && PAC.CATALOG[it.type] && isFinite(it.x) && isFinite(it.y));
    return d;
  };

  function svgElement(svgText) {
    const host = document.getElementById('exportHost');
    host.innerHTML = svgText;
    return host.firstElementChild;
  }

  PAC.exportPng = function (state, analysis, paper) {
    const ex = PAC.buildExportSvg(state, analysis, paper);
    const dpi = 150, pw = Math.round(ex.W / 25.4 * dpi), ph = Math.round(ex.H / 25.4 * dpi);
    const svg = ex.svg.replace(/width="[\d.]+mm" height="[\d.]+mm"/, `width="${pw}" height="${ph}"`);
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const cv = document.createElement('canvas'); cv.width = pw; cv.height = ph;
        const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, pw, ph); ctx.drawImage(img, 0, 0, pw, ph);
        URL.revokeObjectURL(url);
        cv.toBlob(b => { download(b, PAC.fileBase(state.meta) + '.png'); resolve(); }, 'image/png');
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not render image.')); };
      img.src = url;
    });
  };

  PAC.pdfAvailable = function () { return !!(window.jspdf && window.jspdf.jsPDF && (window.svg2pdf || (window.jspdf.jsPDF.API && window.jspdf.jsPDF.API.svg))); };

  PAC.exportPdf = async function (state, analysis, paper) {
    const ex = PAC.buildExportSvg(state, analysis, paper);
    const el = svgElement(ex.svg);
    try {
      const doc = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: paper.toLowerCase() });
      doc.setProperties({ title: (state.meta.name || 'PAC layout'), subject: 'GPHS PAC event layout', creator: 'GPHS PAC Event Layout Tool' });
      if (typeof doc.svg === 'function') await doc.svg(el, { x: 0, y: 0, width: ex.W, height: ex.H });
      else await window.svg2pdf.svg2pdf(el, doc, { x: 0, y: 0, width: ex.W, height: ex.H });
      doc.save(PAC.fileBase(state.meta) + '.pdf');
    } finally {
      document.getElementById('exportHost').innerHTML = '';
    }
  };

  PAC.printLayout = function (state, analysis, paper) {
    const ex = PAC.buildExportSvg(state, analysis, paper);
    const area = document.getElementById('printArea');
    area.innerHTML = ex.svg;
    const svg = area.firstElementChild; svg.setAttribute('width', ex.W + 'mm'); svg.setAttribute('height', ex.H + 'mm');
    let st = document.getElementById('pageStyle');
    if (!st) { st = document.createElement('style'); st.id = 'pageStyle'; document.head.appendChild(st); }
    st.textContent = `@page { size: ${paper} landscape; margin: 0; }`;
    setTimeout(() => window.print(), 50);
  };
})();
