import { useState } from 'react';
import { UI } from '@anju/ui';
import { utils } from '@anju/utils';

import { Wrapper } from './styles';
import { authClient } from '../../../utils';

export const Auth = () => {
  const [status, setStatus] = useState('idle');

  const signIn = async (provider: string) => {
    setStatus('pending');
    await authClient.signIn.social({
      provider,
      callbackURL: `${process.env.NEXT_PUBLIC_WEB_URL}/organization`
    });
  };

  return (
    <Wrapper>
      <div className="login-content">
        <p className="login-content-texts">
          <span className="login-content-subtitle">
            Give Your AI Superpowers{' '}
          </span>
          <span className="login-content-title">No Coding Needed</span>
        </p>
        <div className="login-content-buttons">
          <UI.Button
            variant="outlined"
            startIcon="GOOGLE.svg"
            onClick={() => signIn(utils.constants.SOCIAL_PROVIDER_GOOGLE)}
            disabled={status === 'pending'}
          >
            Sign in with Google
          </UI.Button>
          <UI.Button
            variant="outlined"
            startIcon="GITHUB.svg"
            onClick={() => signIn(utils.constants.SOCIAL_PROVIDER_GITHUB)}
            disabled={status === 'pending'}
          >
            Sign in with GitHub
          </UI.Button>
        </div>
      </div>
      <p className="terms">
        By signing in, you agree to our{' '}
        <a
          href="https://anju.ai/terms"
          target="_blank"
          rel="noopener noreferrer"
        >
          Terms & Conditions
        </a>{' '}
        and{' '}
        <a
          href="https://anju.ai/privacy"
          target="_blank"
          rel="noopener noreferrer"
        >
          Privacy Policy
        </a>
      </p>
    </Wrapper>
  );
};
