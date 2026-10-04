(() => {
  'use strict';
  const SUPABASE_URL='https://jjoyrvyjwozrxefagjhx.supabase.co';
  const SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impqb3lydnlqd296cnhlZmFnamh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1ODYzOTQsImV4cCI6MjEwMzE2MjM5NH0.DpRCdrDTJaJQd3mGFVvcp3bYE2s7qDJ1MVQKSnvi7us';
  const $=s=>document.querySelector(s);
  const params=new URLSearchParams(location.hash.slice(1)||location.search),portalId=params.get('portal')||'';
  let staffId=params.get('staff')||'',staffToken=params.get('token')||'';
  // Public link: m = flex | swap | all, k = id.token(base64url) entries joined by '~'.
  const mode=params.get('m')==='flex'||params.get('m')==='swap'?params.get('m'):'all';
  function base64UrlToHex(b64){try{const bin=atob(b64.split('-').join('+').split('_').join('/'));let out='';for(let i=0;i<bin.length;i++)out+=bin.charCodeAt(i).toString(16).padStart(2,'0');return out;}catch(e){return '';}}
  const publicKeys=new Map();
  for(const entry of (params.get('k')||'').split('~')){const dot=entry.lastIndexOf('.');if(dot<1)continue;let id='';try{id=decodeURIComponent(entry.slice(0,dot));}catch(e){continue;}const token=base64UrlToHex(entry.slice(dot+1));if(id&&token)publicKeys.set(id,token);}
  const isPublic=publicKeys.size>0;
  let portal=null, partnerAssignment=null, busy=false;
  try{history.replaceState(null,'',location.pathname);}catch(e){}
  async function rpc(name,args){const r=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':`Bearer ${SUPABASE_ANON_KEY}`},body:JSON.stringify(args)});const text=await r.text();let data={};try{data=text?JSON.parse(text):{};}catch{data={message:text}}if(!r.ok)throw new Error(data?.message||data?.error||`Request failed (${r.status})`);return data;}
  function show(msg,ok=false){const e=$('#pageStatus');e.textContent=msg;e.className='status '+(ok?'ok':'bad');}
  function setBusy(v){busy=v;$('#submitFlex').disabled=v;$('#submitSwap').disabled=v;}
  function monthBounds(month){const [y,m]=month.split('-').map(Number);const first=`${y}-${String(m).padStart(2,'0')}-01`;const d=new Date(Date.UTC(y,m,0));const last=`${y}-${String(m).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;return{first,last};}
  function shiftInfo(id){return (portal?.shifts||[]).find(s=>s.id===id)||null;}
  function formatShift(id){const s=shiftInfo(id);return s?`${s.code}${s.name?` — ${s.name}`:''}`:(id||'OFF');}
  function myAssignment(date){if(!portal||!date)return'';return portal.my_assignments?.[`${staffId}|${date}`]||'';}
  function fillPartnerOptions(){const sel=$('#swapPersonB');sel.textContent='';for(const p of portal.staff||[]){if(p.id===staffId)continue;const o=document.createElement('option');o.value=p.id;o.textContent=`${p.name}${p.level?` — ${p.level}`:''}`;sel.appendChild(o);}}
  function refreshMine(){const d=$('#swapDateA').value,id=myAssignment(d);$('#yourAssignment').textContent=d?(id?`Your current assignment: ${formatShift(id)}`:'You are OFF / not assigned on this date.'):'Select a date to see your assignment.';}
  async function refreshPartner(){partnerAssignment=null;const personB=$('#swapPersonB').value,date=$('#swapDateB').value;if(!personB||!date){$('#theirAssignment').textContent='Select a colleague and date.';return;}$('#theirAssignment').textContent='Checking assignment…';try{const data=await rpc('icu_roster_partner_assignment',{p_portal_id:portalId,p_staff_id:staffId,p_staff_token:staffToken,p_partner_id:personB,p_date:date});partnerAssignment=data.assignment||null;$('#theirAssignment').textContent=partnerAssignment?`Their current assignment: ${partnerAssignment.code}${partnerAssignment.name?` — ${partnerAssignment.name}`:''}`:'They are OFF / not assigned on this date.';}catch(e){$('#theirAssignment').textContent=e.message;}}
  async function load(){if(!portalId||!staffId||!staffToken){show('This personal request link is incomplete. Ask the roster coordinator for a new link.');return;}try{portal=await rpc('icu_roster_staff_portal',{p_portal_id:portalId,p_staff_id:staffId,p_staff_token:staffToken});$('#portalTitle').textContent=portal.roster_name||'ICU Roster';$('#staffName').textContent=portal.staff_name||'Staff';$('#monthName').textContent=portal.month||'';fillPartnerOptions();const {first,last}=monthBounds(portal.month);for(const id of ['freeFrom','freeTo','swapDateA','swapDateB']){$('#'+id).min=first;$('#'+id).max=last;$('#'+id).value=id==='freeTo'?last:first;}$('#requestApp').hidden=false;refreshMine();await refreshPartner();}catch(e){show(e.message);}}
  document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('#panel-'+b.dataset.panel).classList.add('active');});
  $('#swapDateA').addEventListener('change',refreshMine);$('#swapPersonB').addEventListener('change',refreshPartner);$('#swapDateB').addEventListener('change',refreshPartner);
  $('#submitFlex').onclick=async()=>{if(busy)return;setBusy(true);try{const days=Math.max(1,Math.min(10,Number($('#freeDays').value)||1)),from=$('#freeFrom').value,to=$('#freeTo').value;if(!from||!to||to<from)throw new Error('Check your date window.');await rpc('icu_roster_submit_request',{p_portal_id:portalId,p_staff_id:staffId,p_staff_token:staffToken,p_request_type:'flex_days',p_payload:{days,from,to,consecutive:$('#freeConsecutive').checked}});show('Your flexible-day request was submitted successfully and is pending coordinator approval.',true);}catch(e){show(e.message);}finally{setBusy(false);}};
  $('#submitSwap').onclick=async()=>{if(busy)return;setBusy(true);try{const dateA=$('#swapDateA').value,personB=$('#swapPersonB').value,dateB=$('#swapDateB').value;if(!dateA||!personB||!dateB)throw new Error('Complete all swap fields.');if(!myAssignment(dateA))throw new Error('You do not currently have an assignment on your selected date.');if(!partnerAssignment)throw new Error('The selected colleague does not currently have an assignment on their selected date.');await rpc('icu_roster_submit_request',{p_portal_id:portalId,p_staff_id:staffId,p_staff_token:staffToken,p_request_type:'swap',p_payload:{dateA,personB,dateB}});show('Your swap request was submitted successfully and is pending coordinator approval.',true);}catch(e){show(e.message);}finally{setBusy(false);}};
  function applyMode(){
    if(mode==='all')return;
    const other=mode==='flex'?'swap':'flex';
    document.querySelector('.tabs').hidden=true;
    $('#panel-'+other).hidden=true;$('#panel-'+other).classList.remove('active');
    $('#panel-'+mode).classList.add('active');
    $('#portalTitle').textContent=mode==='flex'?'Request flexible free days / leave':'Request a shift swap';
  }
  // Public link: the first embedded token is only used to read the staff names for the picker;
  // requests are always submitted with the token that belongs to the person who was picked.
  async function loadPublic(){
    applyMode();
    $('#linkNote').textContent='This is a shared roster link. Select only your own name. Requests are reviewed by the coordinator before anything changes; pager/phone numbers and the full roster are not shown.';
    if(!portalId){show('This public request link is incomplete. Ask the roster coordinator for a new link.');return;}
    try{
      const [firstId,firstToken]=[...publicKeys.entries()][0];
      const info=await rpc('icu_roster_staff_portal',{p_portal_id:portalId,p_staff_id:firstId,p_staff_token:firstToken});
      $('#portalTitle').textContent=info.roster_name||'ICU Roster';
      const sel=$('#publicStaff');
      for(const p of (info.staff||[])){if(!publicKeys.has(p.id))continue;const o=document.createElement('option');o.value=p.id;o.textContent=p.name+(p.level?' — '+p.level:'');sel.appendChild(o);}
      if(sel.options.length<2){show('No staff members are available on this link. Ask the roster coordinator for a new link.');return;}
      $('#publicPicker').hidden=false;
      sel.onchange=()=>{
        $('#requestApp').hidden=true;$('#pageStatus').className='status';$('#pageStatus').textContent='';
        if(!sel.value)return;
        staffId=sel.value;staffToken=publicKeys.get(staffId)||'';load();
      };
    }catch(e){show(e.message);}
  }
  if(isPublic)loadPublic();else load();
})();
