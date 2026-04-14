import { Components } from '../components';
import { ssr } from '../utils';

const IndexPage = () => {
  return <Components.Views.Auth />;
};

export const getServerSideProps = ssr.redirectIfAuthenticated;

IndexPage.getLayout = Components.Layouts.Auth;

export default IndexPage;
