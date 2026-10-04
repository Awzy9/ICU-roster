import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore CommonJS-compatible npm package supported by Deno.
import solver from "npm:javascript-lp-solver@0.4.24";

type Staff={id:string;level?:string;max?:number;eligible?:string[]};
type Shift={id:string;type:string;weekday?:number;weekend?:number;continuity?:boolean;overflowPriority?:number;overflowTarget?:number};
type Leave={person:string;from:string;to:string;status:string};
type Req={person:string;date:string;type:string;shift?:string};
type FreeReq={person:string;days:number;from:string;to:string;consecutive?:boolean;hard?:boolean};
type Rules={maxConsecutive?:number;nightRest?:boolean;maxAssignments?:number;maxNightCalls?:number;saudiWeekend?:boolean;minUnitBlock?:number;minNightGapDays?:number};

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:cors});
function isoDates(month:string){if(!/^\d{4}-\d{2}$/.test(month))throw new Error("Invalid month");const[y,m]=month.split('-').map(Number),out:string[]=[];for(let d=1;d<=31;d++){const x=new Date(Date.UTC(y,m-1,d));if(x.getUTCMonth()!==m-1)break;out.push(x.toISOString().slice(0,10));}return out;}
const dateObj=(d:string)=>new Date(d+"T00:00:00Z");
function splitRuns(idxs:number[]){const runs:number[][]=[];let cur:n¶»§q«^