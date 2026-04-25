const path = require('path');
const { utils } = require('@anju/utils');

module.exports = {
  reactStrictMode: true,
  transpilePackages: ['@anju/ui', '@anju/utils'],
  outputFileTracingRoot: path.join(__dirname, '../../'),
  outputFileTracingIncludes: {
    '*': ['../../node_modules/@emotion/**']
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WEB_URL: process.env.NEXT_PUBLIC_WEB_URL,
    NEXT_PUBLIC_MCP_URL: process.env.NEXT_PUBLIC_MCP_URL
  },
  i18n: {
    locales: utils.constants.LANGUAGES,
    defaultLocale: utils.constants.LANGUAGE_EN
  }
};
