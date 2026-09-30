import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Locale = 'en' | 'zh-TW';

const STORAGE_KEY = 'color-palette-locale';
const messages = {
  en: {
    tuningTab: 'Tuning', previewTab: 'Preview', libraryTab: 'Saved palettes',
    expandLayout: 'Expand preview', collapseLayout: 'Collapse tools', workspaceTools: 'Palette tools',
    appTitle: 'Color Palette', appDescription: 'Enter a hex color to generate palettes and theme tokens.',
    language: 'Language', english: 'English', traditionalChinese: '繁體中文', light: 'Light', dark: 'Dark', both: 'Both',
    switchToLight: 'Switch to light theme', switchToDark: 'Switch to dark theme', manualTheme: 'Manually selected', followSystem: 'Following system',
    eyedropper: 'Pick color', savePalette: 'Save Palette', saved: 'Saved ✓', savedPalettes: 'Saved Palettes',
    scale: 'Scale (50 → 950)', analogous: 'Analogous', monochromatic: 'Monochromatic', complementary: 'Complementary', splitComplementary: 'Split Complementary', triad: 'Triad', shades: 'Shades',
    previewTheme: 'Preview theme', style: 'Style', styleBalanced: 'Balanced', stylePastel: 'Pastel', styleVintage: 'Vintage', copyCss: 'Copy CSS', colorSwatches: 'All color tokens', copied: 'Copied!', copyHex: 'Copy {hex}',
    invalidHex: 'Invalid hex ({value}). Enter a #RRGGBB color.', picking: 'Picking color… Move the mouse and left-click to confirm, or right-click to cancel.', appPreview: 'App', revenue: 'Revenue', users: 'Users', growth: 'Growth', projectAlpha: 'Project Alpha', search: 'Search anything...', unpublished: 'Unpublished changes will be lost.', continue: 'Continue', cancel: 'Cancel', delete: 'Delete', active: 'Active', featured: 'Featured', pending: 'Pending', draft: 'Draft', design: 'Design', dev: 'Dev', review: 'Review', seedHex: 'Seed color hex', colorPicker: 'Choose a color', lightPalette: 'Light palette', darkPalette: 'Dark palette',
    previewDashboard: 'Dashboard', previewLanding: 'Landing page', previewForm: 'Form', copyJson: 'Copy JSON', previewTitle: 'Preview sample',
    landingTagline: 'Design for what matters', landingHeading: 'Thoughtful spaces for new ideas.', landingDescription: 'A sample landing page to see your palette in context.', creativeDirection: 'Creative direction', creativeDescription: 'Explore the surface and text pairing.', brandSystems: 'Brand systems', brandDescription: 'Keep every screen consistent.', welcomeBack: 'Welcome back', signInDescription: 'Sign in to continue your work.', emailAddress: 'Email address', password: 'Password', passwordError: 'Please check your password.', resetInfo: 'You can reset it at any time.', rememberMe: 'Remember me', signIn: 'Sign in', continueLater: 'Continue later',
    copyFailed: 'Could not copy. Check clipboard permission and try again.',
    colorOne: 'Base color', colorTwo: 'Accent color', generatedColor: 'Generated color', wheelTitle: 'Interactive color wheel', wheelHint: 'Double rings: input colors · Drag to explore', harmony: 'Harmony', brightness: 'Brightness', adjustedColors: 'Adjusted HEX', morePalettes: 'More palettes', outputs: 'Copy output', copyTailwind: 'Copy Tailwind', loadPalette: 'Load palette {hex}',
    advancedTuning: 'Advanced tuning', tuneHue: 'Hue shift', tuneLightness: 'Lightness', tuneChroma: 'Chroma', tuningHint: 'OKLCH adjustments update the theme preview and HEX swatches.', resetTuning: 'Reset tuning',
    paletteSaved: 'Palette saved.', storageError: 'Unable to save locally. Check browser storage.', deleteSavedPalette: 'Delete saved palette {name}', libraryEmpty: 'Save a palette, then click its color strip to restore it.',
  },
  'zh-TW': {
    tuningTab: '微調', previewTab: '預覽', libraryTab: '已存色板',
    expandLayout: '展開預覽', collapseLayout: '收起工具區', workspaceTools: '色板工具',
    appTitle: '色彩配色器', appDescription: '輸入 hex 顏色，生成配色方案與主題色彩 token。',
    language: '語言', english: 'English', traditionalChinese: '繁體中文', light: '亮色', dark: '暗色', both: '兩者',
    switchToLight: '切換為亮色主題', switchToDark: '切換為暗色主題', manualTheme: '已手動選擇', followSystem: '跟隨系統中',
    eyedropper: '取色', savePalette: '儲存色板', saved: '已儲存 ✓', savedPalettes: '已儲存色板',
    scale: '色階（50 → 950）', analogous: '類似色', monochromatic: '單色', complementary: '互補色', splitComplementary: '分裂互補色', triad: '三角色', shades: '陰影色',
    previewTheme: '預覽主題', style: '風格', styleBalanced: '平衡', stylePastel: '粉彩', styleVintage: '復古', copyCss: '複製 CSS', colorSwatches: '完整色票', copied: '已複製!', copyHex: '複製 {hex}',
    invalidHex: '無效的 hex（{value}），請輸入 #RRGGBB 顏色。', picking: '取色中… 移動滑鼠後左鍵確認，或按右鍵取消。', appPreview: '應用程式', revenue: '營收', users: '使用者', growth: '成長', projectAlpha: 'Alpha 專案', search: '搜尋任何內容……', unpublished: '未發布的變更將會遺失。', continue: '繼續', cancel: '取消', delete: '刪除', active: '啟用中', featured: '精選', pending: '待處理', draft: '草稿', design: '設計', dev: '開發', review: '審查', seedHex: '種子色 hex', colorPicker: '使用取色器選擇顏色', lightPalette: '亮色色板', darkPalette: '暗色色板',
    previewDashboard: '儀表板', previewLanding: '形象頁', previewForm: '表單', copyJson: '複製 JSON', previewTitle: '預覽情境',
    landingTagline: '為重要的事而設計', landingHeading: '讓新想法有更好的空間。', landingDescription: '在形象頁情境中觀察這組配色。', creativeDirection: '創意方向', creativeDescription: '檢查表面與文字的搭配。', brandSystems: '品牌系統', brandDescription: '讓每個畫面保持一致。', welcomeBack: '歡迎回來', signInDescription: '登入後繼續工作。', emailAddress: '電子郵件', password: '密碼', passwordError: '請檢查密碼。', resetInfo: '你可以隨時重設密碼。', rememberMe: '記住我', signIn: '登入', continueLater: '稍後繼續',
    copyFailed: '無法複製，請確認剪貼簿權限後重試。',
    colorOne: '基準色', colorTwo: '強調色', generatedColor: '生成色', wheelTitle: '互動色輪', wheelHint: '雙圓環為指定色 · 拖曳探索配色', harmony: '配色關係', brightness: '亮度', adjustedColors: '微調後 HEX', morePalettes: '更多配色', outputs: '複製輸出', copyTailwind: '複製 Tailwind', loadPalette: '載入色板 {hex}',
    advancedTuning: '進階微調', tuneHue: '色相偏移', tuneLightness: '明度', tuneChroma: '彩度', tuningHint: 'OKLCH 微調會即時更新情境預覽與 HEX 色票。', resetTuning: '重設微調',
    paletteSaved: '色板已儲存。', storageError: '無法儲存至本機，請檢查瀏覽器儲存空間。', deleteSavedPalette: '刪除已儲存色板 {name}', libraryEmpty: '儲存後，點擊色帶即可還原色板。',
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
