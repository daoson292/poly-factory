declare module 'zmp-sdk' {
  export function login(options: {
    success: (res: { id: string; name?: string }) => void;
    fail: (err: any) => void;
  }): void;
  export function scanQRCode(options: {
    success: (res: { content: string }) => void;
    fail: (err: any) => void;
  }): void;
  export function getLocation(options: {
    success: (res: { latitude: string; longitude: string }) => void;
    fail: (err: any) => void;
  }): void;
}
