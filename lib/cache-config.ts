export const CACHE_TIMES = {
  COURSES: 3600, // 1 hora
  USER_DATA: 300, // 5 minutos
  STATIC_CONTENT: 86400, // 24 horas
} as const;

export const REVALIDATE_TIMES = {
  COURSES: 3600, // 1 hora
  STATIC_PAGES: 86400, // 24 horas
} as const;

export const getCustomCacheControl = (type: keyof typeof CACHE_TIMES) => {
  return `public, s-maxage=${CACHE_TIMES[type]}, stale-while-revalidate`;
}; 