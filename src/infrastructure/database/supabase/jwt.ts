"use server";
import { cookies } from "next/headers";
import * as jose from "jose";
import { setSupabaseToken } from "@/app/actions/auth";
import { verifyJwt } from "../../../shared/lib/auth";

export const getSupabaseJwt = async () => {
  try {
    //first, we check if already have supabase access token in the cookies
    const supabase_access_token = cookies().get("supabase_access_token")?.value;
    if (supabase_access_token) {
      return supabase_access_token;
    }
    //if not we will create new supabase access token with casdoor user payload & supabase jwt secret
    const access_token = cookies().get("casdoor_access_token")?.value;
    if (access_token) {
      const user_info = await verifyJwt(access_token);

      const token = await new jose.SignJWT({
        sub: user_info.payload.sub,
        email: user_info.payload.email,
        role: "authenticated",
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET));
      //we set this token expired in 1h
      setSupabaseToken(token);
      return token;
    }
    return null;
  } catch (e) {
    console.log({ e });
    return null;
  }
};
