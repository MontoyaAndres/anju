import { ReactNode } from 'react';
import MaterialButton from '@mui/material/Button';
import { ButtonProps } from '@mui/material';

import { Wrapper } from './styles';

export interface IProps extends ButtonProps {
  children: ReactNode;
  startIcon?: string;
}

export const Button = (props: IProps) => {
  const { children, startIcon, ...rest } = props;

  return (
    <Wrapper startIcon={startIcon}>
      <MaterialButton {...rest}>
        {startIcon && <div className="button-start-icon"></div>}
        {children}
      </MaterialButton>
    </Wrapper>
  );
};
