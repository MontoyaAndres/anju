import { utils } from '@anju/utils';

// Cheap liveness/auth check used before persisting a user-supplied key. Tavily
// has no free introspection endpoint, so we run the smallest possible search
// (one result, basic depth): a valid key returns 200, a bad key returns 401.
export const validateTavilyApiKey = async (
  apiKey: string
): Promise<boolean> => {
  let response: Response;
  try {
    response = await fetch(`${utils.constants.TAVILY_API_BASE}/search`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        query: 'ping',
        max_results: 1,
        search_depth: utils.constants.TAVILY_SEARCH_DEPTH_BASIC
      })
    });
  } catch {
    return false;
  }
  return response.ok;
};
