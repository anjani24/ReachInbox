import { AuthGate } from "@/components/auth/AuthGate";
import { ComposeForm } from "@/app/compose/ComposeForm";

export default function ComposePage() {
  return (
    <AuthGate>
      <ComposeForm />
    </AuthGate>
  );
}