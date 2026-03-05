/** Vue Router Meta 类型扩展：定义登录与权限约束字段。 */
import 'vue-router';

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;
    publicOnly?: boolean;
    permissions?: string[];
  }
}