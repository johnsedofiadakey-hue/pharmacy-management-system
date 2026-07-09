import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-8 p-8 text-center">
      <div>
        <h1 className="text-3xl font-semibold">Pharmacy OS</h1>
        <p className="mt-2 text-gray-500">Multi-branch pharmacy operations platform.</p>
      </div>
      <div className="flex w-full flex-col gap-3">
        <Link
          href="/login"
          className="w-full rounded bg-black px-4 py-3 text-center font-medium text-white hover:bg-gray-800"
        >
          Staff sign in
        </Link>
        <Link
          href="/store"
          className="w-full rounded border px-4 py-3 text-center font-medium hover:bg-gray-50"
        >
          Visit storefront
        </Link>
      </div>
    </main>
  );
}
