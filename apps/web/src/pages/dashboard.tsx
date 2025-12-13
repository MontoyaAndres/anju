import { ParsedUrlQuery } from 'querystring';

import { ssr } from '../utils';

interface IProps {
  auth: {
    name: string;
    email: string;
    emailVerified: boolean;
    image: string;
    createdAt: string;
    updatedAt: string;
    id: string;
  };
  query: ParsedUrlQuery;
  env: {
    apiEndpoint: string;
    webEndpoint: string;
    trackerEndpoint: string;
  };
  locale: string;
}

const DashboardPage = (props: IProps) => {
  const { auth } = props;

  return <div>Hello {auth?.name || 'User'}, welcome to your dashboard!</div>;
};

export const getServerSideProps = ssr.getAuthMe;

export default DashboardPage;
