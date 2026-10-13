"use strict";

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

function escapeHTML(value) {
return String(value ?? "")
.replaceAll("&", "&")
.replaceAll("<", "<")
.replaceAll(">", ">")
.replaceAll('"', """)
.replaceAll("'", "'");
}

function normalizeText(value) {
return String(value ?? "")
.toLocaleLowerCase("fr-FR")
.normalize("NFD")
.replace(/[\u0300-\u036f]/g, "");
}

function formatNumber(value) {
return new Intl.NumberFormat("fr-FR").format(
Number(value) || 0
);
}

/* =========================================================
DATES
========================================================= */

/*

* Retourne la date actuelle selon le fuseau horaire de Paris.
* Format : AAAA-MM-JJ
  */

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

/*

* Calcule la date limite d'accès aux sorties.
*
* Exemple :
* Aujourd'hui : 13/10/2026
* Date limite : 29/09/2026
*
* Le lendemain :
* Aujourd'hui : 14/10/2026
* Date limite : 30/09/2026
  */

function getReleaseCutoffDate() {
const today = getTodayParis();

```
// Utilisation de midi pour éviter les problèmes
// liés aux changements d'heure.
const date = new Date(`${today}T12:00:00`);

date.setDate(date.getDate() - RELEASE_DELAY_DAYS);

const year = date.getFullYear();
const month = String(date.getMonth() + 1).padStart(2, "0");
const day = String(date.getDate()).padStart(2, "0");

return `${year}-${month}-${day}`;
```

}

/*

* Normalise les dates provenant du fichier JSON.
*
* Formats acceptés :
* AAAA-MM-JJ
* AAAA-MM-JJTHH:mm:ss
* JJ/MM/AAAA
  */

function normalizeDate(value) {
if (!value) {
return "";
}

```
const string = String(value).trim();

// Format ISO : AAAA-MM-JJ
const iso = string.match(/^(\d{4}-\d{2}-\d{2})(?:$|T|\s)/);

if (iso) {
    return iso[1];
}

// Format français : JJ/MM/AAAA
const french = string.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

if (french) {
    return `${french[3]}-${french[2]}-${french[1]}`;
}

return "";
```

}

/*

* Formate une date en JJ/MM/AAAA.
  */

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

/*

* Formate une date en français lisible.
  */

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
CHARGEMENT DES DONNÉES
========================================================= */

async function loadReleases() {
const response = await fetch(RELEASES_FILE, {
cache: "no-store"
});

```
if (!response.ok) {
    throw new Error(`Erreur HTTP ${response.status}`);
}

const data = await response.json();

if (Array.isArray(data)) {
    return data.filter(Boolean);
}

if (Array.isArray(data.tracks)) {
    return data.tracks.filter(Boolean);
}

if (Array.isArray(data.releases)) {
    return data.releases.filter(Boolean);
}

if (Array.isArray(data.albums)) {
    return data.albums.filter(Boolean);
}

return [];
```

}

/* =========================================================
INFORMATIONS D'UNE SORTIE
========================================================= */

function getReleaseDate(release) {
return normalizeDate(
release?.release_date ??
release?.releaseDate ??
release?.date ??
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
return (
release?.artist_name ||
release?.artistName ||
release?.artist ||
"Artiste inconnu"
);
}

function getReleaseImage(release) {
return (
release?.album_image ||
release?.albumImage ||
release?.image ||
""
);
}

function getReleaseURL(release) {
return (
release?.url ||
release?.external_url ||
release?.external_urls?.spotify ||
""
);
}

function getReleaseType(release) {
return String(
release?.release_type ||
release?.releaseType ||
""
)
.trim()
.toLowerCase();
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
INTERFACE
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
        `Jusqu'à ${MAX_RELEASES} sorties, avec 2 semaines de retard (jusqu'au ${formatDate(cutoffDate)})`;
}
```

}

/* =========================================================
FILTRAGE ET AFFICHAGE DES SORTIES
========================================================= */

function renderReleases() {
const container = $("release-list");

```
if (!container) {
    return;
}

const search = normalizeText(
    $("release-search")?.value?.trim() || ""
);

const today = getTodayParis();
const cutoffDate = getReleaseCutoffDate();

/*
 * ÉTAPE 1
 * Garder uniquement les sorties dont la date est
 * antérieure ou égale à la date limite.
 *
 * Exemple :
 * Aujourd'hui : 13/10/2026
 * Date limite : 29/09/2026
 *
 * Les sorties du 29 septembre et des jours précédents
 * sont éligibles.
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
     * ÉTAPE 2
     * Trier les sorties de la plus récente à la plus ancienne.
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
     * ÉTAPE 3
     * Limiter à 10 sorties maximum.
     */

    .slice(0, MAX_RELEASES);

/*
 * ÉTAPE 4
 * Appliquer la recherche aux sorties retenues.
 */

const visibleReleases = eligibleReleases.filter(release =>
    matchesSearch(release, search)
);

// Mettre à jour le compteur.
if ($("release-count")) {
    $("release-count").textContent =
        formatNumber(visibleReleases.length);
}

// Afficher un message si aucune sortie n'est disponible.
if (!visibleReleases.length) {
    container.innerHTML = `
        <div class="empty">
            <strong>Aucune sortie disponible</strong>
            <p>
                Aucune sortie ne correspond à votre recherche
                parmi les ${MAX_RELEASES} sorties les plus récentes
                ayant atteint la date limite du
                ${escapeHTML(formatDate(cutoffDate))}.
            </p>
        </div>
    `;

    return;
}

/*
 * ÉTAPE 5
 * Générer les cartes des sorties.
 */

container.innerHTML = visibleReleases
    .map(release => {
        const title = getReleaseTitle(release);
        const artist = getReleaseArtist(release);
        const image = getReleaseImage(release);
        const url = getReleaseURL(release);
        const type = getReleaseType(release);
        const releaseDate = getReleaseDate(release);

        return `
            <article class="release-card">

                ${
                    image
                        ? `
                            <img
                                class="release-cover"
                                src="${escapeHTML(image)}"
                                alt="${escapeHTML(title)}"
                                loading="lazy"
                            >
                        `
                        : `
                            <div class="release-cover release-cover-empty">
                                ♪
                            </div>
                        `
                }

                <div class="release-information">

                    <div class="release-type">
                        ${escapeHTML(
                            type ? type.toUpperCase() : "SORTIE"
                        )}
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

                    ${
                        url
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
                            : ""
                    }

                </div>

            </article>
        `;
    })
    .join("");
```

}

/* =========================================================
GESTION DES ERREURS
========================================================= */

function showError(message) {
const container = $("release-list");

```
if (!container) {
    return;
}

container.innerHTML = `
    <div class="empty">
        <strong>Impossible de charger les sorties</strong>
        <p>${escapeHTML(message)}</p>
    </div>
`;

if ($("release-count")) {
    $("release-count").textContent = "0";
}
```

}

/* =========================================================
INITIALISATION
========================================================= */

async function initialize() {
displayCurrentDate();

```
try {
    releases = await loadReleases();

    console.log(`${releases.length} sortie(s) chargée(s)`);

    console.log(
        "Date actuelle à Paris :",
        getTodayParis()
    );

    console.log(
        "Date limite des sorties :",
        getReleaseCutoffDate()
    );

    renderReleases();

} catch (error) {
    console.error(
        "Erreur lors du chargement des sorties :",
        error
    );

    showError(
        error.message || "Une erreur inconnue est survenue."
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
