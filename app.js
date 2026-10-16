"use strict";

console.log("✅ APP.JS EST BIEN EXÉCUTÉ");
/* =========================================================
CONFIGURATION
========================================================= */

const RELEASES_FILE =
"https://pierre-011.github.io/spotify-artists/data/sorties.json";

const MAX_RELEASES = 10;
const RELEASE_DELAY_DAYS = 14;

let releases = [];

/* =========================================================
UTILITAIRES
========================================================= */

const $ = id => document.getElementById(id);

/**

* Échappe les caractères HTML pour éviter l'injection de code.
  */
  function escapeHTML(value) {
  return String(value ?? "")
  .replaceAll("&", "&")
  .replaceAll("<", "<")
  .replaceAll(">", ">")
  .replaceAll('"', """)
  .replaceAll("'", "'");
  }

/**

* Normalise le texte pour rendre la recherche insensible
* aux accents et à la casse.
  */
  function normalizeText(value) {
  return String(value ?? "")
  .toLocaleLowerCase("fr-FR")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .trim();
  }

/**

* Formate un nombre selon les conventions françaises.
  */
  function formatNumber(value) {
  return new Intl.NumberFormat("fr-FR").format(
  Number(value) || 0
  );
  }

/**

* Convertit une date en nombre de millisecondes,
* en utilisant midi pour éviter les problèmes de fuseau.
  */
  function parseLocalDate(value) {
  const normalized = normalizeDate(value);

  if (!normalized) {
  return null;
  }

  const match = normalized.match(
  /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (!match) {
  return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(year, month - 1, day, 12, 0, 0);

  // Vérifie que la date existe réellement.
  if (
  date.getFullYear() !== year ||
  date.getMonth() !== month - 1 ||
  date.getDate() !== day
  ) {
  return null;
  }

  return date;
  }

/* =========================================================
GESTION DES DATES
========================================================= */

/**

* Retourne la date actuelle à Paris au format AAAA-MM-JJ.
  */
  function getTodayParis() {
  const parts = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
  }).formatToParts(new Date());

  const result = {};

  for (const part of parts) {
  if (part.type !== "literal") {
  result[part.type] = part.value;
  }
  }

  return `${result.year}-${result.month}-${result.day}`;
  }

/**

* Calcule la date limite d'affichage.
*
* Exemple :
* Aujourd'hui : 2026-10-16
* Date limite : 2026-10-02
  */
  function getReleaseCutoffDate() {
  const date = parseLocalDate(getTodayParis());

  if (!date) {
  throw new Error("Impossible de calculer la date actuelle.");
  }

  date.setDate(date.getDate() - RELEASE_DELAY_DAYS);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
  }

/**

* Normalise les dates provenant du JSON.
*
* Formats acceptés :
* * AAAA-MM-JJ
* * AAAA-MM-JJTHH:mm:ss
* * AAAA-MM-JJ HH:mm:ss
* * JJ/MM/AAAA
* * JJ-MM-AAAA
    */
    function normalizeDate(value) {
    if (value === null || value === undefined || value === "") {
    return "";
    }

  const string = String(value).trim();

  // Format ISO : 2026-09-25 ou 2026-09-25T10:30:00Z.
  const iso = string.match(
  /^(\d{4}-\d{2}-\d{2})(?:$|T|\s)/
  );

  if (iso) {
  return parseLocalDateWithoutRecursion(iso[1]);
  }

  // Format français : 25/09/2026 ou 25-09-2026.
  const french = string.match(
  /^(\d{2})[/-](\d{2})[/-](\d{4})$/
  );

  if (french) {
  const normalized =
  `${french[3]}-${french[2]}-${french[1]}`;

  ```
   return parseLocalDateWithoutRecursion(normalized);
  ```

  }

  return "";
  }

/**

* Vérifie une date ISO sans rappeler normalizeDate().
  */
  function parseLocalDateWithoutRecursion(value) {
  const match = String(value).match(
  /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (!match) {
  return "";
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(year, month - 1, day, 12, 0, 0);

  if (
  date.getFullYear() !== year ||
  date.getMonth() !== month - 1 ||
  date.getDate() !== day
  ) {
  return "";
  }

  return value;
  }

/**

* Formate une date au format JJ/MM/AAAA.
  */
  function formatDate(value) {
  const normalized = normalizeDate(value);

  if (!normalized) {
  return "—";
  }

  const [year, month, day] = normalized.split("-");

  return `${day}/${month}/${year}`;
  }

/**

* Formate une date en français lisible.
  */
  function formatReadableDate(value) {
  const date = parseLocalDate(value);

  if (!date) {
  return "Date inconnue";
  }

  return date.toLocaleDateString("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric"
  });
  }

/* =========================================================
CHARGEMENT DES DONNÉES
========================================================= */

/**

* Charge les sorties depuis le fichier JSON.
  */
  async function loadReleases() {
  const response = await fetch(RELEASES_FILE, {
  cache: "no-store"
  });

  if (!response.ok) {
  throw new Error(
  `Impossible de récupérer les données (HTTP ${response.status}).`
  );
  }

  let data;

  try {
  data = await response.json();
  } catch {
  throw new Error(
  "Le fichier sorties.json ne contient pas un JSON valide."
  );
  }

  let items = [];

  if (Array.isArray(data)) {
  items = data;
  } else if (data && typeof data === "object") {
  if (Array.isArray(data.tracks)) {
  items = data.tracks;
  } else if (Array.isArray(data.releases)) {
  items = data.releases;
  } else if (Array.isArray(data.albums)) {
  items = data.albums;
  } else if (Array.isArray(data.items)) {
  items = data.items;
  }
  }

  return items.filter(
  item => item && typeof item === "object"
  );
  }

/* =========================================================
INFORMATIONS D'UNE SORTIE
========================================================= */

function getReleaseDate(release) {
return normalizeDate(
release?.release_date ??
release?.releaseDate ??
release?.date ??
release?.published_at ??
""
);
}

function getReleaseTitle(release) {
return (
release?.name ||
release?.album_name ||
release?.albumName ||
release?.title ||
"Titre inconnu"
);
}

function getReleaseArtist(release) {
const artist = (
release?.artist_name ??
release?.artistName ??
release?.artist ??
release?.artists ??
"Artiste inconnu"
);

```
if (Array.isArray(artist)) {
    return artist
        .map(item => {
            if (typeof item === "string") {
                return item;
            }

            return item?.name || "";
        })
        .filter(Boolean)
        .join(", ") || "Artiste inconnu";
}

if (artist && typeof artist === "object") {
    return artist.name || "Artiste inconnu";
}

return String(artist);
```

}

function getReleaseImage(release) {
const image =
release?.album_image ??
release?.albumImage ??
release?.image ??
release?.cover ??
release?.images?.[0]?.url ??
"";

```
return typeof image === "string" ? image : "";
```

}

function getReleaseURL(release) {
return (
release?.url ||
release?.external_url ||
release?.external_urls?.spotify ||
release?.spotify_url ||
""
);
}

function getReleaseType(release) {
return String(
release?.release_type ??
release?.releaseType ??
release?.type ??
""
).trim().toLowerCase();
}

/* =========================================================
VALIDATION DES LIENS
========================================================= */

/**

* N'autorise que les URL HTTP et HTTPS.
  */
  function isSafeURL(value) {
  if (!value) {
  return false;
  }

  try {
  const url = new URL(value, window.location.href);

  ```
   return url.protocol === "https:" || url.protocol === "http:";
  ```

  } catch {
  return false;
  }
  }

/* =========================================================
RECHERCHE
========================================================= */

function matchesSearch(release, search) {
if (!search) {
return true;
}

```
const text = [
    getReleaseTitle(release),
    getReleaseArtist(release),
    release?.album_name,
    release?.albumName
]
    .filter(Boolean)
    .join(" ");

return normalizeText(text).includes(search);
```

}

/* =========================================================
AFFICHAGE DE LA DATE
========================================================= */

function displayCurrentDate() {
const today = getTodayParis();
const cutoffDate = getReleaseCutoffDate();

```
const currentDate = $("current-date");
const releaseTitle = $("release-title");
const releaseDescription = $("release-description");

if (currentDate) {
    currentDate.textContent = formatDate(today);
}

if (releaseTitle) {
    releaseTitle.textContent = "Dernières sorties";
}

if (releaseDescription) {
    releaseDescription.textContent =
        `Jusqu'à ${MAX_RELEASES} sorties, avec ${RELEASE_DELAY_DAYS} jours de retard (jusqu'au ${formatDate(cutoffDate)}).`;
}
```

}

/* =========================================================
CRÉATION D'UNE CARTE
========================================================= */

function createReleaseCard(release) {
const title = getReleaseTitle(release);
const artist = getReleaseArtist(release);
const image = getReleaseImage(release);
const url = getReleaseURL(release);
const type = getReleaseType(release);
const releaseDate = getReleaseDate(release);

```
const safeTitle = escapeHTML(title);
const safeArtist = escapeHTML(artist);

const cover = isSafeURL(image)
    ? `
        <img
            class="release-cover"
            src="${escapeHTML(image)}"
            alt="Pochette de ${safeTitle}"
            loading="lazy"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
        >
        <div
            class="release-cover release-cover-empty"
            style="display:none"
            aria-hidden="true"
        >♪</div>
    `
    : `
        <div class="release-cover release-cover-empty" aria-hidden="true">
            ♪
        </div>
    `;

const spotifyButton = isSafeURL(url)
    ? `
        <a
            class="spotify-button"
            href="${escapeHTML(url)}"
            target="_blank"
            rel="noopener noreferrer"
        >
            Écouter sur Spotify
        </a>
    `
    : "";

return `
    <article class="release-card">

        ${cover}

        <div class="release-information">

            <div class="release-type">
                ${escapeHTML(type ? type.toUpperCase() : "SORTIE")}
            </div>

            <div class="release-name">
                ${safeTitle}
            </div>

            <div class="release-artist">
                ${safeArtist}
            </div>

            <div class="release-album">
                ${escapeHTML(formatDate(releaseDate))}
            </div>

            ${spotifyButton}

        </div>

    </article>
`;
```

}

/* =========================================================
FILTRAGE ET AFFICHAGE DES SORTIES
========================================================= */

function renderReleases() {
const container = $("release-list");

```
if (!container) {
    console.error(
        "Élément #release-list introuvable dans le HTML."
    );
    return;
}

const search = normalizeText(
    $("release-search")?.value || ""
);

const today = getTodayParis();
const cutoffDate = getReleaseCutoffDate();

/*
 * 1. Garder les sorties dont la date est valide,
 * passée et antérieure à la date limite.
 */
const eligibleReleases = releases
    .filter(release => {
        const date = getReleaseDate(release);

        return (
            date !== "" &&
            date <= cutoffDate &&
            date <= today
        );
    })

    /*
     * 2. Trier de la plus récente à la plus ancienne.
     */
    .sort((a, b) => {
        const dateA = getReleaseDate(a);
        const dateB = getReleaseDate(b);

        if (dateA !== dateB) {
            return dateB.localeCompare(dateA);
        }

        return getReleaseTitle(a).localeCompare(
            getReleaseTitle(b),
            "fr-FR",
            { sensitivity: "base" }
        );
    })

    /*
     * 3. Limiter à 10 sorties.
     */
    .slice(0, MAX_RELEASES);

/*
 * 4. Appliquer la recherche aux 10 sorties retenues.
 */
const visibleReleases = eligibleReleases.filter(release =>
    matchesSearch(release, search)
);

/*
 * 5. Mettre à jour le compteur.
 */
const counter = $("release-count");

if (counter) {
    counter.textContent = formatNumber(
        visibleReleases.length
    );
}

/*
 * 6. Afficher un message si aucune sortie ne correspond.
 */
if (visibleReleases.length === 0) {
    const message = search
        ? `Aucune sortie ne correspond à « ${escapeHTML(search)} ».`
        : `Aucune sortie n'est disponible avant le ${escapeHTML(formatDate(cutoffDate))}.`;

    container.innerHTML = `
        <div class="empty">
            <strong>Aucune sortie disponible</strong>
            <p>${message}</p>
        </div>
    `;

    return;
}

/*
 * 7. Générer les cartes.
 */
container.innerHTML = visibleReleases
    .map(createReleaseCard)
    .join("");
```

}

/* =========================================================
GESTION DES ERREURS
========================================================= */

function showError(message) {
const container = $("release-list");

```
if (container) {
    container.innerHTML = `
        <div class="empty">
            <strong>Impossible de charger les sorties</strong>
            <p>${escapeHTML(message)}</p>
            <button
                type="button"
                class="spotify-button"
                id="retry-loading"
            >
                Réessayer
            </button>
        </div>
    `;

    $("retry-loading")?.addEventListener("click", initialize);
}

const counter = $("release-count");

if (counter) {
    counter.textContent = "0";
}

console.error("Chargement des sorties impossible :", message);
```

}

/* =========================================================
INITIALISATION
========================================================= */

async function initialize() {
const container = $("release-list");

```
if (container) {
    container.innerHTML = `
        <div class="loading">
            Chargement des sorties...
        </div>
    `;
}

try {
    displayCurrentDate();

    releases = await loadReleases();

    console.info(
        `${releases.length} sortie(s) chargée(s) depuis le JSON.`
    );

    console.info(
        "Date actuelle à Paris :",
        getTodayParis()
    );

    console.info(
        "Date limite des sorties :",
        getReleaseCutoffDate()
    );

    console.info(
        "Nombre de sorties avec une date valide :",
        releases.filter(release => getReleaseDate(release)).length
    );

    renderReleases();

} catch (error) {
    console.error(
        "Erreur lors de l'initialisation :",
        error
    );

    showError(
        error.message ||
        "Une erreur inconnue est survenue."
    );
}
```

}

/* =========================================================
RECHERCHE ET DÉMARRAGE
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
const searchInput = $("release-search");

```
if (searchInput) {
    searchInput.addEventListener("input", renderReleases);
}

initialize();
```

});
