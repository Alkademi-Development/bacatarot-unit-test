import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' }); // .env, .env.production, .env.staging, .env.development, local

const localURL = ''; // isi url ini jika ingin menggunakan local (yang di dapatkan dr npm run dev pada saat menjalankan project)
let appHost = process?.env?.BASE_URL || localURL;

if (localURL != '') {
  appHost = localURL;
}

export {
  appHost,
}