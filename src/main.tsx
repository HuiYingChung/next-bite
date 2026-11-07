import React from "react";
import ReactDOM from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import App from "./App";
import { RecipeCardEntry } from "./RecipeCardEntry";
import { parseRecipeCardRequest } from "./recipe-card-route";
import "./index.css";
import "./launch.css";
import "./recipe-card.css";

const recipeCardRequest = parseRecipeCardRequest(window.location.search);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {recipeCardRequest ? <RecipeCardEntry request={recipeCardRequest} /> : <App />}
    <Analytics
      beforeSend={(event) => {
        const url = new URL(event.url);
        url.search = "";
        url.hash = "";
        return { ...event, url: url.toString() };
      }}
    />
  </React.StrictMode>,
);
