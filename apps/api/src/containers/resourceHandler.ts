import { Container, getContainer } from '@cloudflare/containers';
import { utils } from '@anju/utils';

import type { Bindings } from '../types';

export class ResourceHandler extends Container<Bindings> {
  defaultPort: number;
  sleepAfter = utils.constants.RESOURCE_HANDLER_SLEEP_AFTER;
  envVars: Record<string, string>;

  constructor(ctx: DurableObjectState<{}>, env: Bindings) {
    super(ctx, env);
    const port = Number(utils.getEnv({ env }, 'RESOURCE_HANDLER_PORT'));
    this.defaultPort = port;
    this.envVars = {
      PORT: String(port),
      DATABASE_URL: utils.getEnv({ env }, 'DATABASE_URL') || '',
      NODE_ENV: utils.getEnv({ env }, 'NODE_ENV') || ''
    };
  }
}

export const getResourceHandler = (env: Bindings) =>
  getContainer(env.RESOURCE_HANDLER);
