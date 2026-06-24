/**
 * History Dashboard Builder
 * Generates dashboard.html that lists all audits (from index.json),
 * shows score trends, and links to each individual report.
 */

const fs = require('fs');
const path = require('path');

class HistoryDashboard {
  constructor(outputDir) {
    this.outputDir = outputDir || path.join(process.cwd(), 'audits');
  }

  build(index) {
    const html = this.render(index || []);
    const filepath = path.join(this.outputDir, 'dashboard.html');
    fs.writeFileSync(filepath, html, 'utf8');
    return filepath;
  }

  render(index) {
    const dataJson = JSON.stringify(index).replace(/</g, '\\u003c');
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Sanctify SEO · Dashboard</title>
<style>
:root{--bg:#0b1020;--panel:#141b30;--panel2:#1b2440;--text:#e6ebf5;--muted:#8b96b2;
  --border:#27314f;--green:#22c55e;--amber:#f59e0b;--red:#ef4444;--blue:#3b82f6;--accent:#7c3aed;--accent2:#a855f7}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;
  background:linear-gradient(135deg,#0b1020,#0d1428);color:var(--text);line-height:1.5;min-height:100vh;padding-bottom:60px}
.wrap{max-width:1100px;margin:0 auto;padding:0 20px}
header.top{padding:28px 0;border-bottom:1px solid var(--border);margin-bottom:28px;
  background:linear-gradient(135deg,rgba(124,58,237,.18),rgba(59,130,246,.05))}
.brand{display:flex;align-items:center;gap:12px}
.logo{width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,var(--accent),var(--accent2));
  display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800}
.brand h1{font-size:21px;font-weight:800} .brand .sub{color:var(--muted);font-size:12px}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:28px}
@media(max-width:640px){.kpis{grid-template-columns:repeat(2,1fr)}}
.kpi{background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:18px}
.kpi .n{font-size:30px;font-weight:800} .kpi .l{font-size:12px;color:var(--muted);margin-top:4px}
h2{font-size:16px;margin:24px 0 14px;display:flex;align-items:center;gap:10px}
h2:before{content:'';width:4px;height:18px;border-radius:3px;background:linear-gradient(var(--accent),var(--accent2))}
.row{background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:16px 18px;
  display:flex;align-items:center;gap:18px;margin-bottom:12px;transition:transform .12s,background .12s}
.row:hover{background:var(--panel2);transform:translateX(3px)}
.row a.link{margin-left:auto;color:var(--accent2);text-decoration:none;font-weight:600;font-size:13px;
  border:1px solid var(--border);padding:8px 14px;border-radius:8px}
.row a.link:hover{border-color:var(--accent2)}
.scorepill{width:54px;height:54px;border-radius:12px;display:flex;flex-direction:column;align-items:center;
  justify-content:center;font-weight:800;flex-shrink:0}
.scorepill .g{font-size:10px;font-weight:600;opacity:.8}
.row .u{font-weight:700;font-size:14px} .row .t{font-size:12px;color:var(--muted);margin-top:2px}
.mini{display:flex;gap:10px;font-size:12px;color:var(--muted);margin-top:4px}
.mini .p{color:var(--green)} .mini .w{color:var(--amber)} .mini .f{color:var(--red)}
.empty{background:var(--panel);border:1px dashed var(--border);border-radius:14px;padding:50px;text-align:center;color:var(--muted)}
.trend{background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:24px}
footer{text-align:center;color:var(--muted);font-size:12px;margin-top:40px}
</style>
</head>
<body>
<header class="top"><div class="wrap"><div class="brand"><div class="logo">S</div>
<div><h1>Sanctify SEO Dashboard</h1><div class="sub">Technical SEO audit history & trends</div></div></div></div></header>
<div class="wrap" id="app"></div>
<script>window.__INDEX__=${dataJson};</script>
<script>
(function(){
  var idx=window.__INDEX__||[]; var app=document.getElementById('app');
  function color(s){return s>=80?'#22c55e':s>=60?'#f59e0b':'#ef4444';}
  function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  if(!idx.length){ app.innerHTML='<div class="empty"><h2 style="justify-content:center">No audits yet</h2>'+
    'Run <code>sanctify-seo audit &lt;url&gt;</code> to generate your first report.</div>'; return; }

  var avg=Math.round(idx.reduce(function(a,b){return a+(b.overallScore||0);},0)/idx.length);
  var best=idx.reduce(function(a,b){return (b.overallScore||0)>(a.overallScore||0)?b:a;});
  var sites=new Set(idx.map(function(a){return a.url;})).size;

  var trend=idx.slice(0,20).reverse();
  var w=Math.max(trend.length*46,200),h=120,max=100;
  var pts=trend.map(function(a,i){var x=24+i*((w-48)/Math.max(trend.length-1,1));
    var y=h-12-((a.overallScore||0)/max)*(h-30);return [x,y,a];});
  var poly=pts.map(function(p){return p[0]+','+p[1];}).join(' ');
  var svg='<svg width="100%" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none" style="overflow:visible">'+
    '<polyline points="'+poly+'" fill="none" stroke="#7c3aed" stroke-width="2.5"/>'+
    pts.map(function(p){return '<circle cx="'+p[0]+'" cy="'+p[1]+'" r="4" fill="'+color(p[2].overallScore)+'"/>';}).join('')+
    '</svg>';

  var html='<div class="kpis">'+
    '<div class="kpi"><div class="n">'+idx.length+'</div><div class="l">Total Audits</div></div>'+
    '<div class="kpi"><div class="n" style="color:'+color(avg)+'">'+avg+'</div><div class="l">Average Score</div></div>'+
    '<div class="kpi"><div class="n" style="color:'+color(best.overallScore)+'">'+best.overallScore+'</div><div class="l">Best Score</div></div>'+
    '<div class="kpi"><div class="n">'+sites+'</div><div class="l">Sites Tracked</div></div></div>';

  if(trend.length>1){ html+='<h2>Score Trend</h2><div class="trend">'+svg+'</div>'; }

  html+='<h2>Audit History</h2>';
  html+=idx.map(function(a){
    var col=color(a.overallScore||0); var s=a.summary||{};
    return '<div class="row"><div class="scorepill" style="background:'+col+'22;color:'+col+';border:1px solid '+col+'55">'+
      '<div>'+(a.overallScore||0)+'</div><div class="g">'+esc(a.grade||'-')+'</div></div>'+
      '<div><div class="u">'+esc(a.url)+'</div><div class="t">'+new Date(a.timestamp).toLocaleString()+'</div>'+
      '<div class="mini"><span class="p">'+(s.passed||0)+' passed</span><span class="w">'+(s.warnings||0)+' warn</span>'+
      '<span class="f">'+(s.failed||0)+' failed</span></div></div>'+
      (a.htmlFile?'<a class="link" href="'+esc(a.htmlFile)+'">View Report →</a>':
        '<a class="link" href="'+esc(a.file?a.file.replace(/\\\\/g,'/'):'#')+'">View JSON →</a>')+
      '</div>';
  }).join('');
  html+='<footer>Sanctify SEO Auditor · Generated '+new Date().toLocaleString()+'</footer>';
  app.innerHTML=html;
})();
</script>
</body>
</html>`;
  }
}

module.exports = HistoryDashboard;
