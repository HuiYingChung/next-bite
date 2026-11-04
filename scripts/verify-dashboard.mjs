import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

// Exercise the real TSX exports with the repository's existing TypeScript and
// React packages. No generated fixtures, browser, network, or child process.
const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const modules = new Map();
function loadSource(relativePath) {
  const absolutePath = path.resolve(projectRoot, relativePath);
  if (modules.has(absolutePath)) return modules.get(absolutePath).exports;
  const module = { exports: {} };
  modules.set(absolutePath, module);
  const { outputText } = ts.transpileModule(
    fs.readFileSync(absolutePath, "utf8"),
    {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
      },
    },
  );
  const localRequire = (specifier) => {
    if (specifier === "react/jsx-runtime") return require(specifier);
    assert.ok(
      specifier.startsWith("."),
      `Unexpected runtime dependency: ${specifier}`,
    );
    const target = path.resolve(path.dirname(absolutePath), specifier);
    const file = [target, `${target}.ts`, `${target}.tsx`].find(
      (candidate) =>
        fs.existsSync(candidate) && fs.statSync(candidate).isFile(),
    );
    assert.ok(file, `Source module not found: ${specifier}`);
    return loadSource(file);
  };
  new Function("require", "module", "exports", outputText)(
    localRequire,
    module,
    module.exports,
  );
  return module.exports;
}

function elements(node, predicate, result = []) {
  if (!node || typeof node !== "object") return result;
  if (predicate(node)) result.push(node);
  for (const child of [node.props?.children].flat(Infinity))
    elements(child, predicate, result);
  return result;
}
const content = (node) => {
  if (Array.isArray(node)) return node.map(content).join("");
  if (typeof node === "string" || typeof node === "number") return String(node);
  return node && typeof node === "object" ? content(node.props?.children) : "";
};
const hasClass = (node, name) =>
  typeof node.props?.className === "string" &&
  node.props.className.split(" ").includes(name);
const close = (actual, expected, message) =>
  assert.ok(
    Math.abs(actual - expected) < 1e-8,
    `${message}: ${actual} versus ${expected}`,
  );

const { HistoryGrid, ScoreContributions } = loadSource(
  "src/DashboardInsights.tsx",
);
const { createBlankState, createEmptyMeal, mealNames, recommendationDataset } =
  loadSource("src/data.ts");
const { scoreMealOption, scoreRecommendations, summarizeTodayIntake } =
  loadSource("src/logic.ts");
const now = new Date(2026, 10, 3, 12);
const state = createBlankState(now);
const component = (name) => ({
  name,
  group: "other",
  confidence: "limited",
  amount: {
    quantity: null,
    unit: "unspecified",
    qualifier: "unspecified",
    originalText: null,
  },
});
state.days[1].todayLog.Lunch.protein = ["Tofu"];
state.days[3].todayLog.Dinner.componentDetails = [
  component("Sandwich with unknown filling"),
];
state.days[5].todayLog.Breakfast.componentDetails = [
  component("Mixed meal sources: Home-cooked + Takeout. Review source."),
  component("Mixed preparation: Boiled + Fried. Review preparation."),
  component("Combined portions: Small + Large. Review overall portion."),
];
const originalDays = JSON.stringify(state.days);
const dates = state.days.map((day) => day.id);
assert.equal(dates.length, 7);
assert.deepEqual(mealNames, [
  "Breakfast",
  "Lunch",
  "Dinner",
  "Snacks / Drinks",
]);

