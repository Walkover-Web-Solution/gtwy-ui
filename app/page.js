import LoginButton from "@/components/common/LoginButton";

const Page = () => {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-base-100 text-base-content">
      <div className="text-center space-y-6 max-w-md px-6">
        <h1 className="text-3xl font-bold">Welcome to GTWY AI</h1>
        <p className="text-base-content/70">Continue to manage your agents and integrations. Click below to sign in.</p>
        <div className="flex justify-center">
          <LoginButton />
        </div>
      </div>
    </main>
  );
};

export default Page;
