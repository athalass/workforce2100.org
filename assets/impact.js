(function(){
fetch("data/impact_data.json").then(function(r){return r.json()}).then(function(D){
var POS={AK:[0,0],ME:[11,0],VT:[10,1],NH:[11,1],WA:[1,2],ID:[2,2],MT:[3,2],ND:[4,2],MN:[5,2],IL:[6,2],WI:[7,2],MI:[8,2],NY:[9,2],RI:[10,2],MA:[11,2],OR:[1,3],NV:[2,3],WY:[3,3],SD:[4,3],IA:[5,3],IN:[6,3],OH:[7,3],PA:[8,3],NJ:[9,3],CT:[10,3],CA:[1,4],UT:[2,4],CO:[3,4],NE:[4,4],MO:[5,4],KY:[6,4],WV:[7,4],VA:[8,4],MD:[9,4],DE:[10,4],AZ:[2,5],NM:[3,5],KS:[4,5],AR:[5,5],TN:[6,5],NC:[7,5],SC:[8,5],DC:[9,5],OK:[4,6],LA:[5,6],MS:[6,6],AL:[7,6],GA:[8,6],HI:[0,7],TX:[4,7],FL:[9,7]};
var S=D.states, sel='MD';
function f0(n){return Math.round(n).toLocaleString('en-US')}
function fM(n){return n>=1e6?(n/1e6).toFixed(1)+'M':Math.round(n/1e3).toLocaleString('en-US')+'k'}
function pc(x,d){return (x*100).toFixed(d==null?1:d)+'%'}
function sg(x){return (x>0?'+':x<0?'−':'')+Math.abs(x*100).toFixed(1)+'%'}
var M={es:{t:'Share of jobs in highly exposed occupations',f:function(s){return pc(s.es,0)}},ts:{t:'Workers who may need to change occupation',f:function(s){return pc(s.ts)}},wpw:{t:'Wages at stake per worker, per year',f:function(s){return '$'+f0(s.wpw)}},ns:{t:'Net change in jobs, 2025–2035',f:function(s){return sg(s.ns)}}};
var RAMP=['#E8EEF4','#C3D3E2','#93B1CB','#5D88AC','#2F5F86','#16395A'];
var US={jobs:0,gross:0,dec:0,w:0,exp:0}; S.forEach(function(s){US.jobs+=s.jobs;US.gross+=s.gross;US.dec+=s.dec;US.w+=s.wbn;US.exp+=s.exp});
document.getElementById('usk').innerHTML='<div class="kpi"><b>'+fM(US.exp)+'</b><span>jobs in highly exposed occupations ('+pc(US.exp/US.jobs,0)+' of all jobs)</span></div><div class="kpi"><b>'+fM(US.gross)+'</b><span>jobs of work removed by AI automation by 2035, before growth</span></div><div class="kpi"><b>'+fM(US.dec)+'</b><span>workers in occupations that shrink, who may need to change occupation</span></div><div class="kpi"><b>$'+(US.w/1000).toFixed(2)+'T</b><span>a year in wages tied to the work AI removes</span></div>';
function draw(){
 var m=document.getElementById('metric').value, vals=S.map(function(s){return s[m]}).sort(function(a,b){return a-b});
 var q=[1,2,3,4,5].map(function(i){return vals[Math.floor(i*vals.length/6)]});
 function band(v){var b=0;q.forEach(function(t){if(v>=t)b++});return b}
 document.getElementById('mapTitle').textContent=M[m].t;
 document.getElementById('tmap').innerHTML=S.map(function(s){var p=POS[s.ab],b=band(s[m]);return '<button style="grid-column:'+(p[0]+1)+';grid-row:'+(p[1]+1)+';background:'+RAMP[b]+';color:'+(b>2?'#fff':'#16202A')+'" class="'+(s.ab===sel?'sel':'')+'" data-ab="'+s.ab+'" title="'+s.nm+': '+M[m].f(s)+'">'+s.ab+'</button>'}).join('');
 document.getElementById('leg').innerHTML='Lower '+RAMP.map(function(c){return '<i style="background:'+c+'"></i>'}).join('')+' Higher';
 document.querySelectorAll('#tmap button').forEach(function(b){b.onclick=function(){sel=b.dataset.ab;draw()}});
 var s=S.find(function(x){return x.ab===sel});
 document.getElementById('stateCard').innerHTML='<h3>'+s.nm+'</h3><p class="sub">'+f0(s.jobs)+' jobs · '+s.ninst+' institutions</p><div class="kpis" style="grid-template-columns:1fr 1fr;margin-bottom:16px"><div class="kpi"><b>'+pc(s.es,0)+'</b><span>of jobs in highly exposed occupations</span></div><div class="kpi"><b>'+fM(s.dec)+'</b><span>may need to change occupation ('+pc(s.ts)+')</span></div><div class="kpi"><b>$'+s.wbn.toFixed(1)+'B</b><span>wages a year tied to work AI removes</span></div><div class="kpi"><b>'+sg(s.ns)+'</b><span>net change in jobs to 2035</span></div></div><p class="sub" style="margin-bottom:8px"><b style="color:var(--ink)">Most exposed occupations</b> (by jobs of work removed)</p><ul class="occ">'+s.top.map(function(o){return '<li><span>'+o[0]+'</span><span class="r" style="text-align:right">'+f0(o[1])+'</span><span style="text-align:right" class="'+(o[3]<0?'neg':'pos')+'">'+(o[3]==null?'':sg(o[3]))+'</span></li>'}).join('')+'</ul><p class="note" style="margin-top:10px">Jobs in 2025 and net change by 2035.</p>';
 stable();
 document.getElementById('ist').value=sel; inst();
}
document.getElementById('metric').onchange=function(){sN=15;draw()};
var sN=15;
function stable(){
 var m=document.getElementById('metric').value,q=document.getElementById('sq').value.trim().toLowerCase(),so=document.getElementById('ssort').value;
 var rows=S.filter(function(s){return !q||s.nm.toLowerCase().indexOf(q)>=0||s.ab.toLowerCase()===q});
 rows.sort(function(a,b){if(so==='name')return a.nm<b.nm?-1:1;if(so==='jobs')return b.jobs-a.jobs;if(so==='wbn')return b.wbn-a.wbn;return b[m]-a[m]});
 document.getElementById('scnt').textContent=rows.length+' of 51 states · showing '+Math.min(sN,rows.length);
 document.getElementById('stbody').innerHTML=rows.slice(0,sN).map(function(s){return '<tr class="'+(s.ab===sel?'sel':'')+'"><td><b>'+s.nm+'</b></td><td class="r">'+f0(s.jobs)+'</td><td class="r">'+fM(s.exp)+' <span style="color:var(--ink-3)">('+pc(s.es,0)+')</span></td><td class="r">'+pc(s.gs)+'</td><td class="r '+(s.ns<0?'neg':'pos')+'">'+sg(s.ns)+'</td><td class="r">'+fM(s.dec)+' <span style="color:var(--ink-3)">('+pc(s.ts)+')</span></td><td class="r">$'+s.wbn.toFixed(1)+'B</td><td>'+s.top[0][0]+'</td></tr>'}).join('')||'<tr><td colspan="8">No states match.</td></tr>';
 var left=rows.length-sN;
 document.getElementById('smore').innerHTML=left>0?'<button type="button" class="pri" id="sm1">Show '+Math.min(15,left)+' more</button><button type="button" id="sm2">Show all '+rows.length+'</button>':'';
 if(left>0){document.getElementById('sm1').onclick=function(){sN+=15;stable()};document.getElementById('sm2').onclick=function(){sN=999;stable()}}
}
document.getElementById('sq').oninput=function(){sN=15;stable()};document.getElementById('ssort').onchange=function(){sN=15;stable()};
var ist=document.getElementById('ist'); ist.innerHTML=S.slice().sort(function(a,b){return a.nm<b.nm?-1:1}).map(function(s){return '<option value="'+s.ab+'">'+s.nm+'</option>'}).join('');
ist.onchange=function(){sel=ist.value;iN=15;draw()};
var iN=15;document.getElementById('igr').onchange=function(){iN=15;inst()}; document.getElementById('isort').onchange=function(){iN=15;inst()}; document.getElementById('iq').oninput=function(){iN=15;inst()};
var GR=['Certificate schools (under 2-year)','2-year colleges','4-year colleges and universities'];
function stack(c){var t=c[0]+c[1]+c[2]+c[3]||1;return '<div class="stack"><span style="width:'+c[0]/t*100+'%;background:#1E7B4F"></span><span style="width:'+c[1]/t*100+'%;background:#3E6A8E"></span><span style="width:'+c[2]/t*100+'%;background:#B5483B"></span><span style="width:'+c[3]/t*100+'%;background:#C3CCD5"></span></div>'}
function inst(){
 var ab=ist.value, L=D.insts[ab]||[], s=S.find(function(x){return x.ab===ab});
 document.getElementById('pst').textContent=s.nm;
 var P={}; GR.forEach(function(g){P[g]=[0,0,0,0]});
 var LV={}; L.forEach(function(r){var p=P[r[1]];for(var i=0;i<4;i++)p[i]+=r[4][i]; Object.keys(r[6]).forEach(function(lv){var k=r[1]+'|'+lv;LV[k]=LV[k]||[0,0,0];for(var i=0;i<3;i++)LV[k][i]+=r[6][lv][i]})});
 document.getElementById('peer').innerHTML=GR.map(function(g){var c=P[g],t=c[0]+c[1]+c[2]+c[3];return t?'<div class="p"><span>'+g+'</span>'+stack(c)+'<span style="text-align:right">'+f0(t)+'</span></div>':''}).join('');
 var lvRows=[['Certificate','Certificate schools (under 2-year)'],['Certificate','2-year colleges'],['Associate','2-year colleges'],['Bachelor','4-year colleges and universities'],['Graduate','4-year colleges and universities']];
 document.getElementById('lvl').innerHTML=lvRows.map(function(x){var c=LV[x[1]+'|'+x[0]];if(!c)return '';var t=c[0]+c[1]+c[2];if(!t)return '';var v=c[0]/t;return '<div class="p"><span>'+x[0]+'s · '+x[1].replace(' (under 2-year)','').replace(' colleges and universities','')+'</span><div class="stack" style="background:#EEF2F5"><span style="width:'+v*100+'%;background:#1E7B4F"></span></div><span style="text-align:right">'+pc(v,0)+'</span></div>'}).join('');
 var g=document.getElementById('igr').value, so=document.getElementById('isort').value;
 function sh(r,i){var t=r[4][0]+r[4][1]+r[4][2];return t?r[4][i]/t:0}
 var peerInv={}; GR.forEach(function(x){var c=P[x],t=c[0]+c[1]+c[2];peerInv[x]=t?c[0]/t:0});
 var iq=document.getElementById('iq').value.trim().toLowerCase(); var rows=L.filter(function(r){return (g==='all'||r[1]===g)&&(!iq||r[0].toLowerCase().indexOf(iq)>=0)});
 rows.sort(function(a,b){if(so==='name')return a[0]<b[0]?-1:1;if(so==='inv')return sh(b,0)-sh(a,0);if(so==='rev')return sh(b,2)-sh(a,2);return (b[4][0]+b[4][1]+b[4][2]+b[4][3])-(a[4][0]+a[4][1]+a[4][2]+a[4][3])});
 document.getElementById('icnt').textContent=rows.length+' of '+L.length+' institutions in '+s.nm+' · showing '+Math.min(iN,rows.length);
 document.getElementById('ibody').innerHTML=rows.slice(0,iN).map(function(r){var tot=r[4][0]+r[4][1]+r[4][2]+r[4][3];var d=(sh(r,0)-peerInv[r[1]])*100;var cls=d>2?'up':d<-2?'dn':'eq';return '<tr><td><b>'+r[0]+'</b></td><td style="font-size:13px;color:var(--ink-3)">'+r[2]+'</td><td class="r">'+r[3][0]+' · '+r[3][1]+' · '+r[3][2]+'</td><td>'+stack(r[4])+'</td><td class="r">'+f0(tot)+'</td><td class="r">'+pc(sh(r,0),0)+' <span class="diff '+cls+'">'+(d>=0?'+':'−')+Math.abs(d).toFixed(0)+' pts</span></td><td class="r">'+pc(r[5],0)+'</td></tr>'}).join('')||'<tr><td colspan="7">No institutions match.</td></tr>';
 var left=rows.length-iN;
 document.getElementById('imore').innerHTML=left>0?'<button type="button" class="pri" id="im1">Show '+Math.min(25,left)+' more</button><button type="button" id="im2">Show all '+rows.length+'</button>':'';
 if(left>0){document.getElementById('im1').onclick=function(){iN+=25;inst()};document.getElementById('im2').onclick=function(){iN=9999;inst()}}
}
draw();
});
})();
