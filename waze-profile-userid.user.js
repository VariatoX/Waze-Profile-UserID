// ==UserScript==
// @name         Waze Profile UserID
// @version      2026-08-15_1
// @description  Zieht die User-ID des aktuell aufgerufenen Editorenprofils und zeigt sie an. Aktiver Login in Nutzerkonto obligat.
// @author       Variatox
// @match        *://*.waze.com/*/user/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=waze.com
// @connect      waze.com
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @run-at       document-end
// @license      MIT
// ==/UserScript==

(function () {
  "use strict";

  const USERNAME_REGEX = /\/user\/editor\/([^\/?#]+)/;
  const HEADER_SELECTOR = ".header-info";
  const CUSTOM_ID_CLASS = "header-custom-userid";

  // <i18n>
  const I18N = {
    de: {
      strUserId: "User ID: {id}",
      strCopyTooltip: "Klicken zum Kopieren",
      strCopied: "Kopiert!",
      strCopyFailed: "Kopieren fehlgeschlagen...",
    },
    en: {
      strUserId: "User ID: {id}",
      strCopyTooltip: "Click to copy",
      strCopied: "Copied!",
      strCopyFailed: "Copy failed...",
    },
    fr: {
      strUserId: "ID utilisateur : {id}",
      strCopyTooltip: "Cliquer pour copier",
      strCopied: "Copié!",
      strCopyFailed: "Échec de la copie...",
    },
    es: {
      strUserId: "ID de usuario: {id}",
      strCopyTooltip: "Haz clic para copiar",
      strCopied: "¡Copiado!",
      strCopyFailed: "Error al copiar...",
    },
  };
  const currentLang = navigator.language.split("-")[0] || "en";
  const l = I18N[currentLang] || I18N.en;
  // </i18n>

  const match = window.location.pathname.match(USERNAME_REGEX);
  if (!match) return;

  if (document.querySelector(`.${CUSTOM_ID_CLASS}`)) return;

  const username = match[1];
  const endpoint = `https://www.waze.com/row-Descartes/app/UserProfile/Profile?username=${encodeURIComponent(username)}`;

  GM_xmlhttpRequest({
    method: "GET",
    url: endpoint,
    onload(response) {
      let data;
      try {
        data = JSON.parse(response.responseText);
      } catch (e) {
        console.error(
          `[Waze Profile UserID] Error parsing from (${endpoint}) : `,
          e,
        );
        return;
      }
      if (!data || !data.userID) return;
      observeElement(HEADER_SELECTOR, () => insertUserId(data.userID));
    },
    onerror(err) {
      console.error(
        `[Waze Profile UserID] Request to (${endpoint}) failed : `,
        err,
      );
    },
  });

  function observeElement(selector, callback) {
    const existing = document.querySelector(selector);
    if (existing) {
      callback(existing);
      return;
    }
    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        callback(el);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function insertUserId(userID) {
    const headerInfo = document.querySelector(HEADER_SELECTOR);
    if (!headerInfo || document.querySelector(`.${CUSTOM_ID_CLASS}`)) return;

    const idContainer = document.createElement("div");

    idContainer.className = `${HEADER_SELECTOR.substring(1)} ${CUSTOM_ID_CLASS}`;
    idContainer.textContent = l.strUserId.replace("{id}", userID);
    idContainer.title = l.strCopyTooltip;
    idContainer.style.cursor = "pointer";
    idContainer.style.userSelect = "none";

    idContainer.addEventListener("click", () =>
      copyToClipboard(userID, idContainer),
    );

    headerInfo.insertAdjacentElement("afterend", idContainer);
  }

  function copyToClipboard(text, el) {
    const originalText = el.textContent;
    const showFeedback = (success) => {
      el.textContent = success ? l.strCopied : l.strCopyFailed;
      setTimeout(() => {
        el.textContent = originalText;
      }, 1200);
    };

    if (typeof GM_setClipboard === "function") {
      try {
        GM_setClipboard(text, "text");
        showFeedback(true);
      } catch (e) {
        showFeedback(false);
      }
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => showFeedback(true))
        .catch(() => showFeedback(false));
    } else {
      showFeedback(false);
    }
  }
})();
