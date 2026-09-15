"use client";

import { useEffect, useState } from "react";
import { unstable_rethrow } from "next/navigation";
import {
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon,
  GlobeIcon,
  KeyRoundIcon,
  MailIcon,
  MonitorIcon,
  PencilIcon,
  PrinterIcon,
  RouterIcon,
  SearchIcon,
  ServerIcon,
  ShieldAlertIcon,
  WifiIcon,
} from "lucide-react";
import { toast } from "sonner";

import { deleteCredential, revealCredential } from "@/actions/credentials";
import { cn } from "@/lib/utils";
import { CredentialDialog } from "@/components/credentials/credential-dialog";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type VaultCredential = {
  id: string;
  categoryId: string;
  name: string;
  username: string | null;
  url: string | null;
  superAdminOnly: boolean;
  hasNotes: boolean;
};

export type VaultCategory = { id: string; name: string; credentials: VaultCredential[] };

type CategoryOption = { id: string; name: string };

const ALL = "all";
/** Una contrasenya a la vista es torna a amagar sola, per si algú s'aixeca de la taula. */
const HIDE_AFTER_MS = 30_000;

class RevealError extends Error {}

function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function countLabel(count: number) {
  return `${count} ${count === 1 ? "contrasenya" : "contrasenyes"}`;
}

