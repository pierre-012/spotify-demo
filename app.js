"use strict";

/* =========================================================
CONFIGURATION
========================================================= */

const RELEASES_FILE =
"https://pierre-011.github.io/spotify-artists/data/sorties.json";

const MAX_RELEASES = 10;
const RELEASE_DELAY_DAYS = 14;
const REQUEST_TIMEOUT = 10000;

let releases = [];

/* =========================================================
UTILITAIRES
========================================================= */

const $ = id => document.getElementById(id);

function escapeHTML(value) { 
return String(value ?? "") 
.replace(/&/g, "&amp;") 
.replace(/</g, "&lt;") 
.replace(/>/g, "&gt;") 
.replace(/"/g, "&quot;") 
.replace(/'/g, "&#39;");
}

function normalizeText(value) {
return String(value ?? "")
.toLocaleLowerCase("fr-FR")
.normalize("NFD")
.replace(/[\u0300-\u036f]/g, "")
.trim();
}

function formatNumber(value) {
return new Intl.NumberFormat("fr-FR").format(
Number(value) || 0
);
}

/* =========================================================
DATES
========================================================= */

function getTodayParis() {
const parts = new Intl.DateTimeFormat("en-CA", {
timeZone: "Europe/Paris",
year: "numeric",
month: "2-digit",
day: "2-digit"
}).formatToParts(new Date());

```
const result = {};

for (const part of parts) {
    if (part.type !== "literal") {
        result[part.type] = part.value;
    }
}

return `${result.year}-${result.month}-${result.day}`;
```

}

function normalizeDate(value) {
if (value === null || value === undefined || value === "") {
return "";
}

```
const string = String(value).trim();

let match = string.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:$|T|\s)/
);

if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const date = new Date(year, month - 1, day, 12);

    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return "";
    }

    return `${match[1]}-${match[2]}-${match[3]}`;
}

match = string.match(
    /^(\d{2})\/(\d{2})\/(\d{4})$/
);

if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);

    const date = new Date(year, month - 1, day, 12);

    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return "";
    }

    return `${match[3]}-${match[2]}-${match[1]}`;
}

return "";
```

}

function getReleaseCutoffDate() {
const today = getTodayParis();
const parts = today.split("-").map(Number);

```
const date = new Date(
    parts[0],
    parts[1] - 1,
    parts[2],
    12
);

date.setDate(date.getDate() - RELEASE_DELAY_DAYS);

const year = date.getFullYear();
const month = String(date.getMonth() + 1).padStart(2, "0");
const day = String(date.getDate()).padStart(2, "0");

return `${year}-${month}-${day}`;
```

}

function formatDate(value) {
const normalized = normalizeDate(value);

```
if (!normalized) {
    return "—";
}

const [year, month, day] = normalized.split("-");

return `${day}/${month}/${year}`;
```

}

function formatReadableDate(value) {
const normalized = normalizeDate(value);

```
if (!normalized) {
    return "Date inconnue";
}

const [year, month, day] = normalized.split("-");

const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    12
);

return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
});
```

}

/* =========================================================
CHARGEMENT DU JSON
========================================================= */

async function loadReleases() {
const controller = new AbortController();

```
const timeout = setTimeout(() => {
    controller.abort();
}, REQUEST_TIMEOUT);

try {
    const response = await fetch(RELEASES_FILE, {
        cache: "no-store",
        signal: controller.signal
    });

    if (!response.ok) {
        throw new Error(
            `Erreur HTTP ${response.status} lors du chargement du fichier JSON.`
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

    if (Array.isArray(data)) {
        return data.filter(Boolean);
    }

    if (data && typeof data === "object") {
        const possibleLists = [
            data.tracks,
            data.releases,
            data.albums,
            data.items
        ];

        for (const list of possibleLists) {
            if (Array.isArray(list)) {
                return list.filter(Boolean);
            }
        }
    }

    throw new Error(
        "Structure JSON non reconnue : aucune liste de sorties trouvée."
    );

} catch (error) {
    if (error.name === "AbortError") {
        throw new Error(
            "Le chargement du fichier JSON a dépassé 10 secondes."
        );
    }

    throw error;

} finally {
    clearTimeout(timeout);
}
```

}

/* =========================================================
INFORMATIONS DES SORTIES
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
const artist =
release?.artist_name ??
release?.artistName ??
release?.artist ??
release?.artists ??
"Artiste inconnu";

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
VALIDATION DES URL
========================================================= */

function isSafeURL(value) {
if (!value) {
return false;
}

```
try {
    const url = new URL(value, window.location.href);

    return (
        url.protocol === "https:" ||
        url.protocol === "http:"
    );
} catch {
    return false;
}
```

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
INFORMATIONS DE LA PAGE
========================================================= */

function displayCurrentDate() {
const today = getTodayParis();
const cutoffDate = getReleaseCutoffDate();

```
if ($("current-date")) {
    $("current-date").textContent = formatDate(today);
}

if ($("release-title")) {
    $("release-title").textContent = "Dernières sorties";
}

if ($("release-description")) {
    $("release-description").textContent =
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
let coverHTML;

if (isSafeURL(image)) {
    coverHTML = `
        <img
            class="release-cover"
            src="${escapeHTML(image)}"
            alt="Pochette de ${escapeHTML(title)}"
            loading="lazy"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
        >
        <div
            class="release-cover release-cover-empty"
            style="display:none"
        >♪</div>
    `;
} else {
    coverHTML = `
        <div class="release-cover release-cover-empty">♪</div>
    `;
}

let buttonHTML = "";

if (isSafeURL(url)) {
    buttonHTML = `
        <a
            class="spotify-button"
            href="${escapeHTML(url)}"
            target="_blank"
            rel="noopener noreferrer"
        >
            Écouter sur Spotify
        </a>
    `;
}

return `
    <article class="release-card">

        ${coverHTML}

        <div class="release-information">

            <div class="release-type">
                ${escapeHTML(type ? type.toUpperCase() : "SORTIE")}
            </div>

            <div class="release-name">
                ${escapeHTML(title)}
            </div>

            <div class="release-artist">
                ${escapeHTML(artist)}
            </div>

            <div class="release-album">
                ${escapeHTML(formatDate(releaseDate))}
            </div>

            ${buttonHTML}

        </div>

    </article>
`;
```

}

/* =========================================================
AFFICHAGE DES SORTIES
========================================================= */

function renderReleases() {
const container = $("release-list");

```
if (!container) {
    console.error(
        "Élément HTML #release-list introuvable."
    );
    return;
}

const search = normalizeText(
    $("release-search")?.value || ""
);

const today = getTodayParis();
const cutoffDate = getReleaseCutoffDate();

const eligibleReleases = releases
    .filter(release => {
        const date = getReleaseDate(release);

        return (
            date !== "" &&
            date <= cutoffDate &&
            date <= today
        );
    })
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
    .slice(0, MAX_RELEASES);

const visibleReleases = eligibleReleases.filter(
    release => matchesSearch(release, search)
);

if ($("release-count")) {
    $("release-count").textContent = formatNumber(
        visibleReleases.length
    );
}

if (visibleReleases.length === 0) {
    const message = search
        ? `Aucune sortie ne correspond à votre recherche : ${escapeHTML(search)}.`
        : `Aucune sortie n'a atteint la date limite du ${escapeHTML(formatDate(cutoffDate))}.`;

    container.innerHTML = `
        <div class="empty">
            <strong>Aucune sortie disponible</strong>
            <p>${message}</p>
        </div>
    `;

    return;
}

container.innerHTML = visibleReleases
    .map(createReleaseCard)
    .join("");
```

}

/* =========================================================
AFFICHAGE DES ERREURS
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

    $("retry-loading")?.addEventListener(
        "click",
        initialize
    );
}

if ($("release-count")) {
    $("release-count").textContent = "0";
}
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

    console.log("Chargement du fichier JSON :", RELEASES_FILE);

    releases = await loadReleases();

    console.log(
        `${releases.length} sortie(s) chargée(s).`
    );

    console.log(
        "Date actuelle à Paris :",
        getTodayParis()
    );

    console.log(
        "Date limite :",
        getReleaseCutoffDate()
    );

    console.log(
        "Sorties avec date valide :",
        releases.filter(release => getReleaseDate(release)).length
    );

    renderReleases();

} catch (error) {
    console.error(
        "Erreur lors du chargement des sorties :",
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
DÉMARRAGE
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
console.log("Spotify Tracker : JavaScript chargé.");

```
const searchInput = $("release-search");

if (searchInput) {
    searchInput.addEventListener(
        "input",
        renderReleases
    );
}

initialize();
```

});
