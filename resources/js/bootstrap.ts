import axios from 'axios';
import { initDemoLinkInterceptor } from './Support/demoLinkInterceptor';

window.axios = axios;
window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

initDemoLinkInterceptor();

