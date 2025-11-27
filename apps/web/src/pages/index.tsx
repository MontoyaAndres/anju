import { authClient } from '../utils';

const IndexPage = () => {
  const signIn = (provider: string) => {
    if (!provider) return;
    if (provider !== 'google' && provider !== 'github') return;

    authClient.signIn.social({
      provider,
      callbackURL: `${process.env.NEXT_PUBLIC_WEB_URL}/dashboard`,
    });
  };

  return (
    <div>
      <button onClick={() => signIn('google')}>Sign in with Google</button>
      <button onClick={() => signIn('github')}>Sign in with GitHub</button>
    </div>
  );
};

export default IndexPage;
