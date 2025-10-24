// Validate required environment variables
function validateEnvVariable(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  // Graph API and Store config
  graphApiUrl: validateEnvVariable('NEXT_PUBLIC_GRAPH_API_URL', process.env.NEXT_PUBLIC_GRAPH_API_URL),
  adminUrl: validateEnvVariable('NEXT_PUBLIC_ADMIN_URL', process.env.NEXT_PUBLIC_ADMIN_URL),
  cookiePassword: validateEnvVariable('SECRET_COOKIE_PASSWORD', process.env.SECRET_COOKIE_PASSWORD),

  // OAuth configuration
  oauth: {
    scope: 'read_orders,write_orders,read_products,read_inventories,write_inventories',
    clientId: validateEnvVariable('NEXT_PUBLIC_CLIENT_ID', process.env.NEXT_PUBLIC_CLIENT_ID),
    clientSecret: validateEnvVariable('CLIENT_SECRET', process.env.CLIENT_SECRET),
    redirectUri: `${validateEnvVariable('NEXT_PUBLIC_DEPLOY_URL', process.env.NEXT_PUBLIC_DEPLOY_URL)}/api/oauth/callback/ikas`,
  }
};

export type Config = typeof config;