let callbacksChecked = 0;
for (const locale of ["en", "zh"]) {
  const selected = [];
  const tree = HistoryGrid({
    days: [...state.days].reverse(),
    locale,
    onSelect: (day, slot) => selected.push({ day, slot }),
  });
  const html = renderToStaticMarkup(tree);
  const buttons = elements(tree, (node) => node.type === "button");
  assert.equal(
    buttons.length,
    28,
    "Seven days and four slots must have 28 selectable cells.",
  );
  assert.equal(
    new Set(buttons.map((button) => button.props["aria-label"])).size,
    28,
    "Each dated meal slot needs a distinct accessible name.",
  );
  assert.equal(
    elements(tree, (node) => node.type === "th" && node.props.scope === "col")
      .length,
    8,
  );
  assert.equal(
    elements(tree, (node) => node.type === "th" && node.props.scope === "row")
      .length,
    4,
  );
  assert.equal(elements(tree, (node) => node.type === "caption").length, 1);
  assert.deepEqual(
    elements(tree, (node) => node.type === "time").map(
      (node) => node.props.dateTime,
    ),
    dates,
    "Date columns must be chronological even when supplied in reverse order.",
  );
  const slotNames =
    locale === "en"
      ? ["Breakfast", "Lunch", "Dinner", "Snacks / Drinks"]
      : ["早餐", "午餐", "晚餐", "點心／飲料"];
  const recorded = locale === "en" ? "Recorded" : "有紀錄";
  const unknown = locale === "en" ? "Unknown" : "未知";
  let recordedCount = 0;
  for (let slotIndex = 0; slotIndex < 4; slotIndex += 1) {
    for (let dateIndex = 0; dateIndex < 7; dateIndex += 1) {
      const button = buttons[slotIndex * 7 + dateIndex];
      const expectedRecorded =
        (slotIndex === 1 && dateIndex === 1) ||
        (slotIndex === 2 && dateIndex === 3);
      if (expectedRecorded) recordedCount += 1;
      assert.equal(
        hasClass(button, "is-recorded"),
        expectedRecorded,
        "Named foods count as recorded; generated context notes do not.",
      );
      assert.equal(hasClass(button, "is-unknown"), !expectedRecorded);
      assert.ok(
        content(button).includes(expectedRecorded ? recorded : unknown),
      );
      const accessibleName = button.props["aria-label"];
      const [year, month, day] = dates[dateIndex].split("-").map(Number);
      if (locale === "en") {
        assert.ok(
          accessibleName.includes(month === 10 ? "October" : "November"),
        );
        assert.ok(new RegExp(`\\b${day}\\b`).test(accessibleName));
        assert.ok(accessibleName.includes(String(year)));
      } else {
        assert.ok(accessibleName.includes(`${year}年${month}月${day}日`));
      }
      assert.ok(
        button.props["aria-label"].includes(
          `${slotNames[slotIndex]} · ${expectedRecorded ? recorded : unknown}`,
        ),
        "Each accessible name must identify the localized slot and record status.",
      );
      button.props.onClick();
      assert.strictEqual(
        selected.at(-1).day,
        state.days[dateIndex],
        "Selection must return the exact source day.",
      );
      assert.equal(
        selected.at(-1).slot,
        mealNames[slotIndex],
        "Selection must return the exact slot.",
      );
      callbacksChecked += 1;
    }
  }
  assert.equal(recordedCount, 2);
  assert.ok(
    html.includes(
      locale === "en"
        ? "An unknown slot does not mean you skipped a meal."
        : "未知不代表你沒有吃這餐",
    ),
  );
  const legend = elements(tree, (node) => node.type === "ul")[0];
  assert.ok(
    content(legend).includes(recorded) && content(legend).includes(unknown),
    "Both statuses need a textual legend.",
  );
}
assert.equal(
  JSON.stringify(state.days),
  originalDays,
  "Rendering and selection must not mutate history.",
);

