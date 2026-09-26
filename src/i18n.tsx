import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Locale = 'en' | 'zh-TW';

const STORAGE_KEY = 'color-palette-locale';
const messages = {
  en: {
    appTitle: 'Color Palette', appDescription: 'Enter a hex color to generate palettes and theme tokens.',
    language: 'Language', english: 'English', traditionalChinese: '繁體中文', light: 'Light', dark: 'Dark', both: 'Both',
    switchToLight: 'Switch to light theme', switchToDark: 'Switch to dark theme', manualTheme: 'Manually selected', followSystem: 'Following system',
    eyedropper: 'Pick color', savePalette: 'Save Palette', saved: 'Saved ✓', savedPalettes: 'Saved Palettes',
    scale: 'Scale (50 → 950)', analogous: 'Analogous', monochromatic: 'Monochromatic', complementary: 'Complementary', splitComplementary: 'Split Complementary', triad: 'Triad', shades: 'Shades',
    previewTheme: 'Preview theme', style: 'Style', styleBalanced: 'Balanced', stylePastel: 'Pastel', styleVintage: 'Vintage', copyCss: 'Copy CSS variables', copiedCss: 'CSS copied ✓', colorSwatches: 'Color swatches and WCAG checks (click a swatch to copy)', copied: 'Copied!', copyHex: 'Copy {hex}',
    invalidHex: 'Invalid hex ({value}). Enter a #RRGGBB color.', contrastWarning: 'Contrast checks failed. Try another seed color.', wcagPass: 'checks passed ✔', wcagFail: 'checks failed ✘', needsRatio: '(needs ≥ {ratio}:1)',
    picking: 'Picking color… Move the mouse and left-click to confirm, or right-click to cancel.', appPreview: 'App', revenue: 'Revenue', users: 'Users', growth: 'Growth', projectAlpha: 'Project Alpha', search: 'Search anything...', unpublished: 'Unpublished changes will be lost.', continue: 'Continue', cancel: 'Cancel', delete: 'Delete', active: 'Active', featured: 'Featured', pending: 'Pending', draft: 'Draft', design: 'Design', dev: 'Dev', review: 'Review', seedHex: 'Seed color hex', colorPicker: 'Choose a color', lightPalette: 'Light palette', darkPalette: 'Dark palette',
    bodyBackground: 'Body / background', mutedTextBackground: 'Muted text / background', primaryBackground: 'Primary / background (component)', onPrimary: 'Text on primary / primary', accentBackground: 'Accent / background (component)', semanticBackground: 'Success / background (component)', onSemantic: 'Text on success / success', semanticMuted: 'Success text / light success background', warningBackground: 'Warning / background (component)', onWarning: 'Text on warning / warning', warningMuted: 'Warning text / light warning background', dangerBackground: 'Danger / background (component)', onDanger: 'Text on danger / danger', dangerMuted: 'Danger text / light danger background',
  },
  'zh-TW': {
    appTitle: '色彩配色器', appDescription: '輸入 hex 顏色，生成配色方案與主題色彩 token。',
    language: '語言', english: 'English', traditionalChinese: '繁體中文', light: '亮色', dark: '暗色', both: '兩者',
    switchToLight: '切換為亮色主題', switchToDark: '切換為暗色主題', manualTheme: '已手動選擇', followSystem: '跟隨系統中',
    eyedropper: '取色', savePalette: '儲存色板', saved: '已儲存 ✓', savedPalettes: '已儲存色板',
    scale: '色階（50 → 950）', analogous: '類似色', monochromatic: '單色', complementary: '互補色', splitComplementary: '分裂互補色', triad: '三角色', shades: '陰影色',
    previewTheme: '預覽主題', style: '風格', styleBalanced: '平衡', stylePastel: '粉彩', styleVintage: '復古', copyCss: '複製 CSS 變數', copiedCss: '已複製 CSS ✓', colorSwatches: '色票與 WCAG 自檢（點色票複製）', copied: '已複製!', copyHex: '複製 {hex}',
    invalidHex: '無效的 hex（{value}），請輸入 #RRGGBB 顏色。', contrastWarning: '對比度自檢未通過，請換個種子色。', wcagPass: '全部達標 ✔', wcagFail: '有未達標 ✘', needsRatio: '（需 ≥ {ratio}:1）',
    picking: '取色中… 移動滑鼠後左鍵確認，或按右鍵取消。', appPreview: '應用程式', revenue: '營收', users: '使用者', growth: '成長', projectAlpha: 'Alpha 專案', search: '搜尋任何內容……', unpublished: '未發布的變更將會遺失。', continue: '繼續', cancel: '取消', delete: '刪除', active: '啟用中', featured: '精選', pending: '待處理', draft: '草稿', design: '設計', dev: '開發', review: '審查', seedHex: '種子色 hex', colorPicker: '使用取色器選擇顏色', lightPalette: '亮色色板', darkPalette: '暗色色板',
    bodyBackground: '正文／背景', mutedTextBackground: '次要文字／背景', primaryBackground: '主色／背景（元件）', onPrimary: '主色上的文字／主色', accentBackground: '強調色／背景（元件）', semanticBackground: '成功色／背景（元件）', onSemantic: '成功色上的文字／成功色', semanticMuted: '成功色文字／成功淺底', warningBackground: '警告色／背景（元件）', onWarning: '警告色上的文字／警告色', warningMuted: '警告色文字／警告淺底', dangerBackground: '危險色／背景（元件）', onDanger: '危險色上的文字／危險色', dangerMuted: '危險色文字／危險淺底',
  },
} as const;

export type MessageKey = keyof typeof messages.en;
type Translator = (key: MessageKey, values?: Record<string, string | number>) => string;
interface LocaleContextValue { locale: Locale; setLocale: (locale: Locale) => void; t: Translator }
const LocaleContext = createContext<LocaleContextValue | null>(null);

function readLocale(): Locale {
  try { return localStorage.getItem(STORAGE_KEY) === 'zh-TW' ? 'zh-TW' : 'en'; } catch { return 'en'; }
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(readLocale);
  useEffect(() => {
    document.documentElement.lang = locale;
    try { localStorage.setItem(STORAGE_KEY, locale); } catch { /* session-only fallback */ }
  }, [locale]);
  const value = useMemo<LocaleContextValue>(() => ({
    locale, setLocale,
    t: (key, values = {}) => {
      let text: string = messages[locale][key];
      for (const [name, replacement] of Object.entries(values)) {
        text = text.replaceAll(`{${name}}`, String(replacement));
      }
      return text;
    },
  }), [locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) throw new Error('useLocale must be used inside LocaleProvider');
  return value;
}
