export const appVariant = import.meta.env.VITE_TAROT_VARIANT === 'bilibili'
  ? 'bilibili'
  : 'git';

export const isBilibiliVariant = appVariant === 'bilibili';
