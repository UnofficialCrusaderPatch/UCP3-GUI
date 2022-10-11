import { createSearchParams, useSearchParams } from "react-router-dom";
import { showError } from "./dialog-util";
import { GuiConfigHandler } from "./gui-config-handling";
import { useGuiConfig } from "./swr-components";

// returns normal search params, but setSearchParams expects object and boolean
export function customUseSearchParams(): [
    URLSearchParams,
    (newParams: { [keys: string]: string | string[] }, keepNonOverwritten?: boolean) => void
] {
    const [searchParams, setSearchParams] = useSearchParams();
    return [searchParams, (newParams, keepNonOverwritten = true) => {
        setSearchParams(createSearchParams(keepNonOverwritten ? { ...searchParams, ...newParams } : newParams));
    }];
}

export function useLanguageSetter(): (lang: string) => void {
    const [_, setSearchParams] = customUseSearchParams();
    const configResult = useGuiConfig();

    return (lang: string) => {
        if (configResult.isLoading) {
            showError(`Failed to set language, because the GuiConfigHandler was not ready.`, "Language Configuration");
            return;
        }
        if (!lang) {
            showError(`Failed to set language, because 'undefined' was received.`, "Language Configuration");
            return;
        }
        const configHandler = configResult.data as GuiConfigHandler;
        configHandler.setLanguage(lang);
        setSearchParams({ lang: lang });
    };
}