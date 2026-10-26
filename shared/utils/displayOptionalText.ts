// Display wording only. Never write this fallback into survey answers.
export function displayOptionalText(value: string | null | undefined): string {
  return value?.trim() ? value : 'Not provided';
}
