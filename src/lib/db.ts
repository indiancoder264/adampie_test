import { Pool } from 'pg';

// Prevent multiple instances of the connection pool in a serverless environment
declare global {
  // eslint-disable-next-line no-var
  var pool: Pool | undefined;
}

const getPool = () => {
  if (!global.pool) {
    let connectionString = process.env.POSTGRES_URL;

    if (!connectionString) {
      throw new Error(
        'Database connection string not found. Please set the POSTGRES_URL environment variable in your .env file.'
      );
    }
    
    // Defensive check to fix malformed connection strings from build environment
    if (connectionString && !connectionString.startsWith('postgresql://')) {
        connectionString = `postgresql:${connectionString.startsWith('//') ? '' : '//'}${connectionString.replace('//', '')}`;
    }
    
    console.log('Creating new PostgreSQL connection pool.');
    global.pool = new Pool({
      connectionString: connectionString,
    });
  }
  return global.pool;
};

export default getPool;
