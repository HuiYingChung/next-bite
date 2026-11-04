import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { assessRecord, conceptMatchesSource } from './food-library-assessment.mjs';

const root = path.resolve(import.meta.dirname, '..');
const directory = path.join(root,'data/food-library');
const manifest = JSON.parse(fs.readFileSync(path.join(directory,'manifest.json'),'utf8'));
const concepts = JSON.parse(fs.readFileSync(path.join(directory,'reviewed-concepts.json'),'utf8'));
const existingFoods = JSON.parse(fs.readFileSync(path.join(root,'data/nutrition/food-definitions.json'),'utf8'));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const number = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
const sourceNumber = value => value === null || value === undefined || String(value).trim() === '' ? null : number(Number(value));
const read = id => {
  const source = manifest.sources.find(item => item.id === id);
  const bytes = fs.readFileSync(path.join(directory,source.snapshot));
  if (sha(bytes) !== source.snapshotSha256) throw new Error(`Source snapshot hash mismatch: ${id}`);
  return JSON.parse(gunzipSync(bytes).toString('utf8'));
};
const nutrientIds = {kcal:[1008,'kcal'],energyKj:[1062,'kJ'],protein:[1003,'g'],carbs:[1005,'g'],fat:[1004,'g'],saturatedFat:[1258,'g'],fiber:[1079,'g'],sodium:[1093,'mg'],addedSugar:[1235,'g'],totalSugars:[2000,'g']};
const records = [];
function modelRecord(input) {
  const assessment = assessRecord({description:input.names.en || input.names.zh, category:input.category, sourceId:input.sourceId, state:input.state, nutrients:{...input.nutrientsPer100g,alcohol:input.alcohol}});
  const { alcohol:_alcohol, ...record } = input;
  record.kind = assessment.kind;
  record.group = assessment.group;
  record.identity = assessment.identity ?? null;
  record.modelBasis = {freeSugarsPer100g:assessment.freeSugarsPer100g, fvnsPercent:assessment.fvnsPercent, fiberMethod:assessment.fiberMethod, notes:assessment.notes, sourceUrls:assessment.sourceUrls};
  records.push(record);
}
for (const sourceId of ['usda-sr','usda-fndds']) {
  for (const food of read(sourceId)) {
    const get = (id,unit) => {
      const nutrient = food.nutrients.find(item => item.nutrient.id === id);
      if (!nutrient) return null;
      if (nutrient.nutrient.unitName.toLowerCase() !== unit.toLowerCase()) throw new Error(`Unexpected nutrient unit ${food.fdcId}/${id}`);
      return number(nutrient.amount);
    };
    const nutrientsPer100g = Object.fromEntries(Object.entries(nutrientIds).map(([key,[id,unit]])=>[key,get(id,unit)]));
    // 1063 is the FNDDS total-sugars field, not added or free sugar.
    if (nutrientsPer100g.totalSugars === null) nutrientsPer100g.totalSugars = get(1063,'g');
    const derivedEnergy = nutrientsPer100g.energyKj === null && nutrientsPer100g.kcal !== null;
    if (derivedEnergy) nutrientsPer100g.energyKj = nutrientsPer100g.kcal * 4.184;
    modelRecord({id:`${sourceId}-${food.fdcId}`, sourceId, sourceRecordId:String(food.fdcId), sourceUrl:`https://fdc.nal.usda.gov/food-details/${food.fdcId}/nutrients`, names:{en:food.description,zh:''}, aliases:[],category:food.category,state:/\braw\b/i.test(food.description)?'raw':/\bcooked\b/i.test(food.description)?'cooked':null,nutrientsPer100g,alcohol:get(1018,'g')});
    if (derivedEnergy) {
      const note=records.at(-1).modelBasis.notes;
      note.en += ' Energy in kJ is converted from source kcal × 4.184.';
      note.zh += ' kJ 由來源 kcal 乘以 4.184 換算。';
    }
  }
}
const tfda = new Map();
for (const row of read('tfda')) {
  const id=row['整合編號'];
  if (!tfda.has(id)) tfda.set(id,{head:row,values:new Map()});
  const entry=tfda.get(id);
  if (entry.values.has(row['分析項'])) throw new Error(`Duplicate TFDA analyte ${id}/${row['分析項']}`);
  entry.values.set(row['分析項'],row);
}
const tfdaFields={kcal:['熱量','kcal'],protein:['粗蛋白','g'],carbs:['總碳水化合物','g'],fat:['粗脂肪','g'],saturatedFat:['飽和脂肪','g'],fiber:['膳食纖維','g'],sodium:['鈉','mg'],totalSugars:['糖質總量','g']};
for (const [id,{head,values}] of tfda) {
  const get=(field,unit) => {
    const value=values.get(field);
    if (!value) return null;
    if(value['含量單位']!==unit) throw new Error(`Unexpected TFDA unit ${id}/${field}`);
    return sourceNumber(value['每100克含量']);
  };
  const nutrientsPer100g=Object.fromEntries(Object.entries(tfdaFields).map(([key,[field,unit]])=>[key,get(field,unit)]));
  nutrientsPer100g.addedSugar=null;
  nutrientsPer100g.energyKj=nutrientsPer100g.kcal===null?null:nutrientsPer100g.kcal*4.184;
  modelRecord({id:`tfda-${id}`,sourceId:'tfda',sourceRecordId:id,sourceUrl:'https://data.gov.tw/dataset/8543',names:{en:(head['樣品英文名稱']??'').trim(),zh:head['樣品名稱'].trim()},aliases:(head['俗名']??'').split(/[,，、;]/).map(value=>value.trim()).filter(Boolean),category:head['食品分類'],state:head['內容物描述']||null,nutrientsPer100g,alcohol:get('酒精含量','g')});
  const note=records.at(-1).modelBasis.notes;
  note.en += ' Energy in kJ is converted from source kcal × 4.184. TFDA English labels may omit the preparation state; refer to the original Chinese sample description.';
  note.zh += ' kJ 由來源 kcal 乘以 4.184 換算；英文名稱可能未包含製備狀態，請參照原始中文樣品描述。';
}

