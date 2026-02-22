import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

// Cycle order: EN → ZH → IT → EN …
const LANGUAGES = ['en', 'zh', 'it'] as const;
type Lang = typeof LANGUAGES[number];

const LANG_LABELS: Record<Lang, string> = {
    en: 'EN',
    zh: '中',
    it: 'IT',
};

export const LanguageSwitcher = () => {
    const { i18n, t } = useTranslation();

    // Normalise to base code: 'en-US' → 'en'
    const current = (i18n.language?.split('-')[0] ?? 'en') as Lang;
    const currentIndex = LANGUAGES.indexOf(current);

    const next: Lang = LANGUAGES[(currentIndex + 1) % LANGUAGES.length];

    const toggle = () => {
        i18n.changeLanguage(next);
    };

    return (
        <button
            onClick={toggle}
            className="flex items-center space-x-1 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors px-2 py-1 rounded-md hover:bg-gray-100"
            title={t('language_switch')}
        >
            <Globe size={16} />
            <span className="text-xs font-bold">{LANG_LABELS[current]}</span>
        </button>
    );
};
