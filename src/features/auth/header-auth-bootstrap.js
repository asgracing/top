import { runWhenDocumentReady } from "../../runtime/application-bootstrap.js";
import { createAuthHeaderController } from "./header-auth.js?v=20260722discord3";

runWhenDocumentReady(document, () => {
  const controller = createAuthHeaderController();
  if (controller) {
    window.addEventListener("pagehide", () => controller.destroy(), { once: true });
  }
});
