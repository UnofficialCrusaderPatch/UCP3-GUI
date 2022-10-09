import { useEffect, useState } from "react";
import { TFunction, useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { KeyedMutator } from "swr";
import useSWRImmutable from "swr/immutable";    // only fetches once
import { GuiConfigHandler } from "./gui-config-handling";
import { registerForWindowClose } from "./tauri-hooks";

interface SwrResult<T> {
    data: T | undefined,
    isLoading: boolean,
    isError: boolean,
    mutate: KeyedMutator<T>
}

// keys are used to identify and cache the request, so they need to be unique for different sources
const SWR_KEYS = {
    GUI_CONFIG: "ucp.gui.config",
    LANGUAGE_LOAD: "ucp.lang.load"
};

export function useGuiConfig(): SwrResult<GuiConfigHandler> {
    const { data, error, mutate } = useSWRImmutable(SWR_KEYS.GUI_CONFIG, async () => {
        const guiConfig = new GuiConfigHandler();
        await guiConfig.loadGuiConfig();
        registerForWindowClose(SWR_KEYS.GUI_CONFIG, async () => {
            await guiConfig.saveGuiConfig();    // no idea if need to keep object binding
        });
        return guiConfig;
    });
    return {
        data: data,
        isLoading: !data,
        isError: !!error,
        mutate
    };
}

export function useLanguage(): SwrResult<TFunction> {
    const [searchParams] = useSearchParams();
    const [lang, setLang] = useState<string>();
    const { i18n } = useTranslation();
    const paramLanguage = searchParams.get('lang');

    const { data, error, mutate } = useSWRImmutable(SWR_KEYS.LANGUAGE_LOAD, async () => {
        return await i18n.changeLanguage(paramLanguage || undefined);
    });

    // always called
    useEffect(() => {
        if (paramLanguage && paramLanguage !== lang && i18n.language !== paramLanguage) {
            setLang(paramLanguage);
            mutate();
        }
    });
    return {
        data: data,
        isLoading: !data,
        isError: !!error,
        mutate
    };
}