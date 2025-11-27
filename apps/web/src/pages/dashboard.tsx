const DashboardPage = () => {
  const getUser = async () => {
    const user = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/me`, {
      credentials: 'include',
    }).then(res => res.json());
    console.log('User:', user);
  };

  return (
    <div>
      <button onClick={getUser}>Get user</button>
    </div>
  );
};

export default DashboardPage;
