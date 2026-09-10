import { formatDate } from "@/lib/date";
import { daysOverdue, isOverdue } from "@/lib/loans";
import {
  MarkLoanReturnedButton,
  RemindOverdueLoanButton,
  RespondLoanRequestButtons,
} from "@/components/inventory/loan-request-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { InventoryItem, LoanRequest, User } from "@prisma/client";

type LoanWithContext = LoanRequest & { item: InventoryItem; requester: User };

const period = (loan: LoanRequest) =>
  `${formatDate(loan.startDate)} – ${formatDate(loan.endDate)}`;
const who = (user: User) => user.name ?? user.email;

/** Sol·licituds que esperen una decisió del coordinador. */
export function PendingLoanRequests({ requests }: { requests: LoanWithContext[] }) {
  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold">Sol·licituds de préstec pendents</h2>
      <div className="overflow-x-auto rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Professor/a</TableHead>
              <TableHead>Equip</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Motiu</TableHead>
              <TableHead className="w-44" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  No hi ha sol·licituds pendents.
                </TableCell>
              </TableRow>
            )}
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-medium">{who(request.requester)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {request.item.brand} {request.item.model}
                </TableCell>
                <TableCell className="text-muted-foreground">{period(request)}</TableCell>
                <TableCell className="text-muted-foreground">{request.purpose ?? "—"}</TableCell>
                <TableCell>
                  <RespondLoanRequestButtons id={request.id} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/** Equips que ara mateix són fora, amb els endarrerits marcats a dalt. */
export function ActiveLoans({ loans }: { loans: LoanWithContext[] }) {
  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold">Préstecs actius</h2>
      <div className="overflow-x-auto rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Professor/a</TableHead>
              <TableHead>Equip</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead className="w-44" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loans.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  Ara mateix no hi ha préstecs actius.
                </TableCell>
              </TableRow>
            )}
            {loans.map((loan) => {
              const late = isOverdue(loan.endDate);
              return (
                <TableRow key={loan.id}>
                  <TableCell className="font-medium">{who(loan.requester)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {loan.item.brand} {loan.item.model}
                  </TableCell>
                  <TableCell className={late ? "text-destructive" : "text-muted-foreground"}>
                    {period(loan)}
                    {late && (
                      <span className="ml-2 font-medium">
                        · {daysOverdue(loan.endDate)} dies de retard
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {late && <RemindOverdueLoanButton id={loan.id} />}
                      <MarkLoanReturnedButton id={loan.id} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
