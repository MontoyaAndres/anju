import { Components } from '../components';

const IndexPage = () => {
  return <Components.Views.Auth />;
};

IndexPage.getLayout = Components.Layouts.Auth;

export default IndexPage;
