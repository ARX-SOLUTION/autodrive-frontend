const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

export const tashkentToday = (): Date => {
  const tashkentNow = new Date(Date.now() + TASHKENT_OFFSET_MS);
  return new Date(
    tashkentNow.getUTCFullYear(),
    tashkentNow.getUTCMonth(),
    tashkentNow.getUTCDate(),
  );
};
