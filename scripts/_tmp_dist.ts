import { adminDb } from "../src/lib/firebase/admin";
import { resolveCanonical, isWeaknessLabel, isLocationOnlyLabel } from "../src/lib/growth/weakness-taxonomy";
import { categorizeWeakness } from "../src/lib/growth/weakness-category";
import { writeFileSync } from "fs";
async function main(){
  const rows:string[]=[];
  for (const col of ["essays","interviews"]) {
    const s=await adminDb!.collection(col).get();
    for (const d of s.docs) (d.data().feedback?.repeatedIssues??[]).forEach((i:any,n:number)=>{
      if(!i.area) return;
      let k:string; if(!isWeaknessLabel(i.area)) k="DROP"; else { const e=resolveCanonical(i.area,{categoryHint:i.category??categorizeWeakness(i.area),supportText:i.message}); k=e?e.id:isLocationOnlyLabel(i.area)?"DROP(place)":"RAW"; }
      rows.push(JSON.stringify({key:`${d.id}#${n}`,k,area:i.area,cat:i.category,msg:String(i.message).slice(0,90)}));
    });
  }
  writeFileSync(process.env.OUT!, rows.join("\n"));
}
main();
