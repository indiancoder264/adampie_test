import { Pool } from 'pg';

// Prevent multiple instances of the connection pool in a serverless environment
declare global {
  // eslint-disable-next-line no-var
  var pool: Pool | undefined;
}

const getPool = () => {
  if (!global.pool) {
    const connectionString = process.env.POSTGRES_URL;

    // Be very strict. If the variable is missing or doesn't look like a real URL, fail fast.
    // This prevents the app from trying to connect to localhost in a deployed environment.
    if (!connectionString || !connectionString.startsWith('postgres')) {
      throw new Error(
        'A valid PostgreSQL connection string was not found. Please set the POSTGRES_URL environment variable in your deployment settings.'
      );
    }
    
    console.log('Creating new PostgreSQL connection pool.');
    global.pool = new Pool({
      connectionString: connectionString,
    });
  }
  return global.pool;
};

export default getPool;