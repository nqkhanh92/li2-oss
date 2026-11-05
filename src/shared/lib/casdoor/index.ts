// ⚠ `?? ''` không phải cho đẹp: dòng dưới chạy lúc IMPORT, nên thiếu biến là `Buffer.from(undefined)`
// ném `ERR_INVALID_ARG_TYPE` và **cả `next build` chết** ở bước collect page data — một lỗi không
// nhắc gì tới Casdoor. Chuỗi rỗng cho ra cert rỗng; lúc đó xác minh token sẽ thất bại ở runtime
// với thông báo đúng chỗ, thay vì làm hỏng bản build.
const base64Cert = process.env.NEXT_PUBLIC_CASDOOR_BASE64_CERT ?? ''
export const cert = Buffer.from(base64Cert, "base64").toString("ascii");

export const casdoorConfig = {
  clientId: process.env.NEXT_PUBLIC_CASDOOR_CLIENT_ID!,
  orgName: process.env.NEXT_PUBLIC_CASDOOR_ORG_NAME!,
  clientSecret: process.env.CASDOOR_CLIENT_SECRET!,
  endpoint: process.env.NEXT_PUBLIC_CASDOOR_APP_URL!,
  appName: process.env.NEXT_PUBLIC_CASDOOR_APP_NAME!,
  certificate: cert,
};
