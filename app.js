"use strict";

const RELEASES_FILE =
    "https://pierre-011.github.io/spotify-artists/data/sorties.json";

let releases = [];

/* =========================================================
   UTILITAIRES
   ========================================================= */

const $ = id => document.getElementById(id);

function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function normalizeText(value) {
    return String(value ?? "").toLocaleLowerCase("fr-FR");
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

    const result = {};

    for (const part of parts) {
        if (part.type !== "literal") {
            result[part.type] = part.value;
        }
    }

    return `${result.year}-${result.month}-${result.day}`;
}

function normalizeDate(value) {
    if (!value) {
        return "";
    }

    const string = String(value).trim();

    // Format ISO : AAAA-MM-JJ
    const iso = string.match(/^(\d{4}-\d{2}-\d{2})/);

    if (iso) {
        return iso[1];
    }

    // Format français : JJ/MM/AAAA
    const french = string.match(/^(\d{2})\/(\d{2})\/(\d{4})/);

    if (french) {
        return `${french[3]}-${french[2]}-${french[1]}`;
    }

    return "";
}

function formatDate(value) {
    const normalized = normalizeDate(value);

    if (!normalized) {
        return "—";
    }

    const [year, month, day] = normalized.split("-");

    return `${day}/${month}/${year}`;
}

function formatReadableDate(value) {
    const normalized = normalizeDate(value);

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
}

/*
 * Aujourd'hui inclus, la période couvre 14 jours calendaires.
 * Exemple : du 30 septembre au 13 octobre inclus.
 */

function getStartDate() {
    const today = getTodayParis();
    const date = new Date(`${today}T12:00:00`);

    date.setDate(date.getDate() - 13);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

/* =========================================================
   CHARGEMENT DES DONNÉES
   ========================================================= */

async function loadReleases() {
    const response = await fetch(RELEASES_FILE, {
        cache: "no-store"
    });

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
}

/* =========================================================
   DONNÉES D'UNE SORTIE
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

    const text = [
        getReleaseTitle(release),
        getReleaseArtist(release),
        release?.album_name,
        release?.albumName
    ]
        .filter(Boolean)
        .join(" ");

    return normalizeText(text).includes(search);
}

/* =========================================================
   INTERFACE
   ========================================================= */

function displayCurrentDate() {
    const today = getTodayParis();

    if ($("current-date")) {
        $("current-date").textContent = formatDate(today);
    }

    if ($("release-title")) {
        $("release-title").textContent = "Dernières sorties";
    }

    if ($("release-description")) {
        $("release-description").textContent =
            "Les 10 sorties les plus récentes des 14 derniers jours";
    }
}

/* =========================================================
   AFFICHAGE DES SORTIES
   ========================================================= */

function renderReleases() {
    const container = $("release-list");

    if (!container) {
        return;
    }

    const search = normalizeText(
        $("release-search")?.value?.trim() || ""
    );

    const today = getTodayParis();
    const startDate = getStartDate();

    /*
     * 1. Conserver les sorties des 14 derniers jours.
     * 2. Trier de la plus récente à la plus ancienne.
     * 3. Limiter à 10 sorties.
     */

    const recentReleases = releases
        .filter(release => {
            const date = getReleaseDate(release);

            return (
                date !== "" &&
                date >= startDate &&
                date <= today
            );
        })
        .sort((a, b) => {
            const dateA = getReleaseDate(a);
            const dateB = getReleaseDate(b);

            // Dates décroissantes : plus récent en premier
            if (dateA !== dateB) {
                return dateB.localeCompare(dateA);
            }

            // Même date : classement alphabétique
            return getReleaseTitle(a).localeCompare(
                getReleaseTitle(b),
                "fr-FR",
                { sensitivity: "base" }
            );
        })
        .slice(0, 10);

    /*
     * La recherche s'applique aux 10 sorties sélectionnées.
     */

    const visibleReleases = recentReleases.filter(release =>
        matchesSearch(release, search)
    );

    // Mise à jour du compteur
    if ($("release-count")) {
        $("release-count").textContent =
            formatNumber(visibleReleases.length);
    }

    // Aucune sortie disponible
    if (!visibleReleases.length) {
        container.innerHTML = `
            <div class="empty">
                Aucune sortie trouvée au cours des 14 derniers jours.
            </div>
        `;

        return;
    }

    // Création des cartes de sortie
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
}

/* =========================================================
   GESTION DES ERREURS
   ========================================================= */

function showError(message) {
    const container = $("release-list");

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
}

/* =========================================================
   INITIALISATION
   ========================================================= */

async function initialize() {
    displayCurrentDate();

    try {
        releases = await loadReleases();

        console.log(
            `${releases.length} sortie(s) chargée(s)`
        );

        renderReleases();

    } catch (error) {
        console.error(
            "Erreur lors du chargement :",
            error
        );

        showError(
            error.message || "Une erreur inconnue est survenue."
        );
    }
}

/* =========================================================
   RECHERCHE ET DÉMARRAGE
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    const searchInput = $("release-search");

    if (searchInput) {
        searchInput.addEventListener(
            "input",
            renderReleases
        );
    }

    initialize();
});
