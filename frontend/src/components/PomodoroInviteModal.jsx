import { useEffect, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { pomodoroService, getApiErrorMessage } from "../service/api";
import { Button } from "./ui/button";
import { cn } from "./ui/utils";
import { DialogOverlay, DialogPortal } from "./ui/Dialog";

/**
 * Egy megnyitott meghívó. A szülő (Layout) egyszerre csak egyet tart (lista első eleme).
 */
export function PomodoroInviteModal({ invite, onClose, onNavigatePomodoro }) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const prevSecRef = useRef(-1);

  useEffect(() => {
    if (!invite) return;
    prevSecRef.current = -1;
    setBlocked(false);
    setSecondsLeft(invite.seconds_left ?? 0);
    const t = setInterval(() => {
      setSecondsLeft((s) => (s <= 0 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [invite?.session_id, invite?.seconds_left]);

  useEffect(() => {
    if (secondsLeft === 0 && prevSecRef.current > 0) {
      toast.message("A Pomodoro meghívó lejárt.");
      onClose();
    }
    prevSecRef.current = secondsLeft;
  }, [secondsLeft, onClose]);

  const handleAccept = async () => {
    if (!invite) return;
    setBusy(true);
    setBlocked(false);
    try {
      await pomodoroService.acceptInvite(invite.session_id);
      localStorage.setItem("pomodoroGroupSessionId", String(invite.session_id));
      window.dispatchEvent(
        new CustomEvent("pomodoro-session-accepted", {
          detail: { sessionId: invite.session_id },
        }),
      );
      toast.success("Beléptél a csoportos Pomodoro sessionbe.");
      onClose();
      onNavigatePomodoro?.();
    } catch (err) {
      const code = err?.response?.data?.code;
      if (code === "ALREADY_IN_SESSION") {
        setBlocked(true);
        toast.error(getApiErrorMessage(err));
      } else {
        toast.error(getApiErrorMessage(err));
        onClose();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDecline = async () => {
    if (!invite) return;
    setBusy(true);
    try {
      await pomodoroService.declineInvite(invite.session_id);
    } catch {
      /* mindegy */
    }
    setBusy(false);
    onClose();
  };

  if (!invite) return null;

  const mm = Math.floor(secondsLeft / 60);
  const ss = secondsLeft % 60;
  const countdownLabel = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;

  return (
    <DialogPrimitive.Root open>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className={cn(
            "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-[60] grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-md",
          )}
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogPrimitive.Title className="text-lg font-semibold text-foreground">
            Pomodoro meghívó
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-sm text-muted-foreground space-y-2">
            <p>
              Meghívtak egy csoportos Pomodoro sessionbe
              {invite.group_name ? (
                <>
                  {" "}
                  (<span className="font-medium text-foreground">{invite.group_name}</span>)
                </>
              ) : null}
              .
            </p>
            <p className="text-foreground font-mono text-base">
              Hátralévő idő: {countdownLabel}
            </p>
            {blocked && (
              <p className="text-amber-700 dark:text-amber-300 pt-1">
                Már benne vagy egy másik Pomodoro sessionben. Lépj ki ott (Pomodoro → Kilépés), majd ha ez a
                meghívó még érvényes, újra megjelenik — vagy várd a következőt a sorban.
              </p>
            )}
          </DialogPrimitive.Description>
          <div className="flex flex-col-reverse sm:flex-row sm:flex-wrap sm:justify-end gap-2 pt-2">
            <Button type="button" variant="outline" disabled={busy} onClick={handleDecline}>
              Elutasítás
            </Button>
            {blocked ? (
              <>
                <Button type="button" onClick={() => onNavigatePomodoro?.()}>
                  Pomodoro megnyitása
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setBlocked(false)}
                >
                  Kiléptem — újra
                </Button>
              </>
            ) : (
              <Button type="button" disabled={busy || secondsLeft <= 0} onClick={handleAccept}>
                Elfogadom
              </Button>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}
