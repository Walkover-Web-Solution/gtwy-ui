"use client";
import LoginPage from "@/components/LoginPage";
import WithAuth from "@/components/Withauth";

const page = ({ loading }) => {
  return <LoginPage loading={loading} />;
};

export default WithAuth(page);
