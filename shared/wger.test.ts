import { describe, expect, it } from 'vitest';
import { wgerSteps } from './wger';

describe('wgerSteps', () => {
  it('usa los elementos de la lista', () => {
    expect(wgerSteps('<ol>\n<li>Ponte de pie.</li>\n<li>Baja <b>despacio</b>.</li></ol>')).toEqual(['Ponte de pie.', 'Baja despacio.']);
  });
  it('usa los párrafos si no hay lista', () => {
    expect(wgerSteps('<p>Uno.</p><p>Dos &amp; tres.</p>')).toEqual(['Uno.', 'Dos & tres.']);
  });
  it('parte un bloque único en frases', () => {
    expect(wgerSteps('<p>Túmbate boca arriba. Sube la cadera. ¿Notas el glúteo? Baja.</p>')).toEqual(['Túmbate boca arriba.', 'Sube la cadera.', '¿Notas el glúteo?', 'Baja.']);
  });
  it('sin descripción no hay pasos', () => {
    expect(wgerSteps('')).toEqual([]);
    expect(wgerSteps()).toEqual([]);
  });
});

describe('mediaUrls', () => {
  it('free-exercise-db: dos fotos a partir del id; wger: sus URLs', async () => {
    const { mediaUrls } = await import('./exercises');
    expect(mediaUrls('Barbell_Curl')).toHaveLength(2);
    expect(mediaUrls('https://wger.de/a.png|https://wger.de/b.png')).toEqual(['https://wger.de/a.png', 'https://wger.de/b.png']);
    expect(mediaUrls(undefined)).toEqual([]);
  });
});
