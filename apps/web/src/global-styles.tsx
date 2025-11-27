import { css, Global } from '@emotion/react';

export const globalStyles = (
  <Global
    styles={css`
      @import url('https://fonts.googleapis.com/css2?family=Fustat:wght@200..800&display=swap');

      * {
        box-sizing: border-box;
        font-family: 'Fustat', sans-serif;
        font-optical-sizing: auto;
        font-weight: 400;
        font-style: normal;
      }

      html,
      body {
        height: 100%;
        scroll-behavior: smooth;
        data-scroll-behavior: smooth;
        margin: 0;
        padding: 0;
        background-color: white !important;
        overflow-x: hidden;
      }

      h1,
      h2,
      h3,
      h4,
      h5,
      h6,
      p,
      a,
      span {
        font-weight: initial;
        margin: 0;
        padding: 0;
      }

      a {
        text-decoration: none;
      }
    `}
  />
);
