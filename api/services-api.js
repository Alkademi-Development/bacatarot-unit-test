import supertest from 'supertest';

const request = supertest(process.env.SERVICES_API + 'v1/');

const paramsRequest = {
    sApp: 'S-App-Authorization',
    sAppToken: 'ab89d3a579eaf78207bd6e1f2fa88fb1cf1fce58b161a5f93462ea6cc81497df'
};

const apiParamsRequest = {
    Authorization: '2d3d736d0b4bb736d01af7f5ccc3b12d3b241b8eb6',
    AppToken: '692e44db271073fc:2d317a6d044cba34d619ffffc9c9b27a3d241487b2f656cc230d9e16c44bf0c9cb9cc325c6a86191ac58ff74976a046797424edee48d7d0478eba97ca91034005b3cd89c7489f08765cb6fb0c68e',
}

export {
    request,
    paramsRequest,
    apiParamsRequest
}