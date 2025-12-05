declare namespace NodeJS {
    interface ProcessEnv {
        DEV: string;
        JWT_SECRET: string;
        DB_URL: string;
        DEV_PORT: string;
        NODE_ENV: 'development' | 'production' | 'test';
        BB_DEV_DEVELOPER_APPLICATION_KEY: string;
        BB_DEV_CLIENT_ID: string;
        BB_DEV_CLIENT_SECRET: string;
        BB_DEV_BASIC_TOKEN: string;

        BB_PROD_DEVELOPER_APPLICATION_KEY: string;
        BB_PROD_CLIENT_ID: string;
        BB_PROD_CLIENT_SECRET: string;
        BB_PROD_BASIC_TOKEN: string;
        BB_GEN_AUTH_TOKEN: string;
    }
}
