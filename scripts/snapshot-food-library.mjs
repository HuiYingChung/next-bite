// Run after downloading and extracting the three official releases. This is a
// projection, not an inferred nutrient database. Original hashes pin provenance.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { gzipSync } from 'node:zlib';
const root = path.resolve(import.meta.dirname, '..');
const folder = path.resolve(process.argv[2] ?? path.join(root, '.audit-tmp/food-downloads'));
const output = path.join(root, 'data/food-library');
fs.mkdirSync(output, { recursive: true });
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const inputs = [
  { id: 'usda-sr', zip: 'usda-sr.zip', file: 'usda-sr/FoodData_Central_sr_legacy_food_json_2018-04.json', key: 'SRLegacyFoods', url: 'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2018-04.zip', release: 'SR Legacy April 2018' },
  { id: 'usda-fndds', zip: 'usda-fndds.zip', file: 'usda-fndds/surveyDownload.json', key: 'SurveyFoods', url: 'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_survey_food_json_2024-10-31.zip', release: 'FNDDS 2021–2023, October 2024' },
  { id: 'tfda', zip: 'tfda.zip', file: 'tfda/20_5.json', url: 'https://data.fda.gov.tw/data/opendata/export/20/json', release: 'Retrieved 2026-11-04; metadata updated 2026-10-05' },
];
const ids = new Set([1008,1062,1003,1005,1004,1258,1079,1093,1235,2000,1063,1018]);
const wanted = new Set(['熱量','粗蛋白','總碳水化合物','粗脂肪','飽和脂肪','膳食纖維','鈉','糖質總量','酒精含量']);
const manifest = { schemaVersion: 1, retrievedAt: '2026-11-04', projectionVersion: 1, sources: [] };
for (const input of inputs) {
  const raw = fs.readFileSync(path.join(folder,input.file));
  const parsed = JSON.parse(raw.toString('utf8').replace(/^\uFEFF/,''));
  const source = input.key ? parsed[input.key] : parsed;
  const records = input.key ? source.map(food => ({
    fdcId: food.fdcId, foodCode: food.foodCode ?? null, description: food.description,
    category: food.foodCategory?.description ?? food.wweiaFoodCategory?.wweiaFoodCategoryDescription ?? '',
    scientificName: food.scientificName ?? null, publicationDate: food.publicationDate,
    nutrients: food.foodNutrients.filter(value => ids.has(value.nutrient.id)),
  })) : source.filter(row => wanted.has(row['分析項']));
  const snapshot = gzipSync(Buffer.from(JSON.stringify(records)), { level: 9 });
  const filename = `${input.id}-snapshot.json.gz`;
  fs.writeFileSync(path.join(output,filename), snapshot);
  manifest.sources.push({ id:input.id, release:input.release, url:input.url, archiveSha256:sha(fs.readFileSync(path.join(folder,input.zip))), rawSha256:sha(raw), snapshot:filename, snapshotSha256:sha(snapshot), upstreamRows:source.length, projectedRows:records.length });
}
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(manifest.sources.map(({id,upstreamRows,projectedRows})=>({id,upstreamRows,projectedRows})));
