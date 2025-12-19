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

const getOrganizations = async (context: GetServerSidePropsContext) => {
  const { req } = context;

  const cookies = req.headers.cookie;

  const organizations = await utils.fetcher({
    url: '/organization',
    config: {
      credentials: 'include',
      headers: {
        cookie: cookies,
      },
    },
    ssrContext: context,
  });

  if (organizations && !organizations?.error) {
    return organizations;
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

const getAuthOrganizations = async (context: GetServerSidePropsContext) => {
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
    const organizations = await getOrganizations(context);

    if (organizations.length === 1) {
      return {
        props: {},
        redirect: {
          permanent: false,
          destination: `/organization/${organizations?.[0].id}/project/${
            organizations?.[0].projects?.[0]?.id || ''
          }`,
        },
      };
    }

    return {
      props: {
        params: params || null,
        query: query || null,
        locale: locale || defaultLocale,
        auth: me?.user || null,
        organizations: organizations || [],
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
  getAuthOrganizations,
};
