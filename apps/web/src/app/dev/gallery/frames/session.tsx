"use client";

import { useState } from "react";
import { noop } from "@/app/dev/gallery/frames/helpers";
import type { ViewMap } from "@/app/dev/gallery/frames/view-map";
import { LoginForm } from "@/components/login-form";
import { PairingToken } from "@/components/pairing-token";
import { RegisterDrawer } from "@/components/register-drawer";
import { CredentialsLoginDrawer } from "@/components/shell/credentials-login-drawer";
import { ScreenError } from "@/components/shell/screen-error";
import { type SessionAttention, SessionExpiredView } from "@/components/shell/session-expired-view";

function RegisterFrame() {
  const [open, setOpen] = useState(true);

  return (
    <>
      <LoginForm />
      <RegisterDrawer
        open={open}
        onOpenChange={setOpen}
        pending={false}
        error="Il codice di registrazione non è valido."
        onSubmit={async () => undefined}
      />
    </>
  );
}

type ExpiredFrameProps = {
  attention?: SessionAttention | null;
  failure?: "throttled" | "expired" | "other" | null;
  drawer?: boolean;
  pending?: boolean;
  error?: string | null;
};

function ExpiredFrame({
  attention = null,
  failure = null,
  drawer = false,
  pending = false,
  error = null,
}: ExpiredFrameProps) {
  const [open, setOpen] = useState(drawer);

  return (
    <SessionExpiredView
      attention={attention}
      checking={false}
      failure={failure}
      onRecheck={noop}
      onLogin={() => setOpen(true)}
    >
      <CredentialsLoginDrawer
        open={open}
        onOpenChange={setOpen}
        pending={pending}
        error={error}
        initialUsername="giulia.rossi"
        onSubmit={noop}
      />
    </SessionExpiredView>
  );
}

export const SESSION_VIEWS = {
  expired: () => <ExpiredFrame />,
  "expired-error": () => <ExpiredFrame failure="expired" />,
  "expired-challenge": () => <ExpiredFrame attention="challenge" />,
  "expired-rejected": () => <ExpiredFrame attention="rejected" />,
  "expired-login": () => <ExpiredFrame drawer />,
  "expired-login-pending": () => <ExpiredFrame drawer pending />,
  "expired-login-error": () => (
    <ExpiredFrame
      drawer
      error="Instagram non accetta nome utente o password. Controlla i dati e riprova."
    />
  ),
  login: () => <LoginForm />,
  register: () => <RegisterFrame />,
  pair: () => <PairingToken />,
  error: () => <ScreenError title="Non riesco a caricare la posta" reset={noop} />,
} satisfies ViewMap;