const log = Object.fromEntries(
  mealNames.map((slot) => [slot, createEmptyMeal()]),
);
for (const slot of ["Breakfast", "Lunch", "Dinner"]) {
  log[slot] = { ...createEmptyMeal(), carbs: ["Rice"], protein: ["Chicken"] };
}
let contributionRowsChecked = 0;
for (const locale of ["en", "zh"]) {
  const rec = scoreMealOption(
    summarizeTodayIntake(log),
    log,
    state.days,
    state.profile,
    recommendationDataset[0],
    "dinner",
    locale,
  );
  assert.ok(rec.scoreBreakdown.some((item) => item.points > 0));
  assert.ok(rec.scoreBreakdown.some((item) => item.points < 0));
  assert.ok(rec.scoreBreakdown.some((item) => item.points === 0));
  const trace = scoreRecommendations(
    state.profile,
    log,
    state.days,
    locale,
    now,
  )[0].selectionTrace;
  const withOtherTotals = {
    ...rec,
    score: 987654321,
    selectionTrace: {
      ...trace,
      perspectiveScore: 876543210,
      selectionScore: 765432109,
    },
  };
  const tree = ScoreContributions({ rec: withOtherTotals, locale });
  const html = renderToStaticMarkup(tree);
  const rows = elements(tree, (node) => node.type === "li");
  assert.equal(
    rows.length,
    rec.scoreBreakdown.length,
    "Every row must come from this meal's rule breakdown.",
  );
  assert.deepEqual(
    rows.map((row) => content(elements(row, (node) => node.type === "p")[0])),
    rec.scoreBreakdown.map((item) => item.note),
    "The actual localized engine explanations must survive rendering unchanged.",
  );
  const bars = elements(tree, (node) => hasClass(node, "contribution-bar"));
  assert.equal(bars.length, rows.length);
  for (let index = 0; index < rows.length; index += 1) {
    const points = rec.scoreBreakdown[index].points;
    const bar = bars[index];
    const direction =
      points < 0 ? "negative" : points > 0 ? "positive" : "neutral";
    assert.ok(hasClass(rows[index], direction) && hasClass(bar, direction));
    const number = elements(rows[index], (node) =>
      hasClass(node, "contribution-points"),
    )[0];
    assert.ok(
      content(number).startsWith(
        `${points < 0 ? "−" : points > 0 ? "+" : ""}${Math.abs(points)}`,
      ),
      "Points must retain their actual sign and value as text.",
    );
    const width = parseFloat(bar.props.style.width);
    const left = parseFloat(bar.props.style.left);
    assert.ok(Number.isFinite(width) && width >= 0 && width <= 50);
    close(
      points < 0 ? left + width : left,
      50,
      "Signed bars must grow from the same zero baseline",
    );
    if (points === 0)
      close(width, 0, "A zero-point rule must have no visible magnitude");
    contributionRowsChecked += 1;
  }
  const nonzero = rec.scoreBreakdown
    .map((item, index) => ({
      points: item.points,
      width: parseFloat(bars[index].props.style.width),
    }))
    .filter((item) => item.points !== 0);
  for (const item of nonzero.slice(1))
    close(
      item.width / nonzero[0].width,
      Math.abs(item.points / nonzero[0].points),
      "Bar lengths must preserve relative point magnitudes",
    );
  assert.ok(
    html.includes(
      locale === "en"
        ? "not a nutrition or health score"
        : "不是營養或健康分數",
    ),
  );
  for (const sentinel of ["987654321", "876543210", "765432109"])
    assert.ok(
      !html.includes(sentinel),
      "Other totals must not be mixed into the contribution chart.",
    );
  const zeros = ScoreContributions({
    rec: {
      ...rec,
      scoreBreakdown: rec.scoreBreakdown.map((item) => ({
        ...item,
        points: 0,
      })),
    },
    locale,
  });
  assert.ok(
    elements(zeros, (node) => hasClass(node, "contribution-bar")).every(
      (bar) =>
        hasClass(bar, "neutral") &&
        bar.props.style.width === "0%" &&
        bar.props.style.left === "50%",
    ),
    "An all-zero breakdown must stay finite and neutral.",
  );
}

console.log(
  JSON.stringify(
    {
      languages: ["en", "zh"],
      chronologicalHistorySlotsPerLanguage: 28,
      exactSelectionCallbacks: callbacksChecked,
      namedOtherRecorded: true,
      metadataOnlyUnknown: true,
      historyUnchanged: true,
      actualRuleContributionRows: contributionRowsChecked,
      signedBarsAndAllZeroState: true,
      localizedEngineNotesPreserved: true,
      perspectiveTotalsExcluded: true,
    },
    null,
    2,
  ),
);
