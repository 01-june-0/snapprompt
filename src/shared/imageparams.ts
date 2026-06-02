/**
 * Parameter preset library for image/video prompts (Round C).
 *
 * Each preset becomes an `ImageParam` when added to a prompt. Labels carry both
 * languages and are resolved to a plain string at add-time (the stored param
 * keeps whatever label language was current then).
 *
 * Token convention: `{}` is replaced by the value; toggles emit the bare token.
 *   --ar {}     → "--ar 16:9"
 *   --style raw → emitted as-is when enabled
 */
import type { ImageParam, ParamControl, PromptKind } from './types';
import { uuid } from './id';

export interface ParamPreset {
  key: string;
  label: { ko: string; en: string; ja: string; zh: string };
  token: string;
  control: ParamControl;
  value?: string;
  options?: string[];
}

export interface ParamPack {
  id: string;
  name: string; // platform name (proper noun, not localized)
  kinds: PromptKind[];
  presets: ParamPreset[];
}

/** Midjourney inline parameters (image). */
const MIDJOURNEY: ParamPack = {
  id: 'midjourney',
  name: 'Midjourney',
  kinds: ['image'],
  presets: [
    { key: 'ar', label: { ko: '화면비', en: 'Aspect ratio', ja: 'アスペクト比', zh: '画面比例' }, token: '--ar {}', control: 'select', value: '1:1', options: ['1:1', '16:9', '9:16', '4:3', '3:2', '2:3', '4:5'] },
    { key: 'version', label: { ko: '버전', en: 'Version', ja: 'バージョン', zh: '版本' }, token: '--v {}', control: 'select', value: '6.1', options: ['6.1', '6', '5.2'] },
    { key: 'niji', label: { ko: '니지 (애니)', en: 'Niji (anime)', ja: 'Niji（アニメ）', zh: 'Niji（动漫）' }, token: '--niji {}', control: 'select', value: '6', options: ['6', '5'] },
    { key: 'stylize', label: { ko: '스타일화', en: 'Stylize', ja: 'スタイライズ', zh: '风格化' }, token: '--stylize {}', control: 'number', value: '100' },
    { key: 'chaos', label: { ko: '카오스', en: 'Chaos', ja: 'カオス', zh: '混乱度' }, token: '--chaos {}', control: 'number', value: '0' },
    { key: 'weird', label: { ko: '위어드', en: 'Weird', ja: 'ウィアード', zh: '怪异度' }, token: '--weird {}', control: 'number', value: '0' },
    { key: 'quality', label: { ko: '품질', en: 'Quality', ja: '品質', zh: '质量' }, token: '--q {}', control: 'select', value: '1', options: ['.25', '.5', '1'] },
    { key: 'styleRaw', label: { ko: 'Raw 스타일', en: 'Raw style', ja: 'Rawスタイル', zh: 'Raw 风格' }, token: '--style raw', control: 'toggle' },
    { key: 'tile', label: { ko: '타일 (반복)', en: 'Tile', ja: 'タイル', zh: '平铺' }, token: '--tile', control: 'toggle' },
    { key: 'seed', label: { ko: '시드', en: 'Seed', ja: 'シード', zh: '种子' }, token: '--seed {}', control: 'text' },
  ],
};

/** Pika inline parameters (video). */
const PIKA: ParamPack = {
  id: 'pika',
  name: 'Pika',
  kinds: ['video'],
  presets: [
    { key: 'ar', label: { ko: '화면비', en: 'Aspect ratio', ja: 'アスペクト比', zh: '画面比例' }, token: '-ar {}', control: 'select', value: '16:9', options: ['16:9', '9:16', '1:1', '4:5', '5:2'] },
    { key: 'fps', label: { ko: 'FPS', en: 'FPS', ja: 'FPS', zh: '帧率' }, token: '-fps {}', control: 'number', value: '24' },
    { key: 'motion', label: { ko: '모션 강도', en: 'Motion', ja: 'モーション強度', zh: '运动强度' }, token: '-motion {}', control: 'select', value: '1', options: ['0', '1', '2', '3', '4'] },
    { key: 'camera', label: { ko: '카메라', en: 'Camera', ja: 'カメラ', zh: '镜头' }, token: '-camera {}', control: 'select', value: 'zoom in', options: ['zoom in', 'zoom out', 'pan left', 'pan right', 'pan up', 'pan down', 'rotate cw', 'rotate ccw'] },
    { key: 'gs', label: { ko: '가이던스', en: 'Guidance', ja: 'ガイダンス', zh: '引导强度' }, token: '-gs {}', control: 'number', value: '12' },
    { key: 'seed', label: { ko: '시드', en: 'Seed', ja: 'シード', zh: '种子' }, token: '-seed {}', control: 'text' },
  ],
};

export const PARAM_PACKS: ParamPack[] = [MIDJOURNEY, PIKA];

/** Packs relevant to a given prompt kind. */
export function packsForKind(kind: PromptKind): ParamPack[] {
  return PARAM_PACKS.filter((p) => p.kinds.includes(kind));
}

/** Build a stored ImageParam from a preset (enabled by default). */
export function buildParam(preset: ParamPreset, lang: 'ko' | 'en' | 'ja' | 'zh'): ImageParam {
  return {
    id: uuid(),
    label: preset.label[lang],
    token: preset.token,
    control: preset.control,
    value: preset.value ?? '',
    options: preset.options,
    enabled: true,
  };
}

/** A blank custom parameter row. */
export function blankParam(): ImageParam {
  return { id: uuid(), label: '', token: '', control: 'text', value: '', enabled: true };
}
