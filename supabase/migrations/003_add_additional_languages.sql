-- Add additional supported languages to the translation system
-- This migration adds more languages supported by Microsoft Translator

INSERT INTO supported_languages (code, name, native_name, flag_emoji) VALUES
-- Southeast Asian languages
('id', 'Indonesian', 'Bahasa Indonesia', '🇮🇩'),
('ms', 'Malay', 'Bahasa Melayu', '🇲🇾'),
('tl', 'Filipino', 'Filipino', '🇵🇭'),

-- European languages
('el', 'Greek', 'Ελληνικά', '🇬🇷'),
('lv', 'Latvian', 'Latviešu', '🇱🇻'),
('lt', 'Lithuanian', 'Lietuvių', '🇱🇹'),

-- Central Asian languages
('kk', 'Kazakh', 'Қазақ тілі', '🇰🇿'),
('ky', 'Kyrgyz', 'Кыргызча', '🇰🇬'),
('az', 'Azerbaijani', 'Azərbaycan dili', '🇦🇿'),
('hy', 'Armenian', 'Հայերեն', '🇦🇲'),

-- Middle Eastern languages
('ps', 'Pashto', 'پښتو', '🇦🇫'),
('sd', 'Sindhi', 'سنڌي', '🇵🇰'),
('ku', 'Kurdish', 'Kurdî', '🇹🇷'),
('ckb', 'Kurdish (Sorani)', 'کوردی', '🇮🇶'),

-- African languages
('ig', 'Igbo', 'Igbo', '🇳🇬'),
('yo', 'Yoruba', 'Yorùbá', '🇳🇬'),
('ha', 'Hausa', 'Hausa', '🇳🇬'),
('rw', 'Kinyarwanda', 'Ikinyarwanda', '🇷🇼'),
('mg', 'Malagasy', 'Malagasy', '🇲🇬'),
('ny', 'Chichewa', 'Chichewa', '🇲🇼'),
('sn', 'Shona', 'chiShona', '🇿🇼'),
('so', 'Somali', 'Soomaali', '🇸🇴'),
('xh', 'Xhosa', 'isiXhosa', '🇿🇦'),
('st', 'Sesotho', 'Sesotho', '🇱🇸'),
('tn', 'Setswana', 'Setswana', '🇧🇼'),
('ts', 'Tsonga', 'Xitsonga', '🇿🇦'),
('ve', 'Venda', 'Tshivenḓa', '🇿🇦'),
('ss', 'Swati', 'SiSwati', '🇸🇿'),
('nr', 'Ndebele', 'isiNdebele', '🇿🇦'),

-- Indian subcontinent languages
('as', 'Assamese', 'অসমীয়া', '🇮🇳'),
('or', 'Odia', 'ଓଡ଼ିଆ', '🇮🇳'),
('mai', 'Maithili', 'मैथिली', '🇮🇳'),
('bho', 'Bhojpuri', 'भोजपुरी', '🇮🇳'),
('gom', 'Konkani', 'कोंकणी', '🇮🇳'),
('sa', 'Sanskrit', 'संस्कृतम्', '🇮🇳'),
('dv', 'Dhivehi', 'ދިވެހި', '🇲🇻'),
('mni', 'Manipuri', 'মৈতৈলোন্', '🇮🇳'),
('brx', 'Bodo', 'बर\'', '🇮🇳'),
('doi', 'Dogri', 'डोगरी', '🇮🇳'),
('ks', 'Kashmiri', 'کٲشُر', '🇮🇳'),
('sat', 'Santali', 'ᱥᱟᱱᱛᱟᱲᱤ', '🇮🇳'),
('lus', 'Mizo', 'Mizo ṭawng', '🇮🇳'),
('mni-Mtei', 'Meiteilon (Manipuri)', 'ꯃꯩꯇꯩꯂꯣꯟ', '🇮🇳')

ON CONFLICT (code) DO NOTHING;