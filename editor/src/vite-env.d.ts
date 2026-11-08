/// <reference types="vite/client" />

declare module '*.css';

declare module '*?inline' {
  const css: string;
  export default css;
}
