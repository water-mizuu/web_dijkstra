
export const debounce = function <T extends (...args: any[]) => void>(
  func: T,
  delay: number
): T {
  let timeout: NodeJS.Timeout | null = null;

  return ((...args: any[]) => {
    if (timeout != null) clearTimeout(timeout);

    timeout = setTimeout(() => func(...args), delay);
  }) as T;
};
