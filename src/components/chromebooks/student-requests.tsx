import Link from "next/link";
import type { Chromebook, StudentDeviceRequest, User } from "@prisma/client";

import { formatDate, formatDateTime } from "@/lib/date";
import {
  studentDeviceReasonLabels,
  studentDeviceRequestStatusLabels,
  studentDeviceRequestStatusVariants,
} from "@/lib/labels";
import {
  CancelStudentAssignmentButton,
  CancelStudentRequestButton,
  MarkStudentDeviceDeliveredButton,
  MarkStudentDeviceReturnedButton,
  RespondStudentRequestButtons,
  type AvailableDevice,
} from "@/components/chromebooks/student-request-actions";
import { StudentRequestDialog } from "@/components/chromebooks/student-request-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type StudentRequest = StudentDeviceRequest & {
  tutor: User;
  chromebook: Chromebook | null;
};

const studentName = (request: StudentDeviceRequest) =>
  `${request.studentFirstName} ${request.studentLastName}`;
const who = (user: User) => user.name ?? user.email;
const device = (chromebook: Chromebook | null) =>
  chromebook ? [chromebook.assetTag, chromebook.serialNumber].filter(Boolean).join(" · ") : "—";

function StatusBadge({ request }: { request: StudentDeviceRequest }) {
  return (
    <Badge variant={studentDeviceRequestStatusVariants[request.status]}>
      {studentDeviceRequestStatusLabels[request.status]}
    </Badge>
  );
}

/** A les llistes de la coordinació, l'equip porta a la seva fitxa amb l'historial. */
function DeviceLink({ chromebook }: { chromebook: Chromebook | null }) {
  if (!chromebook) return <>—</>;
  return (
    <Link href={`/alumnat/${chromebook.id}`} className="hover:underline">
      {device(chromebook)}
    </Link>
  );
}

/**
 * El que veu un tutor: només les seves. Les dades d'un alumne no han de sortir
 * a la pantalla d'un altre tutor, encara que tots dos puguin demanar equips.
 */
export function TutorStudentRequests({ requests }: { requests: StudentRequest[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>Chromebooks per al meu alumnat</CardTitle>
          <p className="text-sm text-muted-foreground">
            Demana un equip per a un alumne/a del teu grup. El préstec és per a tot el curs i el
            decideix la coordinació TIC.
          </p>
        </div>
        <StudentRequestDialog />
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Encara no has demanat cap Chromebook per al teu alumnat.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alumne/a</TableHead>
                  <TableHead>Grup</TableHead>
                  <TableHead>Motiu</TableHead>
                  <TableHead>Estat</TableHead>
                  <TableHead>Equip</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{studentName(request)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {request.groupName ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {studentDeviceReasonLabels[request.reason]}
                      {request.responseNote && (
                        <span className="mt-0.5 block text-xs">
                          Coordinació: {request.responseNote}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge request={request} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {device(request.chromebook)}
                      {request.deliveredAt && (
                        <span className="mt-0.5 block text-xs">
                          Entregat el {formatDateTime(request.deliveredAt)}
                        </span>
                      )}
                      {request.returnedAt && (
                        <span className="mt-0.5 block text-xs">
                          Retornat el {formatDateTime(request.returnedAt)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {request.status === "PENDENT" && <CancelStudentRequestButton id={request.id} />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** La cua de la coordinació: el que espera una decisió. */
export function PendingStudentRequests({
  requests,
  available,
}: {
  requests: StudentRequest[];
  available: AvailableDevice[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sol·licituds de Chromebook per a alumnat</CardTitle>
        <p className="text-sm text-muted-foreground">
          En aprovar-ne una, tria quin equip del pool se li aparta. El tutor/a rep la decisió per
          correu, i l&apos;entrega es registra quan l&apos;alumne/a el vingui a buscar.
        </p>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hi ha sol·licituds pendents.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alumne/a</TableHead>
                  <TableHead>Grup</TableHead>
                  <TableHead>Tutor/a</TableHead>
                  <TableHead>Motiu</TableHead>
                  <TableHead>Demanat</TableHead>
                  <TableHead className="w-52" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{studentName(request)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {request.groupName ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{who(request.tutor)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {studentDeviceReasonLabels[request.reason]}
                      {request.reasonNote && (
                        <span className="mt-0.5 block text-xs">{request.reasonNote}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(request.createdAt)}
                    </TableCell>
                    <TableCell>
                      <RespondStudentRequestButtons id={request.id} available={available} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Equips apartats per a un alumne que encara no l'ha vingut a buscar. */
export function AwaitingDeliveryStudentDevices({ requests }: { requests: StudentRequest[] }) {
  if (requests.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Equips per entregar</CardTitle>
        <p className="text-sm text-muted-foreground">
          Aprovats i apartats, a l&apos;espera que l&apos;alumne/a els vingui a buscar. En entregar-ne
          un en queden anotats el dia i l&apos;hora.
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Alumne/a</TableHead>
                <TableHead>Grup</TableHead>
                <TableHead>Tutor/a</TableHead>
                <TableHead>Equip</TableHead>
                <TableHead>Aprovat el</TableHead>
                <TableHead className="w-64" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">{studentName(request)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {request.groupName ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{who(request.tutor)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    <DeviceLink chromebook={request.chromebook} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {request.respondedAt ? formatDate(request.respondedAt) : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <MarkStudentDeviceDeliveredButton
                        id={request.id}
                        studentName={studentName(request)}
                        deviceLabel={device(request.chromebook)}
                      />
                      <CancelStudentAssignmentButton
                        id={request.id}
                        studentName={studentName(request)}
                        deviceLabel={device(request.chromebook)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

/** Equips que ara mateix són a casa d'un alumne. */
export function DeliveredStudentDevices({ requests }: { requests: StudentRequest[] }) {
  if (requests.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Equips a casa de l&apos;alumnat</CardTitle>
        <p className="text-sm text-muted-foreground">
          Chromebooks que ara mateix té un alumne/a, per a tot el curs.
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Alumne/a</TableHead>
                <TableHead>Grup</TableHead>
                <TableHead>Tutor/a</TableHead>
                <TableHead>Equip</TableHead>
                <TableHead>Entregat el</TableHead>
                <TableHead className="w-52" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">{studentName(request)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {request.groupName ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{who(request.tutor)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    <DeviceLink chromebook={request.chromebook} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {request.deliveredAt ? formatDateTime(request.deliveredAt) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <MarkStudentDeviceReturnedButton
                      id={request.id}
                      studentName={studentName(request)}
                      deviceLabel={device(request.chromebook)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
