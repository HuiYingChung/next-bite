import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { independentRecipeRanking, compareIndependentTiers } from "./recipe-ranking-oracle.mjs";

const root=fileURLToPath(new URL("../",import.meta.url)), modules=new Map();
function load(relative){
  const file=path.resolve(root,relative);
  if(modules.has(file))return modules.get(file).exports;
  const module={exports:{}};modules.set(file,module);
  const {outputText}=ts.transpileModule(fs.readFileSync(file,"utf8"),{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}});
  new Function("require","module","exports",outputText)(name=>{assert(name.startsWith("."));return load(`${path.resolve(path.dirname(file),name)}.ts`);},module,module.exports);
  return module.exports;
}
const {recommendPilotMeals,calculateScoreForRecipe,calculateRecipe,calculateRecipeProfile}=load("src/nutrition.ts");
const {standardizedRecipes,sourceFoods}=load("src/nutrition-data.ts");
const {seedProfile,createBlankState}=load("src/data.ts");
const {defaultMealContext,normalizeMealContext}=load("src/meal-context.ts");
const now=new Date(2026,10,6,12,30), state=createBlankState(now), today=state.days.find(day=>day.isToday).todayLog;
const profile=changes=>({...seedProfile,preferenceTags:[],avoidTags:[],sensitiveDrinkOptIns:[],feelToday:"Normal",...changes});
const context=changes=>({...defaultMealContext,...changes});
const run=(p=profile(),c=context(),locale="en")=>recommendPilotMeals(p,c,locale,now,today,state.days);
const ids=result=>result.eligibleRecipes.map(item=>item.recipe.mealId);
const row=(score,key)=>score.preferenceRows.find(item=>item.key===key);

// Preserve all physical nutrients and official model outputs while exercising
// the supported preferences and all three portion choices.
const snapshots=new Map(standardizedRecipes.map(recipe=>[recipe.mealId,{model:calculateRecipeProfile(recipe),portions:["small","regular","large"].map(portion=>calculateRecipe(recipe,portion))}]));
const neutral=run();
assert.equal(neutral.candidateCount,108);
for(const item of neutral.eligibleRecipes){
  assert.deepEqual(item.score.currentPreference,{points:0,possible:0,matched:0,selected:0});
  assert.deepEqual(item.score.savedPreference,{points:0,possible:0,matched:0,selected:0});
  assert.equal(item.score.preferenceRows.length,5);
  assert(item.score.preferenceRows.every(value=>!value.active&&value.scope==="inactive"&&!value.matched));
  assert.equal(item.score.nutritionReference,10-item.score.model.rawScore);
  assert.equal(item.score.nutritionReference,item.score.nutrient+item.score.energy);
  assert(item.matchReasons.length>=2&&item.matchReasons.length<=3);
  assert(item.matchReasons.some(reason=>reason.includes("assembly time")&&reason.includes("not included")));
}
for(const staple of ["bread","rice","noodles"]){
  const result=run(profile(),context({preferredStaple:staple}));
  assert(standardizedRecipes.filter(recipe=>recipe.staple===staple).length>=3);
  assert(result.recommendations.every(item=>item.recipe.staple===staple),`${staple} preference must produce three matching recipes when available`);
  assert.deepEqual(result.recommendations,result.eligibleRecipes.slice(0,3));
  assert.deepEqual(ids(result),ids(run(profile(),context({preferredStaple:staple}))),"Identical inputs produce identical ordering");
  const mismatch=result.eligibleRecipes.find(item=>item.recipe.staple!==staple);
  assert(mismatch.mismatchReasons.some(reason=>reason.includes("flexible alternative")));
  assert.deepEqual(mismatch.score.currentPreference,{points:0,possible:2,matched:0,selected:1});
}

const conflicting=profile({preferenceTags:["Rice-based meals","High-protein","Light meals"]});
const breadContext=context({preferredStaple:"bread"}), bread=run(conflicting,breadContext);
assert(bread.recommendations.every(item=>item.recipe.staple==="bread"),"Current bread preference outranks conflicting saved rice/style/nutrient preferences");
const expected=standardizedRecipes.map(recipe=>independentRecipeRanking(recipe,sourceFoods,conflicting,breadContext).tier).sort(compareIndependentTiers);
assert.deepEqual(bread.eligibleRecipes.map(item=>independentRecipeRanking(item.recipe,sourceFoods,conflicting,breadContext).tier),expected);
const savedOnly=run(profile({preferenceTags:["Wraps / sandwiches"]}));
assert(savedOnly.recommendations.every(item=>/\bsandwich\b/i.test(item.recipe.label.en)),"Supported saved styles outrank nutrition when no current preference distinguishes candidates");
assert(savedOnly.eligibleRecipes.some(item=>item.score.savedPreference.points===0&&item.score.nutritionReference>savedOnly.recommendations[0].score.nutritionReference),"Fixture demonstrates saved preference winning over a higher nutrition reference");

