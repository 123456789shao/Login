/** 全局声明文件：提供 Vite 与 Vue SFC 的类型声明。 */
/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}