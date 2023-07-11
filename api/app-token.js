import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.development' }); // .env, .env.production, .env.staging, .env.development, local

const localURL = 'http://192.168.137.1:3001'; // isi url ini jika ingin menggunakan local (yang di dapatkan dr npm run dev pada saat menjalankan project)
let appHost = process?.env?.WEB_URL;
let environment = process?.env?.NODE_ENV;

if (localURL != '') {
  appHost = localURL;
  environment = 'local';
}

export {
  appHost,
  environment
}