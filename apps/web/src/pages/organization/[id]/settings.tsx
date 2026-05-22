import { Components } from '../../../components';
import { ssr } from '../../../utils';

import type { IProps } from './project/[projectId]';

const SettingsPage = (props: IProps) => {
  return <Components.Views.Settings auth={props.auth} />;
};

SettingsPage.getLayout = Components.Layouts.Home;

export const getServerSideProps = ssr.getAuthMe;

export default SettingsPage;
