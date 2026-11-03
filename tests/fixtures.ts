import { randomUUID } from "node:crypto";
import { openDatabase } from "../src/server/db";
import { ScienceRepository } from "../src/server/science-repository";
import type { SoilInput } from "../src/modules/soil/schema";
import type { ScenarioInput } from "../src/modules/rotations/schema";
export const provenance={kind:"DECLARED" as const,source:"Fixture sintético de prueba, no dato real",method:"Prueba automatizada",date:"2025-01-01",resolution:null,assumptions:[],hypothetical:true};
export const farmInput={name:"Finca sintética",coordinates:{latitude:10.19,longitude:-84.39},resources:{irrigation:null,labor:null,equipment:null,budget:null},priorities:[],provenance};
export function setup(){const db=openDatabase(":memory:"),repo=new ScienceRepository(db),farm=repo.createFarm(farmInput),parcel=repo.createParcel({farmId:farm.id,name:"Parcela sintética",area:{value:1,unit:"ha"},history:null,provenance});return {db,repo,farm,parcel};}
export const soilInput=(parcelId:string=randomUUID()):SoilInput=>({parcelId,sampledAt:"2025-01-01",depth:{top:0,bottom:20,unit:"cm"},origin:"LABORATORY",taxonomy:null,properties:{ph:{value:null,unit:"pH",method:null},organicMatter:{value:null,unit:"%",method:null},phosphorus:{value:null,unit:"mg/kg",method:null},texture:null},provenance:{...provenance,kind:"OBSERVED"}});
export const scenarioInput=(parcelId:string,slot=1):ScenarioInput=>({parcelId,slot,name:`Alternativa ${slot}`,steps:[{cropId:"potato",start:"2027-01-01",end:"2027-03-01"},{cropId:"onion",start:"2027-03-02",end:"2027-06-01"}],constraints:{irrigationRequired:null,availableUntil:null,notes:null},provenance});
// Entirely synthetic API fixture. Never used as NASA evidence in the application.
export const query={latitude:10.19,longitude:-84.39,start:"2025-01-01",end:"2025-01-03"};
export const syntheticPower=()=>({type:"Feature",geometry:{type:"Point",coordinates:[-84.39,10.19,0]},properties:{parameter:{T2M:{"20250101":10,"20250102":-999,"20250103":12},PRECTOTCORR:{"20250101":0,"20250102":1,"20250103":-999}}},header:{title:"SYNTHETIC TEST FIXTURE",api:{version:"test",name:"Fake POWER for unit tests"},sources:["SYNTHETIC"],fill_value:-999,time_standard:"UTC",start:"20250101",end:"20250103"},messages:[],parameters:{T2M:{units:"C",longname:"Synthetic temperature"},PRECTOTCORR:{units:"mm/day",longname:"Synthetic precipitation"}}});
