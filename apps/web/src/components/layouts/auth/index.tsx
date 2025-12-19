import { JSXElementConstructor, ReactElement } from 'react';

import { Wrapper } from './styles';

export const Auth = (
  page: ReactElement<unknown, string | JSXElementConstructor<any>>
) => {
  return (
    <Wrapper>
      <div className="logo">
        <div className="logo-image" />
        <div className="logo-text">Anju.ai</div>
      </div>
      {page}
    </Wrapper>
  );
};
