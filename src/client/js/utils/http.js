import axios from 'axios'

const StatusCode = {
    Unauthorized: 401,
    Forbidden: 403,
    TooManyRequests: 429,
    InternalServerError: 500,
}

const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Credentials': true,
    'X-Requested-With': 'XMLHttpRequest',
};

window.HttpUtils = {
    instance:  null,

    initialize() {
        return this.instance != null ? this.instance : this.initHttp();
    },

    initHttp(baseURL = '') {
        const http = axios.create({
            baseURL,
            headers,
            withCredentials: false,
        });

        // http.interceptors.request.use(injectToken, (error) => Promise.reject(error));
        http.interceptors.response.use(
            (response) => response,
            (error) => {
                const { response } = error;
                return this.handleError(response);
            },
        );

        this.instance = http;
        return http;
    },

    get(
    url,
    config = null
    ) {
        return this.http.get(url, config);
    },

    // Handle global app errors
    // We can handle generic app errors depending on the status code
    handleError(error) {
        const { status } = error;

        switch (status) {
            case StatusCode.InternalServerError: {
                // Handle InternalServerError
                break;
            }
            case StatusCode.Forbidden: {
                // Handle Forbidden
                break;
            }
            case StatusCode.Unauthorized: {
                // Handle Unauthorized
                break;
            }
            case StatusCode.TooManyRequests: {
                // Handle TooManyRequests
                break;
            }
        }

        return Promise.reject(error);
    }
}

export default window.HttpUtils;