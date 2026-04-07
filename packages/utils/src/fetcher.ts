import { GetServerSidePropsContext } from 'next';

export interface IFetcherProps {
  url: string;
  config?: RequestInit;
  ssrContext?: GetServerSidePropsContext;
}

export const fetcher = async (props: IFetcherProps) => {
  const { url, config: fetchConfig, ssrContext } = props;

  const isFormData =
    typeof FormData !== 'undefined' && fetchConfig?.body instanceof FormData;

  const headers: HeadersInit = isFormData
    ? {}
    : { 'Content-Type': 'application/json' };

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`, {
    headers,
    ...fetchConfig,
  });

  if (ssrContext) {
    const cookie = response.headers.get('set-cookie');

    if (cookie) {
      ssrContext.res.setHeader('Set-Cookie', cookie);
    }
  }

  const json = await response.json();

  return json;
};
