import { useState } from "react";
import {
  getRecipeImage,
  type RecipeImageAsset,
  type RecipeImageIdentity,
} from "./recipe-images";
import type { Locale } from "./types";

export type RecipeImageVariant = "hero" | "thumbnail" | "detail";

type RecipeImageProps = {
  recipe: RecipeImageIdentity | null | undefined;
  locale: Locale;
  variant?: RecipeImageVariant;
  priority?: boolean;
};

const sizes: Record<RecipeImageVariant, string> = {
  hero: "(max-width: 600px) 240px, (max-width: 1050px) 160px, 220px",
  thumbnail: "88px",
  detail: "(max-width: 424px) calc(100vw - 64px), 360px",
};

function RecipeImageFrame({
  image,
  locale,
  variant,
  priority,
}: {
  image: RecipeImageAsset;
  locale: Locale;
  variant: RecipeImageVariant;
  priority: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  // Thumbnails also appear inside option buttons, which accept phrasing content.
  const Frame = variant === "thumbnail" ? "span" : "figure";

  return (
    <Frame className={`recipe-image recipe-image--${variant}`}>
      <img
        src={image.src}
        srcSet={image.srcSet}
        sizes={sizes[variant]}
        width={960}
        height={720}
        alt={image.alt[locale]}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onError={() => setFailed(true)}
      />
    </Frame>
  );
}

export function RecipeImage({
  recipe,
  locale,
  variant = "thumbnail",
  priority = false,
}: RecipeImageProps) {
  const image = getRecipeImage(recipe);
  if (!image || !recipe) return null;

  return (
    <RecipeImageFrame
      key={`${recipe.mealId}:${recipe.version}`}
      image={image}
      locale={locale}
      variant={variant}
      priority={priority}
    />
  );
}
