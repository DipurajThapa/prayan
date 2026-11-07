import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const sessionId = new URLSearchParams(window.location.hash.slice(1)).get("session_id");
    window.history.replaceState(null, "", window.location.pathname);
    api.post("/auth/google/session", { session_id: sessionId })
      .then(({ data }) => { setUser(data); navigate("/dashboard", { replace: true, state: { user: data } }); })
      .catch((err) => { setUser(false); navigate("/login", { replace: true, state: { error: formatApiError(err) } }); });
  }, [navigate, setUser]);

  return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-sapphire" /></div>;
}
