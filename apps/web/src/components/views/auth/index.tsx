import { UI } from '@anju/ui';

import { Wrapper } from './styles';
import { authClient } from '../../../utils';

export const Auth = () => {
  const signIn = (provider: string) => {
    if (!provider) return;
    if (provider !== 'google' && provider !== 'github') return;

    authClient.signIn.social({
      provider,
      callbackURL: `${process.env.NEXT_PUBLIC_WEB_URL}/dashboard`,
    });
  };

  return (
    <Wrapper>
      <div className="logo">
        <div className="logo-image" />
        <div className="logo-text">Anju.ai</div>
      </div>
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
            onClick={() => signIn('google')}
          >
            Sign in with Google
          </UI.Button>
          <UI.Button
            variant="outlined"
            startIcon="GITHUB.svg"
            onClick={() => signIn('github')}
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
