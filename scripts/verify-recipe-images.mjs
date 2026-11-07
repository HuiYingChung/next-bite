import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const metadata = JSON.parse(await readFile(resolve(root, 'docs/recipe-images/manifest.json'), 'utf8'));
const source = await readFile(resolve(root, 'src/nutrition-data.ts'), 'utf8');
const recipes = JSON.parse(source.split('export const standardizedRecipes: StandardizedRecipe[] = ')[1].trim().replace(/;$/, ''));
const bundled = await build({ entryPoints: [resolve(root, 'src/recipe-images.ts')], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const { getRecipeImage } = await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const ids = new Set(metadata.assets.map(asset => asset.mealId));
assert.equal(ids.size, recipes.length, 'Every current recipe needs its own image');
assert.equal(metadata.assets.length, ids.size, 'Image recipe IDs must be unique');
const thumbnailHashes = new Set();
let bytes = 0;

function webpSize(buffer) {
  for (let offset = 12; offset + 8 <= buffer.length;) {
    const tag = buffer.toString('ascii', offset, offset + 4);
    const length = buffer.readUInt32LE(offset + 4);
    const data = offset + 8;
    if (tag === 'VP8 ') return { width: buffer.readUInt16LE(data + 6) & 0x3fff, height: buffer.readUInt16LE(data + 8) & 0x3fff };
    if (tag === 'VP8X') return { width: buffer.readUIntLE(data + 4, 3) + 1, height: buffer.readUIntLE(data + 7, 3) + 1 };
    if (tag === 'VP8L') {
      const dimensions = buffer.readUInt32LE(data + 1);
      return { width: (dimensions & 0x3fff) + 1, height: ((dimensions >>> 14) & 0x3fff) + 1 };
    }
    offset = data + length + (length % 2);
  }
  throw new Error('Missing WebP image data');
}

for (const recipe of recipes) {
  const image = getRecipeImage(recipe);
  const record = metadata.assets.find(asset => asset.mealId === recipe.mealId);
  assert(image, 'Missing current-version image: ' + recipe.mealId);
  assert(record, 'Missing provenance: ' + recipe.mealId);
  assert.equal(record.recipeVersion, recipe.version, 'Provenance must pin the illustrated recipe version');
  for (const locale of ['en', 'zh']) assert(image.alt[locale]?.trim().length > 4, 'Missing descriptive alt: ' + recipe.mealId);
  assert.equal(getRecipeImage({mealId:recipe.mealId,version:recipe.version + '-changed'}), undefined, 'Changed recipes must not borrow a stale image');
  assert.equal(record.variants.length, 2, 'Both responsive variants required');
  assert.equal('/' + record.variants.find(v=>v.width===480)?.file.replace(/^public\//,''), image.src);
  for (const width of [480, 960]) {
    const variant = record.variants.find(v => v.width === width);
    assert(variant, 'Missing image variant: ' + recipe.mealId);
    const path = resolve(root, variant.file);
    assert(path.startsWith(resolve(root, 'public/images/recipes') + sep), 'Asset must stay inside recipe image directory');
    const buffer = await readFile(path);
    assert.equal(buffer.toString('ascii', 0, 4), 'RIFF');
    assert.equal(buffer.toString('ascii', 8, 12), 'WEBP');
    assert.deepEqual(webpSize(buffer), {width:variant.width,height:variant.height}, 'Encoded image dimensions must match metadata');
    assert.equal(buffer.length, variant.bytes);
    assert.equal(createHash('sha256').update(buffer).digest('hex'), variant.sha256, 'Asset differs from provenance: ' + variant.file);
    assert.equal(variant.height * 4, width * 3);
    assert(image.srcSet.includes('/' + variant.file.replace(/^public\//,'') + ' ' + width + 'w'));
    if (width === 480) thumbnailHashes.add(variant.sha256);
    bytes += buffer.length;
  }
}
assert.equal(thumbnailHashes.size, recipes.length, 'Each recipe must have its own generated image');
assert.equal(getRecipeImage(null), undefined);
assert.equal(getRecipeImage({mealId:'unknown',version:'unknown'}), undefined);
console.log(JSON.stringify({recipes:recipes.length, responsiveAssets:recipes.length*2, uniqueImages:thumbnailHashes.size, bytes, currentVersionCoverage:'complete', staleVersionFallback:'passed'}, null, 2));
