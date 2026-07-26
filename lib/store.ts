import { promises as fs } from "fs"; import path from "path"; import type { CalendarEvent } from "./types";
const file=path.join(process.cwd(),"data","events.json");
export async function events():Promise<CalendarEvent[]>{try{return JSON.parse(await fs.readFile(file,"utf8"))}catch{return []}}
export async function save(all:CalendarEvent[]){await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(all,null,2));}
