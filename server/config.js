export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  corsOptions: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'] // Added DELETE and OPTIONS
  },
  dbPath: process.env.DB_PATH || './voicechat.db',
  wsPath: process.env.WS_PATH || '/'
};