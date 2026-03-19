import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";

type AuthLayoutProps = {
  children: React.ReactNode;
};

export default async function AuthLayout({ children }: AuthLayoutProps) {
  const session = await getSession();

  if (session) {
    redirect("/upload");
  }

  return children;
}