function hostOf(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** Icona segons la categoria i el nom: prou per reconèixer-la d'un cop d'ull. */
function CredentialIcon({ categoryName, name }: { categoryName: string; name: string }) {
  const text = normalize(`${categoryName} ${name}`);
  const className = "size-5";
  if (/impress|printer|fotocop/.test(text)) return <PrinterIcon className={className} />;
  if (/wi-?fi/.test(text)) return <WifiIcon className={className} />;
  if (/router|switch|xarxa|enllac/.test(text)) return <RouterIcon className={className} />;
  if (/servidor|server|\bnas\b/.test(text)) return <ServerIcon className={className} />;
  if (/ordinador|\bpc\b|portatil|equip/.test(text)) return <MonitorIcon className={className} />;
  if (/correu|e-?mail|gmail/.test(text)) return <MailIcon className={className} />;
  if (/compte|xarxes|web|google|facebook|instagram|youtube/.test(text)) return <GlobeIcon className={className} />;
  return <KeyRoundIcon className={className} />;
}

/**
 * Copia un text que potser encara ha d'arribar del servidor. Safari només deixa
 * escriure al porta-retalls durant el clic, així que se li passa la promesa;
 * on no s'admet, s'espera el text i s'escriu directament.
 */
async function copySecret(secret: Promise<string>) {
  try {
    await navigator.clipboard.write([
      new ClipboardItem({ "text/plain": secret.then((value) => new Blob([value], { type: "text/plain" })) }),
    ]);
  } catch {
    await navigator.clipboard.writeText(await secret);
  }
}

function CredentialCard({
  credential,
  categoryName,
  categoryOptions,
  canRestrict,
}: {
  credential: VaultCredential;
  categoryName: string;
  categoryOptions: CategoryOption[];
  canRestrict: boolean;
}) {
  const [revealed, setRevealed] = useState<{ password: string; notes: string } | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [copied, setCopied] = useState<"username" | "password" | null>(null);

  useEffect(() => {
    if (!revealed) return;
    const timer = setTimeout(() => setRevealed(null), HIDE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [revealed]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(null), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  async function toggleReveal() {
    if (revealed) {
      setRevealed(null);
      return;
    }
    setIsRevealing(true);
    try {
      const result = await revealCredential({ id: credential.id, purpose: "view" });
      if (result.success) {
        setRevealed({ password: result.password, notes: result.notes });
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      unstable_rethrow(error);
      toast.error("No s'ha pogut mostrar la contrasenya. Comprova la connexió i torna-ho a provar.");
    } finally {
      setIsRevealing(false);
    }
  }

  async function copyPassword() {
    const secret = revealed
      ? Promise.resolve(revealed.password)
      : revealCredential({ id: credential.id, purpose: "copy" }).then((result) => {
          if (!result.success) throw new RevealError(result.error);
          return result.password;
        });
    try {
      await copySecret(secret);
      setCopied("password");
      toast.success("Contrasenya copiada");
    } catch (error) {
      unstable_rethrow(error);
      toast.error(error instanceof RevealError ? error.message : "No s'ha pogut copiar la contrasenya.");
    }
  }

  async function copyUsername() {
    if (!credential.username) return;
    try {
      await navigator.clipboard.writeText(credential.username);
      setCopied("username");
      toast.success("Usuari copiat");
    } catch {
      toast.error("No s'ha pogut copiar l'usuari.");
    }
  }

  return (
    <li className="flex flex-col gap-3 rounded-xl border bg-background p-4 shadow-xs">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <CredentialIcon categoryName={categoryName} name={credential.name} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
          <h3 className="line-clamp-2 font-semibold leading-tight break-words" title={credential.name}>
            {credential.name}
          </h3>
          {credential.url && (
            <a
              href={credential.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              <span className="truncate">{hostOf(credential.url)}</span>
              <ExternalLinkIcon className="size-3.5 shrink-0" />
            </a>
          )}
          {credential.superAdminOnly && (
            <Badge variant="secondary" className="gap-1">
              <ShieldAlertIcon className="size-3" />
              Només superadmin
            </Badge>
          )}
        </div>
      </div>

      <dl className="flex flex-col gap-1.5 text-sm">
        {credential.username && (
          <div className="flex items-center gap-2 rounded-lg bg-muted/60 py-1 pr-1 pl-3">
            <dt className="w-24 shrink-0 text-muted-foreground">Usuari</dt>
            <dd className="min-w-0 flex-1 truncate font-medium" title={credential.username}>
              {credential.username}
            </dd>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Copia l'usuari de ${credential.name}`}
              onClick={copyUsername}
            >
              {copied === "username" ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
            </Button>
          </div>
        )}
        <div className="flex items-center gap-2 rounded-lg bg-muted/60 py-1 pr-1 pl-3">
          <dt className="w-24 shrink-0 text-muted-foreground">Contrasenya</dt>
          {/* A la vista, sencera: una contrasenya retallada no serveix per escriure-la. */}
          <dd className={cn("min-w-0 flex-1 font-mono", revealed ? "break-all" : "truncate")}>
            {revealed ? (
              revealed.password || <span className="font-sans text-muted-foreground italic">Sense contrasenya</span>
            ) : (
              <span aria-label="Amagada">••••••••••</span>
            )}
          </dd>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`${revealed ? "Amaga" : "Mostra"} la contrasenya de ${credential.name}`}
            disabled={isRevealing}
            onClick={toggleReveal}
          >
            {revealed ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Copia la contrasenya de ${credential.name}`}
            onClick={copyPassword}
          >
            {copied === "password" ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
          </Button>
        </div>
      </dl>

      {revealed?.notes ? (
        <p className="rounded-lg border border-dashed px-3 py-2 text-sm whitespace-pre-line text-muted-foreground">
          {revealed.notes}
        </p>
      ) : (
        !revealed &&
        credential.hasNotes && (
          <p className="text-xs text-muted-foreground">Té observacions: es veuen en mostrar la contrasenya.</p>
        )
      )}

      <div className="mt-auto -mb-1 -ml-2 flex gap-1 border-t pt-2">
        <CredentialDialog
          categories={categoryOptions}
          credential={credential}
          canRestrict={canRestrict}
          trigger={
            <Button variant="ghost" size="icon-sm" aria-label={`Edita ${credential.name}`}>
              <PencilIcon className="size-4" />
            </Button>
          }
        />
        <ConfirmDeleteButton
          action={deleteCredential}
          input={{ id: credential.id }}
          title={`Esborrar la contrasenya de «${credential.name}»?`}
          description="No es pot desfer. Queda apuntat al registre d'activitat."
        />
      </div>
    </li>
  );
}

/** Totes les contrasenyes que pot veure qui entra, per categories i amb cerca. */
export function CredentialVault({
  categories,
  categoryOptions,
  canRestrict,
  showEmptyCategories,
}: {
  categories: VaultCategory[];
  categoryOptions: CategoryOption[];
  canRestrict: boolean;
  showEmptyCategories: boolean;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(ALL);

  const total = categories.reduce((sum, category) => sum + category.credentials.length, 0);
  const needle = normalize(query.trim());
  const sections = categories
    .filter((category) => filter === ALL || category.id === filter)
    .map((category) => ({
      ...category,
      credentials: needle
        ? category.credentials.filter((credential) =>
            normalize(
              `${category.name} ${credential.name} ${credential.username ?? ""} ${credential.url ?? ""}`,
            ).includes(needle),
          )
        : category.credentials,
    }))
    .filter(
      (category) =>
        category.credentials.length > 0 || (showEmptyCategories && !needle && filter === ALL),
    );
  const filterable = categories.filter((category) => category.credentials.length > 0);

  if (categories.length === 0 || (total === 0 && !showEmptyCategories)) {
    return (
      <p className="rounded-lg border border-dashed bg-background p-10 text-center text-muted-foreground">
        {showEmptyCategories
          ? "Encara no hi ha cap categoria. Crea'n una o importa el full de contrasenyes."
          : "Encara no hi ha cap contrasenya."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {total > 0 && (
        <div className="flex flex-col gap-3">
          <div className="relative w-full sm:max-w-sm">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cerca per nom, usuari o categoria…"
              aria-label="Cerca una contrasenya"
              className="pl-8"
            />
          </div>
          {filterable.length > 1 && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filtra per categoria">
              {[{ id: ALL, name: "Totes" }, ...filterable].map((option) => (
                <Button
                  key={option.id}
                  type="button"
                  size="sm"
                  variant={filter === option.id ? "default" : "outline"}
                  aria-pressed={filter === option.id}
                  className="rounded-full"
                  onClick={() => setFilter(option.id)}
                >
                  {option.name}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {sections.length === 0 && <p className="text-muted-foreground">Cap contrasenya coincideix amb la cerca.</p>}

      {sections.map((category) => (
        <section key={category.id} aria-labelledby={`credentials-${category.id}`} className="flex flex-col gap-4">
          <h2 id={`credentials-${category.id}`} className="flex items-baseline gap-2 text-lg font-semibold">
            {category.name}
            <span className="text-sm font-normal text-muted-foreground">
              {countLabel(category.credentials.length)}
            </span>
          </h2>
          {category.credentials.length === 0 ? (
            <p className="text-sm text-muted-foreground">Encara no hi ha cap contrasenya en aquesta categoria.</p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {category.credentials.map((credential) => (
                <CredentialCard
                  key={credential.id}
                  credential={credential}
                  categoryName={category.name}
                  categoryOptions={categoryOptions}
                  canRestrict={canRestrict}
                />
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
