import { auth } from "@/auth";
import ProfilePageClient from "@/components/profile/ProfilePageClient";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/login?callbackUrl=/profile");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      bio: true,
      phone: true,
      avatar: true,
      image: true,
      password: true,
    },
  });

  if (!user) {
    redirect("/auth/login?callbackUrl=/profile");
  }

  return (
    <ProfilePageClient
      initialUser={{
        id: user.id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        phone: user.phone,
        avatar: user.avatar,
        image: user.image,
      }}
      hasPassword={Boolean(user.password)}
    />
  );
}
