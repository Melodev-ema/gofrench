import { Router } from "express";
import { openApiDocument } from "./openapi.js";

const SWAGGER_UI_URL = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.33.0";

const swaggerUiPage = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>GoFrench quiz API</title>
    <link rel="stylesheet" href="${SWAGGER_UI_URL}/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="${SWAGGER_UI_URL}/swagger-ui-bundle.js"></script>
    <script>SwaggerUIBundle({ url: "/openapi.json", dom_id: "#swagger-ui" });</script>
  </body>
</html>`;

export function createDocsRouter(): Router {
  const router = Router();

  router.get("/openapi.json", (_request, response) => {
    response.json(openApiDocument);
  });

  router.get("/docs", (_request, response) => {
    response.type("html").send(swaggerUiPage);
  });

  return router;
}
