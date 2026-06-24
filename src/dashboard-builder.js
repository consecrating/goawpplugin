/**
 * Dashboard Builder
 * Generates a self-contained, single-file HTML dashboard report
 * with all CSS, JS, and audit data embedded inline. The output can be
 * opened directly in any browser or pushed to GitHub for review.
 */

const fs = require('fs');
const path = require('path');

class DashboardBuilder {
  constructor(outputDir) {
    this.outputDir = outputDir || path.join(process.cwd(), 'audits');
  }

  /**
   * Build a standalone HTML report for a single audit result.
   * @param {object} auditResult
   * @param {string} [filename]
   * @returns {string} path to the generated HTML file
   */
  build(auditResult, filename) {
    const html = this.render(auditResult);
    const name = filename || `report__${auditResult.timestamp.replace(/[:.]/g, '-')}.html`;
    const filepath = path.join(this.outputDir, name);
    fs.writeFileSync(filepath, html, 'utf8');
    return filepath;
  }

  render(data) {
    const dataJson = JSON.stringify(data).replace(/</g, '\\u003c');
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Sanctify SEO Report - ${this.escape(data.url)}</title>
<style>${this.css()}</style>
</head>
<body>
<div id="app"></div>
<script>window.__AUDIT__ = ${dataJson};</script>
<script>${this.js()}</script>
</body>
</html>`;
  }

  escape(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  css() {
    return `
:root{
  --bg:#0b1020; --panel:#141b30; --panel-2:#1b2440; --text:#e6ebf5; --muted:#8b96b2;
  --border:#27314f; --green:#22c55e; --amber:#f59e0b; --red:#ef4444; --blue:#3b82f6;
  --accent:#7c3aed; --accent-2:#a855f7;
}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
  background:linear-gradient(135deg,#0b1020,#0d1428);color:var(--text);line-height:1.5;padding:0 0 60px}
.wrap{max-width:1180px;margin:0 auto;padding:0 20px}
header.top{padding:28px 0 20px;border-bottom:1px solid var(--border);margin-bottom:28px;
  background:linear-gradient(135deg,rgba(124,58,237,.18),rgba(59,130,246,.05))}
.brand{display:flex;align-items:center;gap:12px}
.logo{width:42px;height:42px;border-radius:11px;background:linear-gradient(135deg,var(--accent),var(--accent-2));
  display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800}
.brand h1{font-size:20px;font-weight:800;letter-spacing:.3px}
.brand .sub{color:var(--muted);font-size:12px}
.meta-row{display:flex;flex-wrap:wrap;gap:18px;margin-top:14px;color:var(--muted);font-size:13px}
.meta-row b{color:var(--text)}
.hero{display:grid;grid-template-columns:260px 1fr;gap:24px;margin-bottom:28px}
@media(max-width:820px){.hero{grid-template-columns:1fr}}
.card{background:var(--panel);border:1px solid var(--border);border-radius:16px;padding:22px}
.score-card{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.gauge{position:relative;width:180px;height:180px}
.gauge svg{transform:rotate(-90deg)}
.gauge .num{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.gauge .num .val{font-size:46px;font-weight:800;line-height:1}
.gauge .num .grade{font-size:13px;color:var(--muted);margin-top:4px}
.score-label{margin-top:12px;font-size:13px;color:var(--muted)}
.summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
@media(max-width:560px){.summary-grid{grid-template-columns:repeat(2,1fr)}}
.stat{background:var(--panel-2);border:1px solid var(--border);border-radius:14px;padding:16px;text-align:center}
.stat .n{font-size:28px;font-weight:800}
.stat .l{font-size:12px;color:var(--muted);margin-top:4px;text-transform:uppercase;letter-spacing:.5px}
.stat.pass .n{color:var(--green)} .stat.warn .n{color:var(--amber)}
.stat.fail .n{color:var(--red)} .stat.total .n{color:var(--blue)}
h2.section{font-size:16px;margin:30px 0 16px;display:flex;align-items:center;gap:10px}
h2.section:before{content:'';width:4px;height:18px;border-radius:3px;background:linear-gradient(var(--accent),var(--accent-2))}
.cat-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
@media(max-width:820px){.cat-grid{grid-template-columns:1fr}}
.cat{background:var(--panel);border:1px solid var(--border);border-radius:14px;overflow:hidden}
.cat-head{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;cursor:pointer;
  user-select:none;transition:background .15s}
.cat-head:hover{background:var(--panel-2)}
.cat-head .left{display:flex;align-items:center;gap:12px}
.cat-name{font-weight:700;font-size:14px}
.cat-weight{font-size:11px;color:var(--muted)}
.ring{width:44px;height:44px;position:relative;flex-shrink:0}
.ring .rv{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700}
.chev{color:var(--muted);transition:transform .2s}
.cat.open .chev{transform:rotate(90deg)}
.cat-body{display:none;border-top:1px solid var(--border);padding:6px 0}
.cat.open .cat-body{display:block}
.check{display:flex;gap:12px;padding:12px 18px;border-bottom:1px solid rgba(39,49,79,.5)}
.check:last-child{border-bottom:none}
.check .dot{width:9px;height:9px;border-radius:50%;margin-top:6px;flex-shrink:0}
.dot.pass{background:var(--green)} .dot.warning{background:var(--amber)} .dot.fail{background:var(--red)}
.check .c-name{font-weight:600;font-size:13px}
.check .c-msg{font-size:13px;color:var(--text);margin-top:2px}
.check .c-rec{font-size:12px;color:var(--amber);margin-top:6px;padding:8px 10px;background:rgba(245,158,11,.08);
  border-left:3px solid var(--amber);border-radius:4px}
.badge{font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;text-transform:uppercase;letter-spacing:.5px}
.badge.pass{background:rgba(34,197,94,.15);color:var(--green)}
.badge.warning{background:rgba(245,158,11,.15);color:var(--amber)}
.badge.fail{background:rgba(239,68,68,.15);color:var(--red)}
.rec-list{display:flex;flex-direction:column;gap:10px}
.rec{display:flex;gap:14px;background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:14px 16px}
.rec .pri{font-size:10px;font-weight:800;padding:3px 9px;border-radius:6px;height:fit-content;text-transform:uppercase}
.pri.high{background:rgba(239,68,68,.15);color:var(--red)}
.pri.medium{background:rgba(245,158,11,.15);color:var(--amber)}
.rec .r-cat{font-size:11px;color:var(--muted);margin-bottom:3px}
.rec .r-txt{font-size:13px}
.err{background:rgba(239,68,68,.1);border:1px solid var(--red);border-radius:12px;padding:16px;color:#fca5a5;margin-bottom:20px}
footer{text-align:center;color:var(--muted);font-size:12px;margin-top:40px;padding-top:20px;border-top:1px solid var(--border)}
.cwv{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:4px}
@media(max-width:560px){.cwv{grid-template-columns:repeat(2,1fr)}}
.cwv .v{background:var(--panel-2);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center}
.cwv .v .vv{font-size:20px;font-weight:800} .cwv .v .vl{font-size:11px;color:var(--muted);margin-top:3px}
`;
  }

  js() {
    return `
(function(){
  var d = window.__AUDIT__;
  var app = document.getElementById('app');
  function color(s){ return s>=80?'#22c55e':s>=60?'#f59e0b':'#ef4444'; }
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function gauge(score,size){
    size=size||180; var r=size/2-14, c=2*Math.PI*r, off=c*(1-score/100), col=color(score);
    return '<div class="gauge" style="width:'+size+'px;height:'+size+'px">'+
      '<svg width="'+size+'" height="'+size+'">'+
      '<circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" stroke="#27314f" stroke-width="12" fill="none"/>'+
      '<circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" stroke="'+col+'" stroke-width="12" fill="none" '+
      'stroke-linecap="round" stroke-dasharray="'+c+'" stroke-dashoffset="'+off+'"/></svg>'+
      '<div class="num"><div class="val" style="color:'+col+'">'+score+'</div>'+
      '<div class="grade">Grade '+d.grade+'</div></div></div>';
  }
  function ring(score){
    var size=44,r=size/2-4,c=2*Math.PI*r,off=c*(1-score/100),col=color(score);
    return '<div class="ring"><svg width="'+size+'" height="'+size+'" style="transform:rotate(-90deg)">'+
      '<circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" stroke="#27314f" stroke-width="4" fill="none"/>'+
      '<circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" stroke="'+col+'" stroke-width="4" fill="none" '+
      'stroke-linecap="round" stroke-dasharray="'+c+'" stroke-dashoffset="'+off+'"/></svg>'+
      '<div class="rv" style="color:'+col+'">'+score+'</div></div>';
  }

  function cwvBlock(){
    var perf = (d.categories||[]).find(function(c){return c.name && c.name.indexOf('Performance')>-1;});
    if(!perf || !perf.details) return '';
    var det=perf.details;
    function fmt(v,u){ return v==null?'n/a':(Math.round(v)+(u||'')); }
    return '<h2 class="section">Core Web Vitals</h2><div class="cwv">'+
      '<div class="v"><div class="vv">'+fmt(det.lcp,'ms')+'</div><div class="vl">LCP</div></div>'+
      '<div class="v"><div class="vv">'+(det.cls!=null?det.cls.toFixed(3):'n/a')+'</div><div class="vl">CLS</div></div>'+
      '<div class="v"><div class="vv">'+fmt(det.fcp,'ms')+'</div><div class="vl">FCP</div></div>'+
      '<div class="v"><div class="vv">'+(det.totalSizeFormatted||'n/a')+'</div><div class="vl">Page Size</div></div>'+
      '</div>';
  }

  function checks(cat){
    return (cat.checks||[]).map(function(ch){
      return '<div class="check"><div class="dot '+ch.status+'"></div><div style="flex:1">'+
        '<div style="display:flex;justify-content:space-between;gap:8px"><span class="c-name">'+esc(ch.name)+'</span>'+
        '<span class="badge '+ch.status+'">'+ch.status+'</span></div>'+
        '<div class="c-msg">'+esc(ch.message)+'</div>'+
        (ch.recommendation?'<div class="c-rec">💡 '+esc(ch.recommendation)+'</div>':'')+
        '</div></div>';
    }).join('');
  }

  function cats(){
    return (d.categories||[]).map(function(cat,i){
      return '<div class="cat" data-i="'+i+'"><div class="cat-head">'+
        '<div class="left">'+ring(cat.score||0)+'<div><div class="cat-name">'+esc(cat.name)+'</div>'+
        '<div class="cat-weight">Weight '+(cat.weight||1)+' · '+(cat.passed||0)+' passed · '+
        (cat.warnings||0)+' warnings · '+(cat.failed||0)+' failed</div></div></div>'+
        '<div class="chev">▶</div></div>'+
        '<div class="cat-body">'+checks(cat)+'</div></div>';
    }).join('');
  }

  function recs(){
    var r = d.topRecommendations||[];
    if(!r.length) return '<div class="card">No critical issues found. Great job!</div>';
    return '<div class="rec-list">'+r.map(function(x){
      return '<div class="rec"><span class="pri '+x.severity+'">'+x.severity+'</span>'+
        '<div><div class="r-cat">'+esc(x.category)+' › '+esc(x.check)+'</div>'+
        '<div class="r-txt">'+esc(x.recommendation)+'</div></div></div>';
    }).join('')+'</div>';
  }

  var s=d.summary||{};
  var dt=new Date(d.timestamp);
  var html=''+
  '<header class="top"><div class="wrap"><div class="brand"><div class="logo">S</div>'+
  '<div><h1>Sanctify SEO Auditor</h1><div class="sub">Technical SEO Audit Report</div></div></div>'+
  '<div class="meta-row"><div>URL: <b>'+esc(d.url)+'</b></div>'+
  '<div>Scanned: <b>'+dt.toLocaleString()+'</b></div>'+
  '<div>HTTP: <b>'+(d.httpStatus||'n/a')+'</b></div>'+
  '<div>Duration: <b>'+((d.duration||0)/1000).toFixed(1)+'s</b></div></div></div></header>'+
  '<div class="wrap">';

  if(d.error){ html+='<div class="err"><b>Audit error:</b> '+esc(d.error)+'</div>'; }

  html+='<div class="hero"><div class="card score-card">'+gauge(d.overallScore||0)+
    '<div class="score-label">Overall SEO Health Score</div></div>'+
    '<div class="card"><h2 class="section" style="margin-top:0">Summary</h2>'+
    '<div class="summary-grid">'+
    '<div class="stat pass"><div class="n">'+(s.passed||0)+'</div><div class="l">Passed</div></div>'+
    '<div class="stat warn"><div class="n">'+(s.warnings||0)+'</div><div class="l">Warnings</div></div>'+
    '<div class="stat fail"><div class="n">'+(s.failed||0)+'</div><div class="l">Failed</div></div>'+
    '<div class="stat total"><div class="n">'+(s.totalChecks||0)+'</div><div class="l">Total Checks</div></div>'+
    '</div>'+cwvBlock()+'</div></div>';

  html+='<h2 class="section">Priority Recommendations</h2>'+recs();
  html+='<h2 class="section">Category Breakdown</h2><div class="cat-grid">'+cats()+'</div>';
  html+='<footer>Generated by Sanctify SEO Auditor · '+dt.toLocaleString()+'</footer>';
  html+='</div>';

  app.innerHTML=html;

  document.querySelectorAll('.cat-head').forEach(function(h){
    h.addEventListener('click',function(){ h.parentNode.classList.toggle('open'); });
  });
  // Open the first two categories by default
  document.querySelectorAll('.cat').forEach(function(c,i){ if(i<2) c.classList.add('open'); });
})();
`;
  }
}

module.exports = DashboardBuilder;
