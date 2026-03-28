const encode = (data: Record<string, string>): string => {
  return btoa(JSON.stringify(data));
};

const decode = (state: string): Record<string, string> => {
  return JSON.parse(atob(state));
};

export const oauthState = {
  encode,
  decode
};