// Link exact concept names to source-label search suggestions. These links are
// discovery aids only; they never merge foods or assign a nutrient identity.
const normalize = value=>value.normalize('NFKC').trim().toLowerCase();
for (const food of existingFoods) {
  const record=records.find(item=>item.id===`usda-sr-${food.fdcId}`);
  if(record) record.aliases.push(food.label.en,food.label.zh);
}
const terms = record=>[record.names.en,record.names.zh,...record.aliases].map(normalize).filter(Boolean);
for(const concept of concepts) {
  const names=[concept.names.en,concept.names.zh,...concept.aliases].map(normalize).filter(name=>name.length>1);
  concept.recordIds=records.filter(record=>conceptMatchesSource(concept.id,{description:record.names.en,category:record.category,sourceId:record.sourceId}) || terms(record).some(label=>names.some(name=>label===name || (/^[a-z ]+$/i.test(name) && (label.startsWith(name+',') || label.startsWith(name+' '))) || (/[^\x00-\x7F]/.test(name) && label.startsWith(name))))).map(record=>record.id);
}
const sources=manifest.sources.map(item=>({id:item.id,provider:item.id==='tfda'?'台灣衛生福利部食品藥物管理署':'USDA Agricultural Research Service',dataset:item.id==='tfda'?'食品營養成分資料庫':item.id==='usda-sr'?'FoodData Central · SR Legacy':'FoodData Central · FNDDS',release:item.release,url:item.id==='tfda'?'https://data.gov.tw/dataset/8543':'https://fdc.nal.usda.gov/download-datasets/',license:item.id==='tfda'?'政府資料開放授權條款第 1 版':'CC0 1.0',licenseUrl:item.id==='tfda'?'https://data.gov.tw/license':'https://fdc.nal.usda.gov/api-guide/',retrievedAt:manifest.retrievedAt}));
const data={schemaVersion:1,generatedAt:manifest.retrievedAt,sources,records:records.sort((a,b)=>a.id.localeCompare(b.id,'en')),concepts};
// The weekly view needs exact source names and groups without loading the full
// composition catalog. A source group supports an occurrence count only.
// Only reviewed exact concept matches support a distinct named-food count.
const summaryConceptOverrides = new Map([
  ['tfda-O0100401', 'orange-juice'], // Official sample: 柳橙汁(100%).
  ['tfda-R9900101', 'beer'], // Official sample: 生啤酒 / Draught beer; Draft beer.
  ['usda-fndds-2710375', 'coffee'], // Official sample: Coffee, brewed.
]);
const summaryConceptFor = record => {
  const explicit = concepts.find(concept => concept.id === summaryConceptOverrides.get(record.id));
  if (explicit?.group === record.group) return explicit;
  const sourceNames = [record.names.en, record.names.zh].map(normalize).filter(Boolean);
  const matches = concepts.filter(concept => concept.group === record.group &&
    [concept.names.en, concept.names.zh, ...concept.aliases].map(normalize).some(name => sourceNames.includes(name)));
  return matches.length === 1 ? matches[0] : null;
};
const sourceIdentities = records.filter(record => record.identity || ['vegetable', 'fruit', 'drink'].includes(record.group)).map(record => {
  const concept = summaryConceptFor(record);
  return [record.id, record.names.en, record.names.zh, record.group,
    record.identity?.key ?? (concept ? `concept:${concept.id}` : `source:${record.id}`),
    record.identity?.protein ?? null, record.identity?.staple ?? null, record.kind];
});
const outputs=new Map([
  ['public/food-library/catalog.json',JSON.stringify(data)+'\n'],
  ['src/food-concepts.generated.ts','// Generated by scripts/import-food-library.mjs. Reviewed exact names only.\nexport const foodConcepts = '+JSON.stringify(concepts.map(({recordIds,...concept})=>concept))+' as const;\n'],
  ['src/food-source-identities.generated.ts','// Generated from reviewed source-description rules and exact source groups; no nutrient values.\nexport const foodSourceIdentities = '+JSON.stringify(sourceIdentities)+' as const;\n'],
]);
for(const [file,content] of outputs) {
  const target=path.join(root,file);
  if(process.argv.includes('--check')) {
    if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==content) throw new Error(`Stale generated file: ${file}`);
  } else {fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,content);}
}
console.log(`Food library: ${records.length} source records, ${concepts.length} reviewed concepts; source hashes and generated output ${process.argv.includes('--check')?'verified':'written'}.`);
