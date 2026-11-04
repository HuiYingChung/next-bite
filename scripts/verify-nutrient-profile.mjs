import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const modules = new Map();
function loadSource(relative) {
  const file = path.resolve(root, relative);
  if (modules.has(file)) return modules.get(file).exports;
  const module = { exports: {} };
  modules.set(file, module);
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), { fileName: file, compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } });
  new Function("require", "module", "exports", outputText)(specifier => {
    assert(specifier.startsWith("."));
    return loadSource(`${path.resolve(path.dirname(file), specifier)}.ts`);
  }, module, module.exports);
  return module.exports;
}

const { calculateNutrientProfile, getNpm2018Band } = loadSource("src/nutrient-profile.ts");
const { calculateRecipeProfile, calculateScoreForRecipe, recommendPilotMeals, getRecipeHardAvoidConflicts } = loadSource("src/nutrition.ts");
const { sourceFoods, standardizedRecipes } = loadSource("src/nutrition-data.ts");
const { seedProfile, createBlankState, avoidTags } = loadSource("src/data.ts");
const { defaultMealContext } = loadSource("src/meal-context.ts");
const clone = value => JSON.parse(JSON.stringify(value));
const blankInputs = { energyKj: 0, saturatedFat: 0, freeSugars: 0, salt: 0, protein: 0, fiber: 0, fvnsPercent: 0, fiberMethod: "AOAC-compatible" };
// Independent literals transcribed from official tables1/2, not imported from
// the implementation under test. Every strict boundary gets both sides tested.
const thresholds = {
  energyKj: [315,630,945,1260,1575,1890,2205,2520,2835,3150],
  saturatedFat: [.9,1.9,2.8,3.7,4.7,5.6,6.6,7.5,8.4,9.4],
  freeSugars: [.9,1.9,2.8,3.7,4.6,5.6,6.5,7.4,8.3,9.3],
  salt: [.2,.5,.7,.9,1.1,1.4,1.6,1.8,2,2.3], protein: [1.7,3.4,5.1,6.8,8.5],
  fiber: [.6,1.2,1.8,2.4,3,3.6,4.2,4.8,5.4,6], fvnsPercent: [40,60,80],
};
let boundaryChecks = 0;
for (const [key, values] of Object.entries(thresholds)) for (let index = 0; index < values.length; index++) {
  const expected = band => key === "fvnsPercent" ? [0,1,2,5][band] : band;
  for (const [delta, band] of [[-1e-8,index],[0,index],[1e-8,index+1]]) {
    assert.equal(getNpm2018Band(key, values[index] + delta).points, expected(band), `${key} boundary ${values[index]} delta${delta}`);
    boundaryChecks++;
  }
}
const belowGate = calculateNutrientProfile({ ...blankInputs, energyKj:315, saturatedFat:7.6, freeSugars:1.91, protein:9 });
assert.equal(belowGate.aTotal, 10);
assert.equal(belowGate.creditedProteinPoints, 5);
const fullGate = calculateNutrientProfile({ ...blankInputs, energyKj:315.00000001, saturatedFat:7.6, freeSugars:1.91, protein:9 });
assert.equal(fullGate.aTotal, 11);
assert.equal(fullGate.points.c.protein, 5);
assert.equal(fullGate.creditedProteinPoints, 0, "Full A including energy must gate protein");
assert.equal(fullGate.rawScore, 11);
assert.equal(calculateNutrientProfile({ ...fullGate.inputs, fvnsPercent:80 }).creditedProteinPoints, 0);
assert.equal(calculateNutrientProfile({ ...fullGate.inputs, fvnsPercent:80.00000001 }).creditedProteinPoints, 5);

// Official worked examples8/9/14, independently published expected outputs.
for (const [name, values, expected] of [
  ["hummus", { energyKj:1251,saturatedFat:2.6,freeSugars:.48,salt:.9,protein:6.9,fiber:4.9,fvnsPercent:73 }, -6],
  ["chunky vegetable soup", { energyKj:212,saturatedFat:.1,freeSugars:2.01,salt:.4,protein:2.8,fiber:2.3,fvnsPercent:59 }, -2],
  ["cheese containing fruit", { energyKj:1531,saturatedFat:17.1,freeSugars:4.2,salt:1,protein:17.5,fiber:1.7,fvnsPercent:25 }, 20],
]) assert.equal(calculateNutrientProfile({ ...blankInputs, ...values }).rawScore, expected, name);
assert.equal(calculateNutrientProfile({ ...blankInputs, salt:1 }).classification, "less-healthy");
assert.equal(calculateNutrientProfile({ ...blankInputs, salt:.3 }, "food").classification, "below-threshold");
assert.equal(calculateNutrientProfile({ ...blankInputs, salt:.3 }, "drink").classification, "less-healthy");
for (const [key, value] of [["energyKj",null],["fiber",NaN],["salt",-1],["freeSugars",Infinity],["fvnsPercent",101],["fiberMethod","unknown"]]) {
  const result = calculateNutrientProfile({ ...blankInputs, [key]:value });
  assert.equal(result.status, "incomplete");
  assert.equal(result.rawScore, null);
  assert(result.missing.includes(key));
}

