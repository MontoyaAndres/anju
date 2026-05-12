import { ReactNode } from 'react';
import MaterialBreadcrumbs from '@mui/material/Breadcrumbs';
import { NavigateNext } from '@mui/icons-material';

import { Wrapper } from './styles';

export interface BreadcrumbItem {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
}

export interface IProps {
  items: BreadcrumbItem[];
  separator?: ReactNode;
  maxItems?: number;
}

export const Breadcrumbs = (props: IProps) => {
  const { items, separator, maxItems = 6 } = props;

  return (
    <Wrapper>
      <MaterialBreadcrumbs
        separator={separator ?? <NavigateNext fontSize="small" />}
        maxItems={maxItems}
        aria-label="breadcrumb"
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const interactive = !isLast && typeof item.onClick === 'function';
          return (
            <button
              key={`${item.label}-${index}`}
              type="button"
              className={`breadcrumb-item ${isLast ? 'current' : ''}`}
              onClick={interactive ? item.onClick : undefined}
              disabled={!interactive}
              aria-current={isLast ? 'page' : undefined}
              title={item.label}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </MaterialBreadcrumbs>
    </Wrapper>
  );
};
