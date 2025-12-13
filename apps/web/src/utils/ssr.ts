import { GetServerSideProps, GetServerSidePropsContext } from 'next';
import { utils } from '@anju/utils';

const getMe = async (context: GetServerSidePropsContext) => {
  const { req } = context;

  const cookies = req.headers.cookie;

  const me = await utils.fetcher({
    url: '/me',
    config: {
      credentials: 'include',
      headers: {
        cookie: cookies,
      },
    },
    ssrContext: context,
  });

  if (me && !me?.error) {
    return me;
  }

  return null;
};

const getAuthMe: GetServerSideProps = async context => {
  const {
    req,
    res,
    params,
    query,
    locale,
    defaultLocale = utils.constants.LANGUAGE_EN,
  } = context;

  const cookies = req.headers.cookie;

  if (!cookies) {
    return {
      props: {},
      redirect: {
        permanent: false,
        destination: '/',
      },
    };
  }

  const me = await getMe(context);

  if (me) {
    return {
      props: {
        params: params || null,
        query: query || null,
        locale: locale || defaultLocale,
        auth: me?.user || null,
      },
    };
  }

  return {
    props: {},
    redirect: {
      permanent: false,
      destination: '/',
    },
  };
};

export const ssr = {
  getAuthMe,
};
