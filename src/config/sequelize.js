require('dotenv').config();

const useUrl = !!process.env.DATABASE_URL;

const common = {
  dialect: 'postgres',
  logging: false,
  define: { underscored: true, timestamps: true },
};

const discrete = (dbNameOverride) => ({
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'root',
  database: dbNameOverride || process.env.DATABASE_NAME || 'tape_for_you_with_node',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT) || 5432,
});

module.exports = {
  development: useUrl
    ? { use_env_variable: 'DATABASE_URL', ...common }
    : { ...discrete(), ...common },
  test: useUrl
    ? { use_env_variable: 'DATABASE_URL', ...common }
    : { ...discrete(process.env.DATABASE_NAME + '_test'), ...common },
  production: useUrl
    ? { use_env_variable: 'DATABASE_URL', ...common, pool: { max: 10, min: 2, acquire: 30000, idle: 10000 } }
    : { ...discrete(), ...common, pool: { max: 10, min: 2, acquire: 30000, idle: 10000 } },
};
