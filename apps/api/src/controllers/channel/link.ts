import { Context } from 'hono';
import { utils as dbUtils } from '@anju/db';
import { utils } from '@anju/utils';

import { createAuth } from '../../utils';

import type { AppEnv } from '../../types';

// The bot-client link endpoint, called in-process. A Worker self-fetch to its
// own hostname times out, so we invoke better-auth's handler directly.
interface ExternalLinkApi {
  startExternalLink: (args: {
    body: {
      provider: string;
      externalId: string;
      channelId: string;
      displayName?: string;
      client_id?: string;
      client_secret?: string;
    };
  }) => Promise<{ code: string }>;
}

const providerLabel = (provider: string): string =>
  provider.charAt(0).toUpperCase() + provider.slice(1);

// `/link` connects a messaging-platform user to an Anju account for THIS
// channel, returning a code to redeem on the web. Shared by every platform —
// they differ only in the provider, so the controllers just pass the external
// user id they parsed from their own webhook payload.
export const startChannelLink = async (
  c: Context<AppEnv>,
  args: {
    provider: string;
    externalId: string;
    channelId: string;
    displayName: string;
  }
): Promise<string> => {
  const webUrl = utils.getEnv(c, 'NEXT_PUBLIC_WEB_URL');
  const clientId = utils.getEnv(c, 'BOT_OAUTH_CLIENT_ID');
  const clientSecret = utils.getEnv(c, 'BOT_OAUTH_CLIENT_SECRET');
  if (!webUrl || !clientId || !clientSecret) {
    return 'Account linking is not available right now.';
  }

  try {
    const auth = createAuth(c);
    const api = auth.api as unknown as ExternalLinkApi;
    const result = await api.startExternalLink({
      body: {
        provider: args.provider,
        externalId: args.externalId,
        channelId: args.channelId,
        displayName: args.displayName || undefined,
        client_id: clientId,
        client_secret: clientSecret
      }
    });

    return [
      `Link this ${providerLabel(args.provider)} account to your Anju account.`,
      '',
      `Open ${webUrl}/link?code=${result.code}`,
      `(or go to ${webUrl}/link and enter the code ${result.code})`,
      '',
      'The code expires in 10 minutes.'
    ].join('\n');
  } catch (error) {
    await dbUtils.handleError(c, error, {
      service: utils.constants.SERVICE_NAME_API,
      metadata: {
        source: 'startChannelLink',
        platform: args.provider,
        channelId: args.channelId,
        externalId: args.externalId
      }
    });
    return 'Could not start account linking. Please try again later.';
  }
};
