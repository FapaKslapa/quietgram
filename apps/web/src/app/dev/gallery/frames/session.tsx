"use client";

import { useState } from "react";
import { noop } from "@/app/dev/gallery/frames/helpers";
import type { ViewMap } from "@/app/dev/gallery/frames/view-map";
import { LoginForm } from "@/components/login-form";
import { PairingToken } from "@/components/pairing-token";
import { RegisterDrawer } from "@/components/register-drawer";
import { ScreenError } from "@/components/shell/screen-error";
import { SessionExpiredView } from "@/components/shell/session-expired-view";

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

export const SESSION_VIEWS = {
  expired: () => <SessionExpiredView checking={false} failure={null} onRecheck={noop} />,
  "expired-error": () => <SessionExpiredView checking={false} failure="expired" onRecheck={noop} />,
  "expired-challenge": () => (
    <SessionExpiredView attention="challenge" checking={false} failure={null} onRecheck={noop} />
  ),
  "expired-rejected": () => (
    <SessionExpiredView attention="rejected" checking={false} failure={null} onRecheck={noop} />
  ),
  login: () => <LoginForm />,
  register: () => <RegisterFrame />,
  pair: () => <PairingToken />,
  error: () => <ScreenError title="Non riesco a caricare la posta" reset={noop} />,
} satisfies ViewMap;
