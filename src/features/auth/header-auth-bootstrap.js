import { runWhenDocumentReady } from "../../runtime/application-bootstrap.js";
import { createAuthHeaderController } from "./header-auth.js?v=20260811invites1";

runWhenDocumentReady(document, () => {
  const controller = createAuthHeaderController();
  if (controller) {
    const handlePageHide = event => {
      if (event.persisted) return;
      window.removeEventListener("pagehide", handlePageHide);
      controller.destroy();
    };
    window.addEventListener("pagehide", handlePageHide);
  }
});
