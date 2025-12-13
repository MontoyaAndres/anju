import { css } from '@emotion/react';
import styled from '@emotion/styled';

export const Wrapper = styled.div`
  ${({ theme }) => css`
    width: 100%;

    .MuiInputBase-root {
      border-radius: 8px;
    }
  `}
`;
