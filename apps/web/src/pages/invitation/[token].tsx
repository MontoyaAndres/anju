import { GetServerSideProps } from 'next';
import { utils } from '@anju/utils';

import { Components } from '../../components';

// types
import type { IProps } from '../../components/views/invitation';

const InvitationTokenPage = (props: IProps) => {
  return <Components.Views.Invitation {...props} />;
};

export const getServerSideProps: GetServerSideProps = async context => {
  const token = (context.params?.token as string) || '';
  const cookies = context.req.headers.cookie;

  const invitation = await utils.fetcher({
    url: `/invitation/token/${encodeURIComponent(token)}`,
    ssrContext: context
  });

  let auth = null;
  if (cookies) {
    const me = await utils.fetcher({
      url: '/me',
      config: { credentials: 'include', headers: { cookie: cookies } },
      ssrContext: context
    });
    if (me && !me.error) {
      auth = me.user;
    }
  }

  return {
    props: {
      invitation: invitation && !invitation.error ? invitation : null,
      auth: auth || null
    }
  };
};

export default InvitationTokenPage;
