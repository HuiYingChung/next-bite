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
const { calculateRecipe, calculateRecipeProfile, calculateScoreForRecipe, recommendPilotMeals, getRecipeHardAvoidConflicts } = loadSource("src/nutrition.ts");
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
// Known nonzero free-sugar sources must retain the actual archived values.
// Unsweetened soy milk remains a drink ingredient under the published rule;
// the other dairy ingredient's intrinsic lactose is treated separately.
for (const [id, expected] of [["usda-169640", 82.12], ["usda-167747", 2.52], ["usda-173768", .41], ["usda-170932",10.34], ["usda-171325",2.43]]) {
  assert.equal(sourceFoods.find(food => food.id === id)?.modelBasis.freeSugarsPer100g, expected, `${id} keeps its independently checked nonzero free-sugar input`);
}
assert.equal(sourceFoods.find(food => food.id === "usda-172182").modelBasis.freeSugarsPer100g, 0, "Specified unsweetened cottage cheese excludes intrinsic dairy lactose from free sugars");
assert.equal(sourceFoods.find(food => food.id === "usda-169980").modelBasis.freeSugarsPer100g, 0, "Plain napa cabbage uses a declared formulation rule rather than pretending its missing source total sugar was measured zero");
for(const id of ["usda-174271","usda-168426","usda-169229","usda-169989","usda-170058","usda-170397","usda-170420"]){
  const food=sourceFoods.find(item=>item.id===id);
  assert.equal(food.state,"cooked",`${id} uses its actual boiled edible source weight`);
  assert.equal(food.modelBasis.fvnsEligible,true,`${id} is an intact qualifying bean or vegetable`);
  assert.equal(food.modelBasis.freeSugarsPer100g,0,`${id} preserves intrinsic sugars outside the free-sugar definition`);
}
for(const id of ["usda-170932","usda-171325"]){
  const powderSource=sourceFoods.find(food=>food.id===id);
  assert.equal(powderSource.state,"ready-to-eat",`${id} uses the weighed spice input without an invented fresh-to-dried yield`);
  assert.equal(powderSource.modelBasis.fvnsEligible,false,`${id} uses the explicit powder exclusion, not intact-plant FVNS credit`);
}
for (const [id, state] of [["usda-171705", "raw"], ["usda-169999", "cooked"], ["usda-169141", "cooked"], ["usda-168394", "cooked"], ["usda-170416", "raw"], ["usda-170005", "raw"], ["usda-170152", "cooked"], ["usda-173928", "cooked"], ["usda-167762", "raw"], ["usda-168437", "cooked"], ["usda-169230", "raw"]]) {
  const food = sourceFoods.find(item => item.id === id);
  assert.equal(food?.state, state, `${id} preserves its reviewed edible preparation state`);
  assert.equal(food.modelBasis.fvnsEligible, true, `${id} is a reviewed qualifying plant ingredient`);
  assert.equal(food.modelBasis.freeSugarsPer100g, 0, `${id} uses the explicit plain-food formulation rule for intrinsic sugars`);
}
for (const id of ["usda-171534", "usda-171986", "usda-174314"]) {
  const food = sourceFoods.find(item => item.id === id);
  assert.equal(food.modelBasis.fvnsEligible, false, `${id} is the specified plain animal protein, without a qualifying plant ingredient`);
  assert.equal(food.modelBasis.freeSugarsPer100g, 0, `${id} retains the source-supported zero-sugar input`);
}
// Recalculate all 108 totals independently from source weights and threshold
// literals, so a sorted-looking but incorrect top3 cannot pass this test.
function independent(recipe, selectedProfile, selectedContext) {
  const grams = recipe.ingredients.reduce((sum,item)=>sum+item.grams,0);
  const weighted = read => recipe.ingredients.reduce((sum,item)=>sum+item.grams*read(sourceFoods.find(food=>food.id===item.foodId),item),0)/grams;
  const values = { energyKj:weighted(food=>food.nutrientsPer100g.energyKj), saturatedFat:weighted(food=>food.nutrientsPer100g.saturatedFat), freeSugars:weighted((food,item)=>item.processing==="pureed"?4.8:food.modelBasis.freeSugarsPer100g), salt:weighted(food=>food.nutrientsPer100g.sodium*.0025), protein:weighted(food=>food.nutrientsPer100g.protein), fiber:weighted(food=>food.nutrientsPer100g.fiber), fvnsPercent:weighted(food=>food.modelBasis.fvnsEligible?100:0) };
  const points = key => { const count=thresholds[key].filter(t=>values[key]>t).length; return key==="fvnsPercent"?[0,1,2,5][count]:count; };
  const a=points("energyKj")+points("saturatedFat")+points("freeSugars")+points("salt");
  const c=points("fiber")+points("fvnsPercent")+((a<11||points("fvnsPercent")===5)?points("protein"):0);
  // Neutral profile and selected-staple/cuisine cases avoid reusing style or
  // preference helper code when independently validating the full ranking.
  const p=(selectedContext.preferredStaple!=="any"&&recipe.staple===selectedContext.preferredStaple?2:0)+(selectedContext.cuisine!=="any"&&recipe.cuisine===selectedContext.cuisine?2:0);
  return { total:10-a+c+p, raw:a-c, values };
}
// Independently checked FDC173757 reports4.8g total sugars/100g. UK NPM
// worked example8 counts puréed chickpea sugars as free sugars, while the
// retained whole-chickpea formulation remains0. Keep physical nutrients and
// FVNS identical so this cannot turn into a general score override.
const chickpea = sourceFoods.find(food=>food.id==="usda-173757");
const retainedChickpea = clone(chickpea);
const processedRecipes = standardizedRecipes.filter(recipe=>recipe.ingredients.some(item=>item.processing!==undefined));
assert.deepEqual(processedRecipes.map(recipe=>recipe.mealId).sort(),["falafel-salad-rice","hummus-chicken-wrap-fruit"],"Only the two explicitly reviewed hummus formulations apply chickpea processing");
for(const recipe of processedRecipes) for(const ingredient of recipe.ingredients.filter(item=>item.processing!==undefined)){
  assert.equal(ingredient.foodId,"usda-173757");
  assert.equal(ingredient.processing,"pureed");
  assert.equal(ingredient.preparationModelBasis.freeSugarsPer100g,4.8);
  for(const portion of ["small","regular","large"]){
    const displayed=calculateRecipe(recipe,portion).ingredientAmounts.find(item=>item.foodId===ingredient.foodId);
    assert(Math.abs(displayed.preparationFreeSugarsGrams-ingredient.grams*recipe.portions[portion]*4.8/100)<.00011,"Selected portion displays the independently derived preparation free sugars");
  }
}
const pureeIngredient = {foodId:chickpea.id,grams:100,weighedState:"cooked",group:"protein",role:"protein",processing:"pureed",preparationModelBasis:{
  freeSugarBasis:"reported-total-sugars-as-free",freeSugarsPer100g:4.8,
  note:{en:"Puréed chickpea sugars use the archived total-sugar value.",zh:"鷹嘴豆泥的游離糖採用封存來源總糖值。"},
  sourceUrls:[chickpea.recordUrl,"https://www.gov.uk/government/publications/nutrient-profiling-model-2018/nutrient-profiling-model-2018-worked-examples-and-further-advice-on-calculations"],
}};
const pureeRecipe = {...clone(standardizedRecipes[0]),ingredients:[pureeIngredient,{foodId:"usda-173647",grams:100,weighedState:"ready-to-eat",group:"other",role:"liquid"}],seasoning:{oilGrams:0,saltGrams:0,sauceGrams:0}};
const wholeRecipe = clone(pureeRecipe);
delete wholeRecipe.ingredients[0].processing;
delete wholeRecipe.ingredients[0].preparationModelBasis;
const wholeModel = calculateRecipeProfile(wholeRecipe), pureeModel = calculateRecipeProfile(pureeRecipe);
assert.equal(chickpea.modelBasis.freeSugarsPer100g,0);
assert.equal(wholeModel.inputs.freeSugars,0);
assert.equal(pureeModel.inputs.freeSugars,2.4,"100g chickpeas plus100g water independently yields2.4g free sugars/100g");
assert.equal(pureeModel.points.a.freeSugars,2);
assert.deepEqual({...pureeModel.inputs,freeSugars:0},wholeModel.inputs,"Processing changes only the reviewed free-sugar input");
for(const [portion,expected] of [["small",3.6],["regular",4.8],["large",6]]){
  const calculated=calculateRecipe(pureeRecipe,portion);
  assert.equal(calculated.ingredientAmounts[0].preparationFreeSugarsGrams,expected);
  assert.deepEqual(calculated.nutrition,calculateRecipe(wholeRecipe,portion).nutrition,"Puréed preparation does not change the source nutrient sum");
  assert(!("preparationFreeSugarsGrams" in calculateRecipe(wholeRecipe,portion).ingredientAmounts[0]),"Older unprocessed ingredient output shape remains unchanged");
}
for(const locale of ["en","zh"]){
  const scored=calculateScoreForRecipe(pureeRecipe,profile(),context(),locale);
  assert.equal(scored.inputBasis[0].note,pureeIngredient.preparationModelBasis.note[locale]);
  assert.deepEqual(scored.inputBasis[0].sourceUrls,pureeIngredient.preparationModelBasis.sourceUrls);
}
for(const change of [
  item=>{delete item.preparationModelBasis;},
  item=>{delete item.processing;},
  item=>{item.processing="unreviewed";},
  item=>{item.foodId="usda-171477";},
  item=>{item.weighedState="raw";},
  ...[null,NaN,-1,101].map(value=>item=>{item.preparationModelBasis.freeSugarsPer100g=value;}),
  item=>{item.preparationModelBasis.freeSugarBasis="unresolved";},
  item=>{item.preparationModelBasis.note.en="";},
  item=>{item.preparationModelBasis.note.en=42;},
  item=>{item.preparationModelBasis.sourceUrls=[];},
  item=>{item.preparationModelBasis.sourceUrls=["http://unreviewed.example"];},
]){
  const invalid=clone(pureeRecipe);change(invalid.ingredients[0]);
  assert.equal(calculateRecipeProfile(invalid).status,"incomplete","Unsupported or missing preparation evidence must fail closed");
  assert.equal(calculateScoreForRecipe(invalid,profile(),context()),null);
  assert.equal(calculateRecipe(invalid,"regular").ingredientAmounts[0].preparationFreeSugarsGrams,null,"Invalid preparation never falls back to the whole-food zero");
}
const retainedFirstRecipe=standardizedRecipes[0];
try{
  const invalid=clone(pureeRecipe);delete invalid.ingredients[0].preparationModelBasis;
  standardizedRecipes[0]=invalid;
  const result=recommendPilotMeals(profile(),context(),"en",now,log);
  assert(!result.eligibleRecipes.some(item=>item.recipe.mealId===invalid.mealId));
  assert(result.trace.exclusions.some(item=>item.mealId===invalid.mealId&&item.stage==="evidence"&&item.reasons.includes("model-input:freeSugars")),"A flagged recipe without preparation evidence cannot enter the selectable collection");
}finally{standardizedRecipes[0]=retainedFirstRecipe;}
assert.deepEqual(chickpea,retainedChickpea,"Recipe-specific processing never mutates the shared whole-food source");
for (const selectedContext of [context(),context({preferredStaple:"rice"}),context({preferredStaple:"noodles"}),context({preferredStaple:"bread"}),context({cuisine:"western"}),context({preferredStaple:"potato",cuisine:"western"})]) {
  const result = recommendPilotMeals(profile(),selectedContext,"en",now,log);
  assert.equal(result.candidateCount,108);
  assert.equal(result.trace.candidateScores.length,108);
  assert.equal(result.eligibleRecipes.length,108);
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
  assert.deepEqual(result.eligibleRecipes.map(item=>item.score.total),independentTotals.map(row=>row.total).sort((a,b)=>b-a),"The full browsable collection preserves the same score ordering");
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
const retainedSoy=sourceFoods.find(food=>food.id==="usda-173768");
assert.equal(retainedSoy.modelBasis.fvnsEligible,null,"Unknown qualifying bean content in the retained soy drink is not silently counted as zero");
const recipeWithUnresolvedSoy={...basicRecipe,ingredients:[...basicRecipe.ingredients,{foodId:retainedSoy.id,grams:100,weighedState:"ready-to-eat",group:"drink",role:"liquid"}]};
assert.equal(calculateRecipeProfile(recipeWithUnresolvedSoy).status,"incomplete");
assert(calculateRecipeProfile(recipeWithUnresolvedSoy).missing.includes("fvnsPercent"));
assert.equal(calculateScoreForRecipe(recipeWithUnresolvedSoy,profile(),context()),null,"Known free sugars do not compensate for unresolved FVNS");
assert(getRecipeHardAvoidConflicts(profile({avoidTags:["Soy"]}),recipeWithUnresolvedSoy,"regular").some(conflict=>conflict.tag==="Soy"&&conflict.certainty==="contains"));
const basicIndex=standardizedRecipes.indexOf(basicRecipe);
try {
  standardizedRecipes[basicIndex]=recipeWithUnresolvedSoy;
  const incomplete=recommendPilotMeals(profile(),context(),"en",now,log);
  assert(!incomplete.eligibleRecipes.some(item=>item.recipe.mealId===basicRecipe.mealId));
  assert(incomplete.trace.exclusions.some(item=>item.mealId===basicRecipe.mealId&&item.stage==="evidence"&&item.reasons.includes("model-input:fvnsPercent")),"A recipe using unresolved soy evidence cannot enter either recommendations or the selectable collection");
} finally { standardizedRecipes[basicIndex]=basicRecipe; }
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
console.log(JSON.stringify({strictBoundaryChecks:boundaryChecks,officialWorkedExamples:3,fullAProteinGate:true,unknownAndInvalidInputs:true,mixedFvnsStateRejected:true,independentAll108Totals:true,actualTop3:true,completeBrowsableOrder:true,energyCountedOnce:true,preferenceBound10:true,scaleInvariance:true,hardExclusions:true,unsetVsUnmatched:true},null,2));
