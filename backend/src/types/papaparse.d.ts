declare module 'papaparse' {
  export function parse<T = any>(input: string | File | Blob, config?: any): any;
}
