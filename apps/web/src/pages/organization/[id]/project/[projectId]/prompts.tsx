import { Components } from '../../../../../components';
import { ssr } from '../../../../../utils';

import type { IProps } from '../[projectId]';

const PromptsPage = (props: IProps) => {
  return <Components.Views.Prompts />;
};

PromptsPage.getLayout = Components.Layouts.Home;

export const getServerSideProps = ssr.getAuthMe;

export default PromptsPage;
