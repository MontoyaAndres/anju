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

      .panel-source-tooltip {
        display: flex;
        flex-direction: column;
        gap: 4px;
        max-width: 320px;
        padding: 4px 2px;
      }

      .panel-source-tooltip-title {
        font-size: 13px;
        font-weight: 600;
        line-height: 1.3;
        word-break: break-word;
      }

      .panel-source-tooltip-meta {
        font-size: 11px;
        opacity: 0.85;
      }

      .panel-source-tooltip-excerpt {
        margin-top: 4px;
        font-size: 11px;
        line-height: 1.4;
        opacity: 0.9;
        display: -webkit-box;
        -webkit-line-clamp: 4;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
    `}
  />
);
