import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceDirectory = 'output/imagegen/mealhatch-food-v1'
const destinationDirectory = 'public/images/recipes'
const quality = 0.84
const sizes = [
  { width: 480, height: 360 },
  { width: 960, height: 720 },
]
const hash = (buffer) => createHash('sha256').update(buffer).digest('hex')
const originalManifest = JSON.parse(await readFile(resolve(root, sourceDirectory, 'generation-manifest.json'), 'utf8'))
// The manifest is the explicit asset list. Never scan unrelated generated files.
const approvedAssets = originalManifest.assets
if (new Set(approvedAssets.map(asset => asset.mealId)).size !== approvedAssets.length) throw new Error('Duplicate image recipe IDs')
if (new Set(approvedAssets.map(asset => asset.file.replace(/-v\d+\.png$/, ''))).size !== approvedAssets.length) throw new Error('Duplicate image output basenames')
for (const asset of approvedAssets) {
  if (!/^[a-z0-9-]+-v\d+\.png$/.test(asset.file) || !asset.recipeVersion || !asset.alt?.en || !asset.alt?.zh) {
    throw new Error(`Incomplete image provenance: ${asset.mealId}`)
  }
}
let previousManifest
try {
  previousManifest = JSON.parse(await readFile(resolve(root, 'docs/recipe-images/manifest.json'), 'utf8'))
} catch (error) {
  if (error.code !== 'ENOENT') throw error
}
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
})

try {
  await mkdir(resolve(root, destinationDirectory), { recursive: true })
  await mkdir(resolve(root, 'docs/recipe-images'), { recursive: true })
  const page = await browser.newPage()
  const assets = []

  for (const source of approvedAssets) {
    const { mealId, file: filename } = source
    const prefix = filename.replace(/-v\d+\.png$/, '')
    const input = await readFile(resolve(root, sourceDirectory, filename))
    if (!input.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
      throw new Error(`Source must be a PNG: ${filename}`)
    }
    const sourceWidth = input.readUInt32BE(16)
    const sourceHeight = input.readUInt32BE(20)
    if (sourceWidth * 3 !== sourceHeight * 4) {
      throw new Error(`Source must retain a 4:3 composition: ${filename}`)
    }
    const variants = []
    for (const size of sizes) {
      const path = `${destinationDirectory}/${prefix}-${size.width}.webp`
      const previousAsset = previousManifest?.assets.find(asset => asset.mealId === mealId)
      const previousVariant = previousAsset?.variants.find(variant => variant.file === path)
      if (previousAsset?.source.sha256 === hash(input) && previousManifest.preparation.quality === quality && previousVariant?.width === size.width && previousVariant?.height === size.height) {
        try {
          const existing = await readFile(resolve(root, path))
          if (hash(existing) === previousVariant.sha256) {
            variants.push({ ...previousVariant, encoder: previousVariant.encoder || {
              browserChannel: previousManifest.preparation.browserChannel,
              browserVersion: previousManifest.preparation.browserVersion,
              quality: previousManifest.preparation.quality,
            } })
            continue
          }
        } catch (error) {
          if (error.code !== 'ENOENT') throw error
        }
      }
      const dataUrl = await page.evaluate(async ({ inputUrl, width, height, quality }) => {
        const image = new Image()
        image.src = inputUrl
        await image.decode()
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Canvas context is unavailable')
        context.imageSmoothingEnabled = true
        context.imageSmoothingQuality = 'high'
        // Draw the entire source, preserving its aspect ratio. No crop, overlays or retouching.
        context.drawImage(image, 0, 0, width, height)
        const result = canvas.toDataURL('image/webp', quality)
        if (!result.startsWith('data:image/webp;base64,')) throw new Error('WebP encoder is unavailable')
        const check = new Image()
        check.src = result
        await check.decode()
        if (check.naturalWidth !== width || check.naturalHeight !== height) throw new Error('Unexpected encoded dimensions')
        return result
      }, { inputUrl: `data:image/png;base64,${input.toString('base64')}`, ...size, quality })
      const buffer = Buffer.from(dataUrl.split(',')[1], 'base64')
      await writeFile(resolve(root, path), buffer)
      variants.push({ file: path, ...size, bytes: buffer.length, sha256: hash(buffer), encoder: {
        browserChannel: process.env.PLAYWRIGHT_CHANNEL || 'bundled-chromium',
        browserVersion: browser.version(),
        quality,
      } })
      console.log(`${path}: ${size.width} x ${size.height}, ${buffer.length.toLocaleString('en-US')} bytes`)
    }
    assets.push({
      mealId,
      recipeVersion: source.recipeVersion,
      labelZh: source.labelZh,
      alt: source.alt,
      prompt: source.prompt,
      review: source.review || originalManifest.review,
      source: {
        file: `${sourceDirectory}/${filename}`,
        width: sourceWidth,
        height: sourceHeight,
        bytes: input.length,
        sha256: hash(input),
      },
      variants,
    })
  }

  const manifest = {
    schemaVersion: 1,
    createdDate: originalManifest.createdDate,
    generationMethod: originalManifest.method,
    status: 'Approved generated illustrations, prepared as static website assets',
    sourceRecipes: originalManifest.sourceRecipes,
    sourceFoods: originalManifest.sourceFoods,
    basedOnCommit: originalManifest.basedOnCommit,
    displayDisclosure: originalManifest.displayDisclosure,
    review: originalManifest.review,
    preparation: {
      scope: 'Current preparation run; actual encoder information is retained per variant, including reused files.',
      script: 'scripts/prepare-recipe-images.mjs',
      encoder: 'Project-local Playwright Chromium Canvas WebP',
      browserChannel: process.env.PLAYWRIGHT_CHANNEL || 'bundled-chromium',
      browserVersion: browser.version(),
      quality,
      modifications: 'Full-frame proportional resizing and WebP encoding only. No crop, retouching, or added ingredients.',
    },
    assets,
  }
  await writeFile(resolve(root, 'docs/recipe-images/manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  const entries = approvedAssets.map(({ mealId, file, recipeVersion, alt }) => ({
    mealId, basename: file.replace(/-v\d+\.png$/, ''), recipeVersion, alt,
  }))
  await writeFile(resolve(root, 'src/recipe-images.generated.ts'), `// Generated by scripts/prepare-recipe-images.mjs. Do not edit manually.\nexport const recipeImageEntries = ${JSON.stringify(entries, null, 2)} as const;\n`)
} finally {
  await browser.close()
}
