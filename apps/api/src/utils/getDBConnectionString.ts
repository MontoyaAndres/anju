export const getDBConnectionString = (env: {
  HYPERDRIVE: { connectionString: string };
}) => {
  if (process.env.NODE_ENV === 'development') {
    return process.env.DATABASE_URL!;
  }

  return env.HYPERDRIVE.connectionString;
};
