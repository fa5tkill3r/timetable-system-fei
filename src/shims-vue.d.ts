declare module '*.vue';

import { ComponentCustomProperties } from 'vue';
import _ from 'lodash';

declare module '@vue/runtime-core' {
    interface ComponentCustomProperties {
        _: typeof _;
    }
}
