export const appVariant = import.meta.env.VITE_TAROT_VARIANT === 'bilibili'
  || import.meta.env.MODE === 'bilibili'
  ? 'bilibili'
  : 'git';

export const isBilibiliVariant = appVariant === 'bilibili';
