import clc from 'cli-color';
import { request, apiParamsRequest } from './services-api.js';

const signIn = async (dataRequest) => {

    try {
        const res = await request.post('auth/signin')
          .set('Authorization', apiParamsRequest.Authorization)
          .set('AppToken', apiParamsRequest.AppToken)
          .send(dataRequest);
    
        return res;
      } catch (err) {
        console.error(clc.red(clc.bold('Oops!, Something went wrong')));
        console.error(err);
        process.exit();
    }
}

export {
    signIn
}