const partial=run(profile({preferenceTags:["Plant-protein","Soupy meals"]}));
const partialMeal=partial.eligibleRecipes.find(item=>row(item.score,"saved-styles").matchedValues.length===1);
assert(partialMeal,"At least one actual recipe matches only one of the two selected styles");
assert.deepEqual(partialMeal.score.savedPreference,{points:2,possible:2,matched:1,selected:1},"Counters describe preference groups; style matches never multiply points");
assert.equal(row(partialMeal.score,"saved-styles").unmatchedValues.length,1);
assert(partialMeal.mismatchReasons.some(reason=>reason.includes("Saved preferences not matched")),"Partial style matches disclose the unfulfilled choice");
for(const locale of ["en","zh"]){
  const unavailable=run(profile({preferenceTags:["Chinese-style"]}),context(),locale);
  for(const item of unavailable.eligibleRecipes){
    assert.deepEqual(item.score.unsupportedSavedPreferences,["Chinese-style"]);
    assert.equal(item.score.savedPreference.selected,0,"Unsupported saved choices are not included in active scored groups");
    assert(item.mismatchReasons.some(reason=>locale==="en"?reason.includes("unavailable"):reason.includes("目前無法")));
    assert(item.matchReasons.some(reason=>locale==="en"?reason.includes("No applicable"):reason.includes("沒有可套用")));
    assert(!row(item.score,"saved-styles").note.includes("No saved meal-style preference selected"));
  }
}

assert.equal(normalizeMealContext().ingredientReadiness,"unspecified");
assert.equal(normalizeMealContext({ingredientReadiness:"invalid"}).ingredientReadiness,"unspecified");
const ready=run(profile(),context({ingredientReadiness:"ready",maxPrepMinutes:10}));
const unspecified=run(profile(),context({maxPrepMinutes:10}));
assert(ready.candidateCount>0);
assert.deepEqual(ids(ready),ids(unspecified),"Unspecified readiness retains a clearly qualified assembly-time filter");
assert(ready.eligibleRecipes.every(item=>item.recipe.prepMinutes<=10));
const notReady=run(profile(),context({ingredientReadiness:"needs-prep",maxPrepMinutes:10}));
assert.equal(notReady.candidateCount,0,"An assembly estimate must not promise a full cooking time");
assert.equal(notReady.trace.exclusions.length,108);
assert(notReady.trace.exclusions.every(item=>item.stage==="context"&&item.reasons.includes("preparation-total-time-unknown")));
const noTimeLimit=run(profile(),context({ingredientReadiness:"needs-prep"}));
assert.equal(noTimeLimit.candidateCount,108,"Unknown preparation duration is not a restriction without a time limit");
assert(noTimeLimit.eligibleRecipes.every(item=>item.matchReasons.filter(reason=>reason.includes("total cooking time is unknown")).length===1));
assert(noTimeLimit.eligibleRecipes.every(item=>!item.mismatchReasons.some(reason=>reason.includes("total cooking time is unknown"))),"General preparation qualification is not duplicated in both reason lists");
for(const item of run(profile({feelToday:"Low energy",preferenceTags:["Light meals"]}),context({ingredientReadiness:"needs-prep"})).eligibleRecipes){
  const prep=row(item.score,"preparation");
  assert.equal(prep.scope,"current");assert.equal(prep.active,true);assert.equal(prep.available,false);assert.equal(prep.points,0);assert.equal(prep.matched,false);
  assert.equal(item.score.savedPreference.selected,0,"Current preparation request replaces its saved fallback without double counting");
  assert(item.mismatchReasons.some(reason=>reason.includes("Less effort cannot be confirmed")));
}
for(const recipe of standardizedRecipes){
  const savedPrep=calculateScoreForRecipe(recipe,profile({preferenceTags:["Light meals"]}),context());
  assert.equal(row(savedPrep,"preparation").scope,"saved");
  const currentPrep=calculateScoreForRecipe(recipe,profile({feelToday:"Need something light",preferenceTags:["Light meals"]}),context({ingredientReadiness:"needs-prep"}));
  assert.equal(row(currentPrep,"preparation").scope,"current");
  assert.equal(row(currentPrep,"preparation").points,row(savedPrep,"preparation").points,"Added-oil facts remain valid even when cooking duration is unknown");
  assert.deepEqual(calculateRecipeProfile(recipe),snapshots.get(recipe.mealId).model);
  assert.deepEqual(["small","regular","large"].map(portion=>calculateRecipe(recipe,portion)),snapshots.get(recipe.mealId).portions);
}
console.log(JSON.stringify({preferenceFirstStaples:true,currentOutranksSaved:true,savedOutranksNutrition:true,partialAndUnsupportedDisclosed:true,assemblyReadinessEnforced:true,deterministic:true,physicalNutritionAndOfficialModelUnchanged:true},null,2));
