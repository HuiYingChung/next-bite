import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { independentRecipeRanking, compareIndependentTiers, proteinGroupSources, independentMainProteinGroups } from "./recipe-ranking-oracle.mjs";

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
  assert.equal(item.score.preferenceRows.length,6);
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
// Nutrition levels and rotation: a product rule layered on unchanged model
// arithmetic. Levels restate the policy boundaries instead of importing them.
const levelOf=reference=>reference>=18?2:reference>=14?1:0;
const windows=[[2026,10,6,9],[2026,10,6,12,30],[2026,10,6,18],[2026,10,7,12,30],[2026,10,8,12,30]].map(parts=>new Date(...parts));
const defaults=windows.map(time=>recommendPilotMeals(profile(),context(),"en",time,today,state.days));
for(const result of defaults){
  assert.equal(result.eligibleRecipes.length,standardizedRecipes.length);
  const levels=result.eligibleRecipes.map(item=>item.score.nutritionLevel);
  for(const item of result.eligibleRecipes) assert.equal(item.score.nutritionLevel,levelOf(item.score.nutritionReference));
  assert(levels.every((level,index)=>index===0||level<=levels[index-1]),"Rotation never lifts a recipe above a higher nutrition level");
  assert.deepEqual(result.eligibleRecipes.slice(0,3),result.recommendations);
  assert.equal(result.trace.rankingPolicy.version,"mealhatch-banded-rotation-2026-11-10-v3");
}
assert.deepEqual(ids(recommendPilotMeals(profile(),context(),"en",windows[1],today,state.days)),ids(defaults[1]),"Same inputs, date and meal window reproduce the same order");
assert.deepEqual(ids(recommendPilotMeals(profile(),context(),"en",new Date(2026,10,6,14,45),today,state.days)),ids(defaults[1]),"Times inside one meal window share one order");
assert.equal(new Set(defaults.map(result=>ids(result).slice(0,3).join("|"))).size,defaults.length,"Each date and meal window offers a different first group");
assert.deepEqual(defaults.map(result=>result.trace.rotationSeed),["2026-11-06:breakfast","2026-11-06:lunch","2026-11-06:dinner","2026-11-07:lunch","2026-11-08:lunch"]);
// Turn-taking is even enough that no recipe dominates: over four weeks of
// three meal windows, every higher-level recipe reaches the first group and
// none takes more than a quarter of the appearances an even share would give
// it four times over.
const appearances=new Map(), higher=defaults[0].eligibleRecipes.filter(item=>item.score.nutritionLevel===2).map(item=>item.recipe.mealId);
let groups=0;
for(let day=1;day<=28;day++) for(const hour of [9,12,18]){
  groups++;
  for(const item of recommendPilotMeals(profile(),context(),"en",new Date(2026,10,day,hour),today,state.days).recommendations) appearances.set(item.recipe.mealId,(appearances.get(item.recipe.mealId)??0)+1);
}
assert.deepEqual([...appearances.keys()].sort(),[...higher].sort(),"Only higher-level recipes lead without preferences, and all of them take a turn");
const evenShare=groups*3/higher.length;
assert(Math.max(...appearances.values())<=evenShare*2,`No recipe leads more than twice its even share (${Math.max(...appearances.values())} vs ${evenShare})`);
// Options shown together differ in staple when none is selected.
for(const result of defaults){
  const staples=result.recommendations.map(item=>item.recipe.staple).filter(staple=>staple!=="none");
  assert.equal(new Set(staples).size,staples.length,"The first group does not repeat a staple while alternatives exist");
}
// A selected staple still leads; rotation only orders equal matches.
const riceGroups=windows.map(time=>recommendPilotMeals(profile(),context({preferredStaple:"rice"}),"en",time,today,state.days));
for(const result of riceGroups) assert(result.recommendations.every(item=>item.recipe.staple==="rice"&&item.score.nutritionLevel===2));
assert(new Set(riceGroups.map(result=>ids(result).slice(0,3).join("|"))).size>1,"Matching recipes also take turns");

