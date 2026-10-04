(()=>{
'use strict';

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const KEY='icuRosterPlannerV4';
const DAY_NAMES=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const SUPABASE_URL='https://jjoyrvyjwozrxefagjhx.supabase.co';
const SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impqb3lydnlqd296cnhlZmFnamh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1ODYzOTQsImV4cCI6MjEwMzE2MjM5NH0.DpRCdrDTJaJQd3mGFVvcp3bYE2s7qDJ1MVQKSnvi7us';
const SUPABASE_SOLVER_URL=SUPABASE_URL+'/functions/v1/icu-roster-solve';

const allShiftIds=['sA','sB','sT','sG','sK','sS','sN','sR','sP','sER','sCC','sMT','sGR','sKA'];
const dayShiftIds=['sA','sB','sT','sG','sK','sS','sN','sR','sP','sER','sCC'];
const standardNightIds=['sMT','sGR','sKA'];

function sampleStaff(){
  const phones=['1460','1498','1485','1447','0560858186','1514','1472','2732','1499','1506','9321','9436','9533','3122','504877822','559908833','535561115','0590002331','9271','9382','556665845','555432214','554122334','055274414','0555966862','0576274474','0554950112','0563286813','562285006','541619344','592309100','552318376','591526694','507475448','506657077','541600436','556006526'];
  let idx=0;
  const nextPager=()=>phones[idx++]||('05'+String(10000000+idx).padStart(8,'0'));
  const out=[];
  for(let i=1;i<=8;i++)out.push({id:'r2'+i,name:`R2 Resident ${String(i).padStart(2,'0')}`,level:'R2',group:'ICU Residents',max:18,pager:nextPager(),eligible:[...allShiftIds]});
  ¶»§q«^