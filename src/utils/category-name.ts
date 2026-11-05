import { languages, type Language } from '@/i18n/languages';
import type { Category } from '@/models/category';

export function getCategoryName(category: Category, language: Language): string {
  if (category.defaultKey === null) {
    return category.name;
  }
  const override = category.nameOverrides[language];
  if (override !== undefined) {
    return override;
  }
  const names = languages[language].messages.defaultCategories;
  return Object.prototype.hasOwnProperty.call(names, category.defaultKey)
    ? names[category.defaultKey as keyof typeof names]
    : category.name;
}
