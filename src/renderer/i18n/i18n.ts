// Tut Source: https://phrase.com/blog/posts/localizing-react-apps-with-i18next/

import i18next from "i18next";
import resourcesToBackend from "i18next-resources-to-backend";
import { initReactI18next } from "react-i18next";

const resources = {
    en: {
        general: {
            loading: "Loading...",
        },
        landing: {
            title: "Welcome to Unofficial Crusader Patch 3",
            selectfolder: "Browse to a Stronghold Crusader installation folder to get started:",
            launch: "Launch",
            oldfolders: "Use one of the recently used folders:",
        },
        editor: {
            overview: {
                folderversion: "UCP version in this folder:",
                title: "Overview",
            } 
        },
    },
    de: {
        general: {
            loading: "Laden...",
        },
        landing: {
            title: "Willkommen zum Unofficial Crusader Patch 3",
            selectfolder: "Wähle einen Stronghold Crusader Installationsordner um anzufangen:",
            launch: "Start",
            oldfolders: "Nutze einen der vorherigen Ordner:",
        },
        editor: {
            overview: {
                folderversion: "UCP Version in diesem Ordner:",
                title: "Übersicht",
            } 
        },
    },
};

i18next
    .use(initReactI18next)
    // source: https://www.i18next.com/how-to/add-or-load-translations#lazy-load-in-memory-translations
    .use(resourcesToBackend((language, namespace, callback) => {
        import(`./sources/${language}/${namespace}.json`)
            .then(({ default: resources }) => {
                callback(null, resources)
            })
            .catch((error) => {
                callback(error, null)
            })
    }))
    .init({
        resources,
        fallbackLng: "en",
        interpolation: {
            escapeValue: false,
        },
    });

export default i18next;