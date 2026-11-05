import * as jose from "jose";
import { casdoorConfig } from "../casdoor";

let cachedPublicKey: jose.CryptoKey | null = null;
export const getPublicKey = async () => {
  if (!cachedPublicKey) {
    cachedPublicKey = await jose.importX509(casdoorConfig.certificate, "RS256");
  }
  return cachedPublicKey;
};
export const verifyJwt = async (
  token: string
): Promise<{
  payload: {
    sub: string;
    email: string;
    name: string;
    id: string;
    exp: number;
    avatar?: string;
  };
}> => {
  const publicKey = await getPublicKey();
  return jose.jwtVerify(token, publicKey, { clockTolerance: 60 });
};
