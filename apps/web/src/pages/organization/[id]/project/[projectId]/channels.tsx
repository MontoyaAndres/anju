import { Components } from '../../../../../components';
import { ssr } from '../../../../../utils';

import type { IProps } from '../[projectId]';

const ChannelsPage = (props: IProps) => {
  return <Components.Views.Channels />;
};

ChannelsPage.getLayout = Components.Layouts.Home;

export const getServerSideProps = ssr.getAuthMe;

export default ChannelsPage;
