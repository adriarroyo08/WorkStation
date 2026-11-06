// Tipos de serie: orden en los menús, letra corta y nombre.
import type { SetType } from './types';

export const SET_TYPES: SetType[] = ['normal', 'warmup', 'drop', 'failure'];
export const SET_LABEL: Record<SetType, string> = { normal: '', warmup: 'C', drop: 'D', failure: 'F' };
export const SET_NAMES: Record<SetType, string> = { normal: 'Normal', warmup: 'Calentamiento', drop: 'Drop set', failure: 'Al fallo' };
