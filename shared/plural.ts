/** Cuenta y texto en español; el plural irregular o compuesto se indica explícitamente. */
export const plural = (count: number, singular: string, pluralForm = `${singular}s`): string => `${count} ${count === 1 ? singular : pluralForm}`;
