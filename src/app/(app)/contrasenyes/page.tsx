import { db } from "@/lib/db";
import { visibleCredentialsWhere } from "@/lib/credentials";
import { isSuperAdmin, requireAdmin } from "@/lib/permissions";
import { parseVaultKey } from "@/lib/vault";
import {
  deleteCredentialCategory,
  reorderCredentialCategory,
  upsertCredentialCategory,
} from "@/actions/credentials";
import { CredentialDialog } from "@/components/credentials/credential-dialog";
import { CredentialImportDialog } from "@/components/credentials/credential-import-dialog";
import { CredentialVault } from "@/components/credentials/credential-vault";
import { CategoryManagerDialog } from "@/components/shared/category-manager-dialog";

export const metadata = { title: "Contrasenyes" };

export default async function ContrasenyesPage() {
  const user = await requireAdmin();
  const superAdmin = isSuperAdmin(user.role);

  const categories = await db.credentialCategory.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      order: true,
      credentials: {
        where: visibleCredentialsWhere(user.role),
        orderBy: { name: "asc" },
        select: {
          id: true,
          categoryId: true,
          name: true,
          username: true,
          url: true,
          superAdminOnly: true,
          notesEncrypted: true,
        },
      },
    },
  });
  const vaultReady = parseVaultKey(process.env.VAULT_ENCRYPTION_KEY) !== null;

  // Al navegador no hi arriba mai el text xifrat: de les observacions, només si n'hi ha.
  const vault = categories.map((category) => ({
    id: category.id,
    name: category.name,
    credentials: category.credentials.map(({ notesEncrypted, ...credential }) => ({
      ...credential,
      hasNotes: notesEncrypted !== null,
    })),
  }));
  const categoryOptions = categories.map(({ id, name }) => ({ id, name }));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Contrasenyes</h1>
          <p className="text-muted-foreground">
            Accessos a comptes, impressores, ordinadors i altres serveis del centre. Cada consulta queda
            registrada.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {superAdmin && (
            <>
              <CategoryManagerDialog
                categories={categories.map((category) => ({
                  id: category.id,
                  name: category.name,
                  order: category.order,
                  usageCount: category.credentials.length,
                }))}
                upsertAction={upsertCredentialCategory}
                deleteAction={deleteCredentialCategory}
                reorderAction={reorderCredentialCategory}
                title="Categories de contrasenyes"
                description="Ordena i reanomena les categories. Només es poden eliminar si són buides."
                itemNounSingular="contrasenya"
                itemNounPlural="contrasenyes"
                triggerVariant="outline"
              />
              <CredentialImportDialog
                existingKeys={categories.flatMap((category) =>
                  category.credentials.map((credential) =>
                    [category.name, credential.name, credential.username ?? ""].join("|").toLowerCase(),
                  ),
                )}
              />
            </>
          )}
          {categories.length > 0 && (
            <CredentialDialog categories={categoryOptions} canRestrict={superAdmin} />
          )}
        </div>
      </div>

      {!vaultReady && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          Falta la clau de xifrat al servidor (VAULT_ENCRYPTION_KEY): fins que hi sigui, no es pot desar ni
          mostrar cap contrasenya.
        </p>
      )}

      <CredentialVault
        categories={vault}
        categoryOptions={categoryOptions}
        canRestrict={superAdmin}
        showEmptyCategories={superAdmin}
      />
    </div>
  );
}
