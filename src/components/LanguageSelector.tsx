'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check, Globe } from 'lucide-react';
import { Language, LanguageSelectorProps } from '@/types/translation';

// Supported languages with their codes and names
const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'original', name: 'Original', nativeName: 'Original' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '中文 (简体)' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '中文 (繁體)' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina' },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti' },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu' },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली' },
  { code: 'si', name: 'Sinhala', nativeName: 'සිංහල' },
  { code: 'my', name: 'Myanmar', nativeName: 'မြန်မာ' },
  { code: 'km', name: 'Khmer', nativeName: 'ខ្មែរ' },
  { code: 'lo', name: 'Lao', nativeName: 'ລາວ' },
  { code: 'ka', name: 'Georgian', nativeName: 'ქართული' },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
  { code: 'zu', name: 'Zulu', nativeName: 'isiZulu' },
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans' },
  { code: 'sq', name: 'Albanian', nativeName: 'Shqip' },
  { code: 'eu', name: 'Basque', nativeName: 'Euskera' },
  { code: 'be', name: 'Belarusian', nativeName: 'Беларуская' },
  { code: 'bs', name: 'Bosnian', nativeName: 'Bosanski' },
  { code: 'ca', name: 'Catalan', nativeName: 'Català' },
  { code: 'cy', name: 'Welsh', nativeName: 'Cymraeg' },
  { code: 'eo', name: 'Esperanto', nativeName: 'Esperanto' },
  { code: 'gl', name: 'Galician', nativeName: 'Galego' },
  { code: 'is', name: 'Icelandic', nativeName: 'Íslenska' },
  { code: 'ga', name: 'Irish', nativeName: 'Gaeilge' },
  { code: 'mk', name: 'Macedonian', nativeName: 'Македонски' },
  { code: 'mt', name: 'Maltese', nativeName: 'Malti' },
  { code: 'mn', name: 'Mongolian', nativeName: 'Монгол' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
  { code: 'uz', name: 'Uzbek', nativeName: 'Oʻzbekcha' },
  // Additional languages from Microsoft Translator
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'tl', name: 'Filipino', nativeName: 'Filipino' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
  { code: 'kk', name: 'Kazakh', nativeName: 'Қазақ тілі' },
  { code: 'ky', name: 'Kyrgyz', nativeName: 'Кыргызча' },
  { code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycan dili' },
  { code: 'hy', name: 'Armenian', nativeName: 'Հայերեն' },
  { code: 'ps', name: 'Pashto', nativeName: 'پښتو' },
  { code: 'sd', name: 'Sindhi', nativeName: 'سنڌي' },
  { code: 'ku', name: 'Kurdish', nativeName: 'Kurdî' },
  { code: 'ckb', name: 'Kurdish (Sorani)', nativeName: 'کوردی' },
  { code: 'ig', name: 'Igbo', nativeName: 'Igbo' },
  { code: 'yo', name: 'Yoruba', nativeName: 'Yorùbá' },
  { code: 'ha', name: 'Hausa', nativeName: 'Hausa' },
  { code: 'rw', name: 'Kinyarwanda', nativeName: 'Ikinyarwanda' },
  { code: 'mg', name: 'Malagasy', nativeName: 'Malagasy' },
  { code: 'ny', name: 'Chichewa', nativeName: 'Chichewa' },
  { code: 'sn', name: 'Shona', nativeName: 'chiShona' },
  { code: 'so', name: 'Somali', nativeName: 'Soomaali' },
  { code: 'xh', name: 'Xhosa', nativeName: 'isiXhosa' },
  { code: 'st', name: 'Sesotho', nativeName: 'Sesotho' },
  { code: 'tn', name: 'Setswana', nativeName: 'Setswana' },
  { code: 'ts', name: 'Tsonga', nativeName: 'Xitsonga' },
  { code: 've', name: 'Venda', nativeName: 'Tshivenḓa' },
  { code: 'ss', name: 'Swati', nativeName: 'SiSwati' },
  { code: 'nr', name: 'Ndebele', nativeName: 'isiNdebele' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
  { code: 'mai', name: 'Maithili', nativeName: 'मैथिली' },
  { code: 'bho', name: 'Bhojpuri', nativeName: 'भोजपुरी' },
  { code: 'gom', name: 'Konkani', nativeName: 'कोंकणी' },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्' },
  { code: 'dv', name: 'Dhivehi', nativeName: 'ދިވެހި' },
  { code: 'mni', name: 'Manipuri', nativeName: 'মৈতৈলোন্' },
  { code: 'brx', name: 'Bodo', nativeName: 'बर\'' },
  { code: 'doi', name: 'Dogri', nativeName: 'डोगरी' },
  { code: 'ks', name: 'Kashmiri', nativeName: 'کٲشُر' },
  { code: 'sat', name: 'Santali', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ' },
  { code: 'lus', name: 'Mizo', nativeName: 'Mizo ṭawng' },
  { code: 'mni-Mtei', name: 'Meiteilon (Manipuri)', nativeName: 'ꯃꯩꯇꯩꯂꯣꯟ' },
];

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onLanguageChange,
  placeholder = 'Select language',
  disabled = false,
  showNativeNames = true,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter languages based on search term
  const filteredLanguages = SUPPORTED_LANGUAGES.filter((language) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      language.name.toLowerCase().includes(searchLower) ||
      language.nativeName.toLowerCase().includes(searchLower) ||
      language.code.toLowerCase().includes(searchLower)
    );
  });

  // Get selected language object
  const selectedLangObj = SUPPORTED_LANGUAGES.find(
    (lang) => lang.code === selectedLanguage
  );

  // Detect touch device
  useEffect(() => {
    const checkTouchDevice = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    
    checkTouchDevice();
    window.addEventListener('resize', checkTouchDevice);
    
    return () => {
      window.removeEventListener('resize', checkTouchDevice);
    };
  }, []);

  // Scroll to focused item with optimized performance for mobile
  const scrollToFocusedItem = (index: number) => {
    if (listRef.current && index >= 0 && index < filteredLanguages.length) {
      const listElement = listRef.current;
      const itemHeight = 56; // Approximate height of each language item
      const scrollTop = index * itemHeight;
      const containerHeight = listElement.clientHeight;
      const currentScrollTop = listElement.scrollTop;

      // Only scroll if the item is not fully visible
      if (scrollTop < currentScrollTop || scrollTop + itemHeight > currentScrollTop + containerHeight) {
        // Use requestAnimationFrame for better performance on mobile
        requestAnimationFrame(() => {
          listElement.scrollTo({
            top: Math.max(0, scrollTop - containerHeight / 2 + itemHeight / 2),
            behavior: isTouchDevice ? 'auto' : 'smooth' // Disable smooth scrolling on touch devices for better performance
          });
        });
      }
    }
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      // Delay focus on mobile to prevent keyboard issues
      if (isTouchDevice) {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 100);
      } else {
        searchInputRef.current.focus();
      }
      setFocusedIndex(-1);
    }
  }, [isOpen, isTouchDevice]);

  // Reset focused index when filtered languages change
  useEffect(() => {
    setFocusedIndex(-1);
  }, [filteredLanguages.length]);

  const handleLanguageSelect = (language: Language) => {
    onLanguageChange(language.code);
    setIsOpen(false);
    setSearchTerm('');
    setFocusedIndex(-1);
  };

  const handleToggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      setSearchTerm('');
      setFocusedIndex(-1);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
      setFocusedIndex(-1);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = Math.min(focusedIndex + 1, filteredLanguages.length - 1);
      setFocusedIndex(nextIndex);
      scrollToFocusedItem(nextIndex);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prevIndex = Math.max(focusedIndex - 1, 0);
      setFocusedIndex(prevIndex);
      scrollToFocusedItem(prevIndex);
    } else if (event.key === 'Enter' && focusedIndex >= 0) {
      event.preventDefault();
      handleLanguageSelect(filteredLanguages[focusedIndex]);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setFocusedIndex(0);
      scrollToFocusedItem(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      const lastIndex = filteredLanguages.length - 1;
      setFocusedIndex(lastIndex);
      scrollToFocusedItem(lastIndex);
    }
  };

  // Handle touch interactions
  const handleTouchStart = (event: React.TouchEvent) => {
    // Prevent default to avoid unwanted behaviors on mobile
    if (event.target !== searchInputRef.current) {
      event.preventDefault();
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggleDropdown}
        disabled={disabled}
        className={`
          flex items-center justify-between w-full px-3 py-2 text-sm
          bg-white border border-gray-300 rounded-md shadow-sm
          hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50
          transition-colors duration-200
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select language"
      >
        <div className="flex items-center space-x-2">
          <Globe className="w-4 h-4 text-gray-500" />
          <span className="text-left truncate">
            {selectedLangObj ? (
              <span>
                {selectedLangObj.name}
                {showNativeNames && selectedLangObj.nativeName !== selectedLangObj.name && (
                  <span className="text-gray-500 ml-1">({selectedLangObj.nativeName})</span>
                )}
              </span>
            ) : (
              <span className="text-gray-500">{placeholder}</span>
            )}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg flex flex-col"
          onTouchStart={handleTouchStart}
          style={{ maxHeight: '400px' }}
        >
          {/* Search Input */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search languages..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
              />
            </div>
          </div>

          {/* Language List */}
          <div 
            ref={listRef}
            className="flex-1 overflow-y-auto"
            style={{ 
              maxHeight: '320px',
              minHeight: '200px'
            }}
          >
            <style jsx>{`
              .scrollbar-smooth::-webkit-scrollbar {
                width: ${isTouchDevice ? '12px' : '8px'};
              }
              .scrollbar-smooth::-webkit-scrollbar-track {
                background: #f1f5f9;
                border-radius: 4px;
              }
              .scrollbar-smooth::-webkit-scrollbar-thumb {
                background: ${isTouchDevice ? '#94a3b8' : '#cbd5e1'};
                border-radius: 4px;
                transition: background-color 0.2s ease;
              }
              .scrollbar-smooth::-webkit-scrollbar-thumb:hover {
                background: #94a3b8;
              }
              .scrollbar-smooth::-webkit-scrollbar-thumb:active {
                background: #64748b;
              }
              @media (max-width: 768px) {
                .scrollbar-smooth::-webkit-scrollbar {
                  width: 14px;
                }
                .scrollbar-smooth::-webkit-scrollbar-thumb {
                  background: #94a3b8;
                  min-height: 40px;
                }
              }
            `}</style>
            {filteredLanguages.length > 0 ? (
              filteredLanguages.map((language, index) => (
                <button
                  key={language.code}
                  type="button"
                  onClick={() => handleLanguageSelect(language)}
                  onMouseEnter={() => !isTouchDevice && setFocusedIndex(index)}
                  className={`
                    w-full px-3 py-2 text-left text-sm hover:bg-gray-100
                    focus:outline-none focus:bg-gray-100
                    flex items-center justify-between
                    transition-all duration-200 ease-in-out
                    ${isTouchDevice ? '' : 'transform hover:scale-[1.02] active:scale-[0.98]'}
                    ${
                      selectedLanguage === language.code
                        ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-500'
                        : 'text-gray-900'
                    }
                    ${
                      focusedIndex === index && !isTouchDevice
                        ? 'bg-gray-100 ring-2 ring-blue-300 ring-inset'
                        : ''
                    }
                  `}
                  role="option"
                  aria-selected={selectedLanguage === language.code}
                  tabIndex={-1}
                  style={{
                    minHeight: isTouchDevice ? '48px' : '40px', // Larger touch targets on mobile
                    touchAction: 'manipulation' // Optimize touch interactions
                  }}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{language.name}</span>
                    {showNativeNames && language.nativeName !== language.name && (
                      <span className="text-xs text-gray-500">{language.nativeName}</span>
                    )}
                  </div>
                  {selectedLanguage === language.code && (
                    <Check className="w-4 h-4 text-blue-600" />
                  )}
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                No languages found matching &quot;{searchTerm}&quot;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
export { SUPPORTED_LANGUAGES };