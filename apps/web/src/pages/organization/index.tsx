import { ParsedUrlQuery } from 'querystring';

import { Components } from '../../components';
import { ssr } from '../../utils';

export interface IProps {
  params: ParsedUrlQuery;
  query: ParsedUrlQuery;
  locale: string;
  auth: {
    name: string;
    email: string;
    emailVerified: boolean;
    image: string;
    createdAt: string;
    updatedAt: string;
    id: string;
  };
  organizations: {
    id: string;
    name: string;
    ownerId: string;
    projectCount: string;
    organizationUserCount: string;
    createdAt: string;
    updatedAt: string;
    projects: {
      id: string;
      name: string;
    }[];
  }[];
}

const OrganizationPage = (props: IProps) => {
  return <Components.Views.Organization {...props} />;
};

export const getServerSideProps = ssr.getAuthOrganizations;

OrganizationPage.getLayout = Components.Layouts.Auth;

export default OrganizationPage;
