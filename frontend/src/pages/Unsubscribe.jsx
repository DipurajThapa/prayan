import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import { Seo } from "@/components/brand/Seo";
import { BrandButton } from "@/components/brand/BrandButton";
import { StatusMessage } from "@/components/brand/StatusMessage";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState({ status: token ? "idle" : "invalid" });

  const confirm = async () => {
    setState({ status: "loading" });
    try {
      const { data } = await api.post("/newsletter/unsubscribe", { token });
      setState({ status: data.status });
    } catch (err) { setState({ status: "error", message: formatApiError(err) }); }
  };

  return (
    <section className="container-x flex min-h-[60vh] items-center justify-center py-16">
      <Seo title="Unsubscribe" path="/unsubscribe" description="Unsubscribe from Prayan property updates." noindex />
      <div className="card-soft w-full max-w-md space-y-5 p-8" data-testid="unsubscribe-card">
        <h1 className="font-display text-3xl font-extrabold text-midnight">Unsubscribe</h1>
        {state.status === "idle" && <><p className="text-slateink">Stop receiving Prayan property updates by email.</p>
          <BrandButton onClick={confirm} className="w-full" data-testid="unsubscribe-confirm-btn">Unsubscribe Me</BrandButton></>}
        {state.status === "loading" && <Loader2 className="h-5 w-5 animate-spin text-sapphire" />}
        {state.status === "unsubscribed" && <StatusMessage type="success" testId="unsubscribe-success">You have been unsubscribed. You will not receive further updates.</StatusMessage>}
        {state.status === "already_unsubscribed" && <StatusMessage type="info" testId="unsubscribe-already">This email is already unsubscribed.</StatusMessage>}
        {state.status === "invalid" && <StatusMessage type="error" testId="unsubscribe-invalid">This unsubscribe link is missing its code. Please use the link from your email.</StatusMessage>}
        {state.status === "error" && <StatusMessage type="error" testId="unsubscribe-error">{state.message}</StatusMessage>}
      </div>
    </section>
  );
}
