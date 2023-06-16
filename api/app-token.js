import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' }); // .env, .env.production, .env.staging, .env.development, local

let appHost = process?.env?.WEB_URL;

export {
  appHost,
}