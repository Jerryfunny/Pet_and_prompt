import { type DefineComponent } from 'vue'

declare module 'vue' {
  export interface GlobalComponents {
    [key: string]: DefineComponent<Record<string, unknown>, Record<string, unknown>, Record<string, unknown>>
  }
}

declare module '*.vue' {
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, Record<string, unknown>>
  export default component
}
