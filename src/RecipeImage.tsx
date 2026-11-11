import { useState } from "react";
import {
  getRecipeImage,
  type RecipeImageAsset,
  type RecipeImageIdentity,
} from "./recipe-images";
import type { Locale } from "./types";

export type RecipeImageVariant = "thumbnail" | "detail" | "card";

type RecipeImageProps = {
  recipe: RecipeImageIdentity | null | undefined;
  locale: Locale;
  variant?: RecipeImageVariant;
  priority?: boolean;
};

const sizes: Record<RecipeImageVariant, string> = {
  thumbnail: "88px",
  detail: "(max-width: 424px) calc(100vw - 64px), 360px",
  // Compact rows up to 860 px wide, then one of three columns.
  card: "(max-width: 860px) 104px, (max-width: 1304px) 31vw, 400px",
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