// Main protein: a current-meal group. Every declared protein ingredient in the
// collection belongs to exactly one independently listed group, so no recipe
// is unreachable and none matches by accident.
const groupOf=foodId=>Object.entries(proteinGroupSources).filter(([,ids])=>ids.includes(foodId)).map(([group])=>group);
for(const recipe of standardizedRecipes){
  const declared=recipe.ingredients.filter(item=>item.role==="protein"&&item.grams>0);
  assert(declared.length>0,`${recipe.mealId} declares a protein ingredient`);
  for(const item of declared) assert.equal(groupOf(item.foodId).length,1,`${item.foodId} in ${recipe.mealId} belongs to exactly one main-protein group`);
}
const noProtein=run();
assert(noProtein.eligibleRecipes.every(item=>!row(item.score,"protein").active&&row(item.score,"protein").points===0),"No main protein selected earns nothing");
for(const group of Object.keys(proteinGroupSources)){
  const proteinContext=context({preferredProtein:group}), result=run(profile(),proteinContext);
  const expectedMatch=recipe=>independentMainProteinGroups(recipe,sourceFoods).includes(group);
  assert.equal(result.eligibleRecipes.length,standardizedRecipes.length,"Main protein is a flexible preference and excludes nothing");
  for(const item of result.eligibleRecipes){
    const proteinRow=row(item.score,"protein");
    assert.equal(proteinRow.scope,"current");
    assert.equal(proteinRow.matched,expectedMatch(item.recipe),`${item.recipe.mealId} ${group} match follows the group that provides the most protein`);
    assert.equal(proteinRow.points,expectedMatch(item.recipe)?2:0);
    assert.equal(item.score.currentPreference.possible,2);
  }
  const matches=result.eligibleRecipes.filter(item=>expectedMatch(item.recipe)).length;
  assert(matches>=3,`${group} has at least three matching recipes`);
  assert(result.recommendations.every(item=>expectedMatch(item.recipe)),`Available ${group} recipes lead when selected`);
  assert(result.recommendations.every(item=>item.matchedPreferenceReasons.some(reason=>reason.startsWith("Matches your selected main protein"))));
  assert.deepEqual(result.eligibleRecipes.map(item=>independentRecipeRanking(item.recipe,sourceFoods,profile(),proteinContext).tier),
    standardizedRecipes.map(recipe=>independentRecipeRanking(recipe,sourceFoods,profile(),proteinContext).tier).sort(compareIndependentTiers),`${group} order matches the independent ranking`);
  assert.deepEqual(ids(result),ids(run(profile(),proteinContext)));
}
// A smaller second protein does not make a recipe a match for its group.
const byLabel=start=>standardizedRecipes.find(recipe=>recipe.label.en.startsWith(start));
const matchedFor=(recipe,group)=>row(run(profile(),context({preferredProtein:group})).eligibleRecipes.find(item=>item.recipe===recipe).score,"protein").matched;
for(const [start,main,minor] of [
  ["Roast lamb rice bowl with cucumber, parsley and yogurt","red-meat","dairy"],
  ["Beef, boiled egg and mixed-vegetable rice bowl","red-meat","egg"],
  ["Chicken, black bean and sweetcorn rice bowl","poultry","beans"],
  ["Baked salmon and chickpeas with zucchini and red pepper","seafood","beans"],
]){
  const recipe=byLabel(start);
  assert(recipe,`${start} is in the collection`);
  assert.equal(matchedFor(recipe,main),true,`${start} matches its main protein`);
  assert.equal(matchedFor(recipe,minor),false,`${start} does not match the protein it has less of`);
}
for(const recipe of standardizedRecipes) assert.equal(independentMainProteinGroups(recipe,sourceFoods).length,1,`${recipe.mealId} has exactly one main protein group`);
// Hunger suggests a portion; with "Large portions" kept out it must not suggest the large one.
const hungryAvoidingLarge=run(profile({avoidTags:["Large portions"]}),context({hunger:"hungry"}));
assert.equal(hungryAvoidingLarge.eligibleRecipes.length,standardizedRecipes.length,"Hunger with large portions kept out still offers every recipe");
assert(hungryAvoidingLarge.eligibleRecipes.every(item=>item.portion==="regular"&&item.trace.portionBasis==="standard"));
assert(run(profile(),context({hunger:"hungry"})).eligibleRecipes.every(item=>item.portion==="large"),"Hunger still suggests the large portion otherwise");
assert.equal(run(profile({avoidTags:["Large portions"]}),context({appetite:"large"})).eligibleRecipes.length,0,"An explicitly chosen large portion stays excluded by the avoid");
// Every offered time limit must exclude something and leave something.
for(const minutes of [5,10]){
  const limited=run(profile(),context({maxPrepMinutes:minutes})).eligibleRecipes.length;
  assert(limited>0&&limited<standardizedRecipes.length,`A ${minutes}-minute limit filters some recipes and keeps some`);
}
assert(standardizedRecipes.every(recipe=>recipe.prepMinutes<=15),"No recipe exceeds 15 minutes, so longer limits are not offered");
// Combined with a staple, both current groups must match to lead.
const poultryNoodles=run(profile(),context({preferredProtein:"poultry",preferredStaple:"noodles"}));
assert(poultryNoodles.recommendations.every(item=>item.score.currentPreference.points===4&&item.recipe.staple==="noodles"));
assert(poultryNoodles.eligibleRecipes.some(item=>item.score.currentPreference.points===2),"Partial matches remain as lower alternatives");
// A current main protein outranks a conflicting saved style, as other current groups do.
const savedBowlButSeafood=run(profile({preferenceTags:["Wraps / sandwiches"]}),context({preferredProtein:"seafood"}));
assert(savedBowlButSeafood.recommendations.every(item=>row(item.score,"protein").matched));
assert.equal(normalizeMealContext({preferredProtein:"not-a-group"}).preferredProtein,"any","Unknown stored values fall back to no selection");
assert.equal(normalizeMealContext({}).preferredProtein,"any");
// Unmatched selections are stated, never hidden.
const eggMismatch=run(profile(),context({preferredProtein:"egg"})).eligibleRecipes.find(item=>!row(item.score,"protein").matched);
assert(eggMismatch.mismatchReasons.some(reason=>reason.includes("Does not match your selected main protein")));
const zhProtein=recommendPilotMeals(profile(),context({preferredProtein:"seafood"}),"zh",now,today,state.days);
assert(zhProtein.recommendations[0].matchedPreferenceReasons.some(reason=>reason.includes("符合本餐選擇的主菜：魚或海鮮")));

console.log(JSON.stringify({mainProteinGroupsCoverEveryRecipe:true,mainProteinLeadsWhenSelected:true,nutritionLevelsBoundRotation:true,sameWindowReproducible:true,everyHigherLevelRecipeTakesATurn:true,preferenceFirstStaples:true,currentOutranksSaved:true,savedOutranksNutrition:true,partialAndUnsupportedDisclosed:true,assemblyReadinessEnforced:true,deterministic:true,physicalNutritionAndOfficialModelUnchanged:true},null,2));