const now = new Date(2026,10,4,12,30);
const profile = changes => ({ ...clone(seedProfile), feelToday:"Normal", preferenceTags:[], avoidTags:[], sensitiveDrinkOptIns:[], ...changes });
const context = changes => ({ ...defaultMealContext, ...changes });
const log = createBlankState(now).days.find(day => day.isToday).todayLog;
// Recalculate all12 totals independently from source weights and threshold
// literals, so a sorted-looking but incorrect top3 cannot pass this test.
function independent(recipe, selectedProfile, selectedContext) {
  const grams = recipe.ingredients.reduce((sum,item)=>sum+item.grams,0);
  const weighted = read => recipe.ingredients.reduce((sum,item)=>sum+item.grams*read(sourceFoods.find(food=>food.id===item.foodId)),0)/grams;
  const values = { energyKj:weighted(food=>food.nutrientsPer100g.energyKj), saturatedFat:weighted(food=>food.nutrientsPer100g.saturatedFat), freeSugars:weighted(food=>food.modelBasis.freeSugarsPer100g), salt:weighted(food=>food.nutrientsPer100g.sodium*.0025), protein:weighted(food=>food.nutrientsPer100g.protein), fiber:weighted(food=>food.nutrientsPer100g.fiber), fvnsPercent:weighted(food=>food.modelBasis.fvnsEligible?100:0) };
  const points = key => { const count=thresholds[key].filter(t=>values[key]>t).length; return key==="fvnsPercent"?[0,1,2,5][count]:count; };
  const a=points("energyKj")+points("saturatedFat")+points("freeSugars")+points("salt");
  const c=points("fiber")+points("fvnsPercent")+((a<11||points("fvnsPercent")===5)?points("protein"):0);
  // Neutral profile and selected-staple/cuisine cases avoid reusing style or
  // preference helper code when independently validating the full ranking.
  const p=(selectedContext.preferredStaple!=="any"&&recipe.staple===selectedContext.preferredStaple?2:0)+(selectedContext.cuisine!=="any"&&recipe.cuisine===selectedContext.cuisine?2:0);
  return { total:10-a+c+p, raw:a-c, values };
}
for (const selectedContext of [context(),context({preferredStaple:"rice"}),context({cuisine:"western"}),context({preferredStaple:"potato",cuisine:"western"})]) {
  const result = recommendPilotMeals(profile(),selectedContext,"en",now,log);
  assert.equal(result.candidateCount,12);
  assert.equal(result.trace.candidateScores.length,12);
  const independentTotals=standardizedRecipes.map(recipe=>({id:recipe.mealId,...independent(recipe,profile(),selectedContext)}));
  for (const item of result.trace.candidateScores) {
    const expected=independentTotals.find(row=>row.id===item.mealId);
    assert.equal(item.score.total,expected.total,`${item.mealId} independent total`);
    assert.equal(item.score.model.rawScore,expected.raw);
    assert.equal(item.score.nutrient+item.score.energy+item.score.preference,item.score.total);
    assert.equal(item.score.total,10-item.score.model.rawScore+item.score.preference,"Energy included once");
    assert.equal(item.score.preferenceRows.reduce((sum,row)=>sum+row.points,0),item.score.preference);
    assert(item.score.preference>=0&&item.score.preference<=10);
  }
  const bestTotals=independentTotals.map(row=>row.total).sort((a,b)=>b-a).slice(0,3);
  assert.deepEqual(result.recommendations.map(item=>item.score.total),bestTotals,"Actual top3 totals, not hidden preference tiers or diversity replacement");
}
for (const recipe of standardizedRecipes) {
  const baseline=calculateRecipeProfile(recipe);
  assert.equal(baseline.status,"complete");
  for (const factor of [.75,1.25,2.137]) {
    const scaled={...recipe,ingredients:recipe.ingredients.map(item=>({...item,grams:item.grams*factor}))};
    const actual=calculateRecipeProfile(scaled);
    assert.equal(actual.rawScore,baseline.rawScore,`${recipe.mealId} scaling must not change bands`);
  }
}
const basicRecipe=standardizedRecipes.find(recipe=>recipe.mealId==="chicken-broccoli-rice-bowl");
const missingFoods=sourceFoods.map(food=>food.id==="usda-171477"?{...food,modelBasis:{...food.modelBasis,freeSugarsPer100g:null}}:food);
assert.equal(calculateRecipeProfile(basicRecipe,missingFoods).rawScore,null);
assert.equal(calculateScoreForRecipe(basicRecipe,profile(),context(),"en",missingFoods),null,"Unknown scoring input never becomes zero or a fallback score");
const chickenSource=sourceFoods.find(food=>food.id==="usda-171477");
const retainedFreeSugars=chickenSource.modelBasis.freeSugarsPer100g;
try {
  chickenSource.modelBasis.freeSugarsPer100g=null;
  const incomplete=recommendPilotMeals(profile(),context(),"en",now,log);
  assert(!incomplete.trace.eligibleRecipeIds.includes(basicRecipe.mealId));
  assert(incomplete.trace.exclusions.some(item=>item.mealId===basicRecipe.mealId&&item.stage==="evidence"&&item.reasons.includes("model-input:freeSugars")),"Unknown model input excludes the actual candidate with a reason");
} finally { chickenSource.modelBasis.freeSugarsPer100g=retainedFreeSugars; }
const unknownId={...basicRecipe,ingredients:[...basicRecipe.ingredients,{foodId:"unmapped",grams:1,weighedState:"cooked",group:"other",role:"seasoning"}]};
assert.equal(calculateRecipeProfile(unknownId).status,"incomplete");
const mixedIndex=standardizedRecipes.findIndex(recipe=>recipe.mealId==="salmon-edamame-bowl");
const mixedFvnsRecipe=clone(standardizedRecipes[mixedIndex]);
mixedFvnsRecipe.ingredients=mixedFvnsRecipe.ingredients.map(item=>item.role==="vegetable"?{...item,foodId:"usda-170457",weighedState:"raw"}:item);
const mixedFvns=calculateRecipeProfile(mixedFvnsRecipe);
assert.equal(mixedFvns.status,"incomplete","Matching individual source states do not permit mixing raw and cooked qualifying FVNS");
assert(mixedFvns.missing.includes("fvnsStateBasis"));
assert.equal(calculateScoreForRecipe(mixedFvnsRecipe,profile(),context()),null);
const retainedRecipe=standardizedRecipes[mixedIndex];
try {
  standardizedRecipes[mixedIndex]=mixedFvnsRecipe;
  const result=recommendPilotMeals(profile(),context(),"en",now,log);
  assert(!result.trace.eligibleRecipeIds.includes(mixedFvnsRecipe.mealId));
  assert(result.trace.exclusions.some(item=>item.mealId===mixedFvnsRecipe.mealId&&item.reasons.includes("model-input:fvnsStateBasis")),"Mixed-state candidate must be excluded with the explicit state-basis reason");
} finally { standardizedRecipes[mixedIndex]=retainedRecipe; }
for(const tag of avoidTags) for(const item of recommendPilotMeals(profile({avoidTags:[tag]}),context(),"en",now,log).recommendations) assert.equal(getRecipeHardAvoidConflicts(profile({avoidTags:[tag]}),item.recipe,item.portion).length,0);
assert.equal(recommendPilotMeals(profile(),context({maxPrepMinutes:0}),"en",now,log).recommendations.length,0);
const emptyPreference=calculateScoreForRecipe(basicRecipe,profile(),context());
assert.equal(emptyPreference.preference,0);
assert(emptyPreference.preferenceRows.find(row=>row.key==="staple").note.includes("No staple preference selected"));
const unmatched=calculateScoreForRecipe(basicRecipe,profile(),context({preferredStaple:"noodles"}));
assert(unmatched.preferenceRows.find(row=>row.key==="staple").note.includes("does not match"));
const matched=calculateScoreForRecipe(basicRecipe,profile(),context({preferredStaple:"rice",cuisine:"asian"}));
assert.equal(matched.preference,4);
assert.equal(matched.total-emptyPreference.total,4,"Preference weights change the actual total, while raw profile is fixed");
assert.equal(matched.model.rawScore,emptyPreference.model.rawScore);
const bothNutrition=calculateScoreForRecipe(basicRecipe,profile({preferenceTags:["High-protein","Vegetable-forward"]}),context());
assert.equal(bothNutrition.preferenceRows.find(row=>row.key==="nutrition-direction").points,2,"Nutrition direction capped once");
const savedAndCurrent=calculateScoreForRecipe(basicRecipe,profile({feelToday:"Need something light",preferenceTags:["Light meals"]}),context());
assert.equal(savedAndCurrent.preferenceRows.find(row=>row.key==="preparation").points,0,"Same saved/current request does not double count or bypass the per100g oil threshold");
console.log(JSON.stringify({strictBoundaryChecks:boundaryChecks,officialWorkedExamples:3,fullAProteinGate:true,unknownAndInvalidInputs:true,mixedFvnsStateRejected:true,independentAll12Totals:true,actualTop3:true,energyCountedOnce:true,preferenceBound10:true,scaleInvariance:true,hardExclusions:true,unsetVsUnmatched:true},null,2));
