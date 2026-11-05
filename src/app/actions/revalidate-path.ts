"use server";
import { revalidatePath as revalidatePathNext } from "next/cache";

export async function revalidatePath(path: string) {
  revalidatePathNext(path);
}
